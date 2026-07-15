#!/bin/sh
# agent-tabs-daemon.sh — mostra o ÍCONE do estado do Claude Code em CADA aba do tmux (background incluso).
#
# POR QUE: o #() no window-status-format só roda no contexto da aba ATIVA (limitação do tmux), e o
# tmux-agent-indicator só reseta o estado ao focar o pane. Este daemon varre o estado a cada N seg e
# grava uma OPÇÃO DE USUÁRIO por janela (@agent_icon) — que o tmux expande POR-ABA. O window-status-format
# referencia #{@agent_icon}. NÃO toca no nome da janela, nem nas bordas/cores (é outra propriedade).
#
# ANTI-ZUMBI: o estado do agent-indicator é event-driven e fica OBSOLETO (um pane vira "needs-input",
# você responde, ele volta a rodar, mas o hook de reset — que só dispara ao focar aquele pane — não
# limpa). Para não deixar 🔔 preso:
#   1) running vence needs-input (se algum pane trabalha, a janela mostra ⚙, não alarma).
#   2) needs-input tem VALIDADE: o daemon carimba quando viu needs; após NEEDS_TTL seg, expira.
#   3) só considera um pane "com agente" se o processo ainda existe (detecção por processo).
#
# Uso:
#   agent-tabs-daemon.sh [intervalo_seg]        # loop (default 2s)
#   AGENT_TABS_ONESHOT=1 agent-tabs-daemon.sh   # aplica uma vez e sai (testes)
#   AGENT_TABS_SOCKET="-L nome" ...             # mira um servidor tmux específico (testes isolados)
#
# Ajustes por env:
#   NEEDS_TTL   (default 90)                   segundos que o needs-input vale antes de expirar
#   ICON_NEEDS  (default " " U+F0F3 bell)     ícone "precisa de você"
#   ICON_RUN    (default " " U+F013 cog)       ícone "trabalhando"
#   AGENT_PROCS (default "claude,codex,aider,cursor,opencode,node")  processos que contam como agente

set -u

tmux_cmd() {
  if [ -n "${AGENT_TABS_SOCKET:-}" ]; then
    # shellcheck disable=SC2086
    tmux ${AGENT_TABS_SOCKET} "$@"
  else
    tmux "$@"
  fi
}

INTERVAL="${1:-2}"
NEEDS_TTL="${NEEDS_TTL:-90}"
ICON_NEEDS="${ICON_NEEDS:- $(printf '\357\203\263')}"
ICON_RUN="${ICON_RUN:- $(printf '\357\200\223')}"
AGENT_PROCS="${AGENT_PROCS:-claude,codex,aider,cursor,opencode}"

now() { date +%s; }

# Há um processo de agente vivo no pane? (detecção por processo — sempre atual, não depende de hook)
pane_has_agent() {
  pane="$1"
  tty=$(tmux_cmd display-message -p -t "$pane" '#{pane_tty}' 2>/dev/null)
  [ -n "$tty" ] || return 1
  procs=$(ps -t "$(basename "$tty")" -o command= 2>/dev/null)
  oldifs="$IFS"; IFS=,
  for proc in $AGENT_PROCS; do
    if printf '%s\n' "$procs" | grep -qw "$proc"; then IFS="$oldifs"; return 0; fi
  done
  IFS="$oldifs"; return 1
}

# Estado efetivo de UM pane, aplicando anti-zumbi. Retorna: run | needs | "".
pane_effective_state() {
  pane="$1"
  s=$(tmux_cmd show-environment -g "TMUX_AGENT_PANE_${pane}_STATE" 2>/dev/null | cut -d= -f2)
  case "$s" in
    running)
      # limpa carimbo de needs, se havia
      tmux_cmd set-environment -gu "TSE_NEEDS_AT_${pane}" 2>/dev/null || true
      printf 'run' ;;
    needs-input|needs_input)
      # carimba o momento em que vimos needs (se ainda não carimbado)
      at=$(tmux_cmd show-environment -g "TSE_NEEDS_AT_${pane}" 2>/dev/null | cut -d= -f2)
      if [ -z "$at" ]; then
        at=$(now); tmux_cmd set-environment -g "TSE_NEEDS_AT_${pane}" "$at" 2>/dev/null || true
      fi
      age=$(( $(now) - at ))
      if [ "$age" -gt "$NEEDS_TTL" ]; then
        printf ''            # expirou: trata como resolvido (evita 🔔 preso)
      else
        printf 'needs'
      fi ;;
    *)
      tmux_cmd set-environment -gu "TSE_NEEDS_AT_${pane}" 2>/dev/null || true
      printf '' ;;
  esac
}

# Estado de uma janela: running vence needs. Só conta panes que ainda têm agente vivo.
window_state() {
  win="$1"; any_run=""; any_needs=""
  for p in $(tmux_cmd list-panes -t "$win" -F '#{pane_id}' 2>/dev/null); do
    pane_has_agent "$p" || continue
    st=$(pane_effective_state "$p")
    case "$st" in
      run) any_run=1 ;;
      needs) any_needs=1 ;;
    esac
  done
  if [ -n "$any_run" ]; then printf 'run'
  elif [ -n "$any_needs" ]; then printf 'needs'
  fi
}

# Limpa o needs-input de UM pane (você já viu → não precisa mais alertar).
clear_pane_needs() {
  p="$1"
  tmux_cmd set-environment -gu "TMUX_AGENT_PANE_${p}_STATE" 2>/dev/null || true
  tmux_cmd set-environment -gu "TSE_NEEDS_AT_${p}" 2>/dev/null || true
}

# Você FOCOU um pane (clicou/entrou nele) → limpa o needs dele. É o sinal mais confiável de "já vi".
# Limpa o pane ATIVO da janela ativa (o que está sob seu cursor agora). Espelha o reset-on-focus,
# mas de forma ativa e contínua (o hook do plugin nem sempre dispara).
clear_needs_on_focus() {
  win="$1"
  # pane ativo desta janela
  ap=$(tmux_cmd list-panes -t "$win" -F '#{pane_id} #{pane_active}' 2>/dev/null | awk '$2==1{print $1}')
  [ -n "$ap" ] && clear_pane_needs "$ap"
}

apply_window() {
  win="$1"
  # janela ativa (a que você está olhando) num cliente conectado?
  active=$(tmux_cmd list-windows -F '#{window_id} #{window_active}' 2>/dev/null | awk -v w="$win" '$1==w{print $2}')
  # limpa o needs do pane que você focou (clicou) — você já viu o alerta
  [ "$active" = "1" ] && clear_needs_on_focus "$win"
  st=$(window_state "$win")
  case "$st" in
    needs) icon="$ICON_NEEDS" ;;
    run)   icon="$ICON_RUN" ;;
    *)     icon="" ;;
  esac
  tmux_cmd set-window-option -qt "$win" @agent_icon "$icon" 2>/dev/null || true
}

sweep() {
  for win in $(tmux_cmd list-windows -F '#{window_id}' 2>/dev/null); do
    apply_window "$win"
  done
  tmux_cmd refresh-client -S 2>/dev/null || true
}

if [ "${AGENT_TABS_ONESHOT:-}" = "1" ]; then
  sweep; exit 0
fi

while tmux_cmd has-session 2>/dev/null; do
  sweep
  sleep "$INTERVAL"
done
