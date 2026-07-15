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
# CPU (%) acima da qual consideramos o agente "trabalhando de verdade". Abaixo disso, o processo
# claude está vivo mas OCIOSO (esperando você) → não mostra ⚙. Ajuste com CPU_BUSY.
CPU_BUSY="${CPU_BUSY:-5}"
# HISTERESE: a CPU oscila (sobe/desce a cada leitura mesmo trabalhando). Uma vez detectado "busy",
# seguramos o ⚙ por BUSY_HOLD segundos após a ÚLTIMA leitura acima do limiar — assim o ícone não
# fica piscando nas quedas momentâneas de CPU. Só apaga quando fica ocioso de verdade por esse tempo.
BUSY_HOLD="${BUSY_HOLD:-12}"

now() { date +%s; }

# CPU% somada dos processos de agente no pane. "" se não há agente vivo no pane.
pane_agent_cpu() {
  pane="$1"
  tty=$(tmux_cmd display-message -p -t "$pane" '#{pane_tty}' 2>/dev/null)
  [ -n "$tty" ] || { printf ''; return; }
  # linhas "cpu% command" dos processos desse tty; soma a CPU dos que casam AGENT_PROCS
  ps -t "$(basename "$tty")" -o %cpu,command= 2>/dev/null | awk -v procs="$AGENT_PROCS" '
    BEGIN { n=split(procs,a,","); found=0; sum=0 }
    { for (i=1;i<=n;i++) if (index($0,a[i])>0) { sum+=$1; found=1; break } }
    END { if (found) printf "%d", sum+0.5; else printf "" }'
}

# Há um agente vivo no pane (ocioso ou não)?
pane_has_agent() { [ -n "$(pane_agent_cpu "$1")" ]; }

# O agente do pane está TRABALHANDO agora (CPU acima do limiar)?
pane_is_busy() {
  cpu=$(pane_agent_cpu "$1")
  [ -n "$cpu" ] && [ "$cpu" -ge "$CPU_BUSY" ]
}

# Estado efetivo de UM pane. Retorna: run | needs | "".
# HIERARQUIA (nesta ordem):
#   1) TRABALHANDO (CPU) vence tudo. Se o agente está processando, NÃO está travado esperando você —
#      mostra ⚙ e LIMPA qualquer needs zumbi. Com histerese (BUSY_HOLD) p/ não piscar nas quedas de CPU.
#   2) Se não está trabalhando, então NEEDS-INPUT recente (do environment, com TTL) → 🔔.
#   3) Senão, ocioso/sem agente → sem ícone.
pane_effective_state() {
  pane="$1"

  # 1) TRABALHANDO? (CPU acima do limiar, com histerese)
  if pane_is_busy "$pane"; then
    tmux_cmd set-environment -g "TSE_BUSY_AT_${pane}" "$(now)" 2>/dev/null || true
    # está trabalhando → não pode estar esperando você: limpa needs zumbi
    tmux_cmd set-environment -gu "TSE_NEEDS_AT_${pane}" 2>/dev/null || true
    printf 'run'; return
  fi
  bat=$(tmux_cmd show-environment -g "TSE_BUSY_AT_${pane}" 2>/dev/null | cut -d= -f2)
  if [ -n "$bat" ] && [ "$(( $(now) - bat ))" -le "$BUSY_HOLD" ]; then
    printf 'run'; return   # dentro da histerese: mantém ⚙ mesmo com CPU baixa momentânea
  fi
  tmux_cmd set-environment -gu "TSE_BUSY_AT_${pane}" 2>/dev/null || true

  # 2) NEEDS-INPUT recente? (só quando NÃO está trabalhando)
  s=$(tmux_cmd show-environment -g "TMUX_AGENT_PANE_${pane}_STATE" 2>/dev/null | cut -d= -f2)
  case "$s" in
    needs-input|needs_input)
      at=$(tmux_cmd show-environment -g "TSE_NEEDS_AT_${pane}" 2>/dev/null | cut -d= -f2)
      if [ -z "$at" ]; then
        at=$(now); tmux_cmd set-environment -g "TSE_NEEDS_AT_${pane}" "$at" 2>/dev/null || true
      fi
      if [ "$(( $(now) - at ))" -le "$NEEDS_TTL" ]; then printf 'needs'; return; fi
      ;;
    *)
      tmux_cmd set-environment -gu "TSE_NEEDS_AT_${pane}" 2>/dev/null || true ;;
  esac

  # 3) ocioso / sem agente
  printf ''
}

# Estado da janela: varre TODOS os panes. Como cada pane já resolve busy>needs internamente, um pane
# só reporta "needs" se está PARADO esperando você. needs vence run na janela (alerta tem prioridade).
window_state() {
  win="$1"; any_run=""; any_needs=""
  for p in $(tmux_cmd list-panes -t "$win" -F '#{pane_id}' 2>/dev/null); do
    st=$(pane_effective_state "$p")
    case "$st" in
      run) any_run=1 ;;
      needs) any_needs=1 ;;
    esac
  done
  if [ -n "$any_needs" ]; then printf 'needs'
  elif [ -n "$any_run" ]; then printf 'run'
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
