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
# CPU (%) acima da qual consideramos o agente "trabalhando de verdade". Medições reais mostram uma
# separação NÍTIDA: Claude trabalhando fica sempre alto (11–67%), Claude ocioso/esperando fica sempre
# baixo (0–3%, com raros picos ao renderizar a resposta final). O limiar 10% separa os dois com folga
# — o pico de ~3% ao TERMINAR não passa, então o ⚙ não fica preso depois que o agente acaba.
CPU_BUSY="${CPU_BUSY:-10}"
# HISTERESE CURTA: só para não piscar numa eventual leitura baixa no meio de trabalho contínuo.
# Curta de propósito (2 sweeps): com o limiar bem escolhido, o "acabou" cai abaixo do limiar e o ícone
# some rápido — não segura o ⚙ por muito tempo depois que o Claude termina.
BUSY_HOLD="${BUSY_HOLD:-4}"

now() { date +%s; }

# Diretório onde os hooks do Claude Code gravam o estado preciso por painel (agent-hook.sh).
STATE_DIR="${TSE_STATE_DIR:-$HOME/.cache/tmux-statusline}"
# Idade máxima (seg) de um estado de hook para ainda ser confiável. Se o Claude travou/morreu sem
# disparar Stop, o estado "working" velho expira e caímos no fallback por CPU.
HOOK_TTL="${HOOK_TTL:-900}"

# Estado PRECISO do painel a partir do arquivo do hook. Retorna: working|idle|needs|"" (sem info).
pane_hook_state() {
  pane="$1"
  safe=$(printf '%s' "$pane" | tr -cd '0-9A-Za-z_')
  f="$STATE_DIR/pane-$safe.state"
  [ -r "$f" ] || { printf ''; return; }
  read -r st ts _ < "$f" 2>/dev/null || { printf ''; return; }
  [ -n "${st:-}" ] || { printf ''; return; }
  # expira estados antigos (proteção contra Claude que morreu sem Stop)
  if [ -n "${ts:-}" ] && [ "$(( $(now) - ts ))" -gt "$HOOK_TTL" ]; then printf ''; return; fi
  printf '%s' "$st"
}

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
# FONTE PRIMÁRIA: os HOOKS do Claude Code (agent-hook.sh grava working/idle/needs por pane) — sinal
# DIRETO e preciso do próprio Claude. Só se não houver estado de hook (ex.: outro agente sem hooks,
# ou hooks não instalados) caímos no FALLBACK por CPU.
pane_effective_state() {
  pane="$1"

  # ===== 1) FONTE PRECISA: estado do hook =====
  hs=$(pane_hook_state "$pane")
  case "$hs" in
    needs)    printf 'needs'; return ;;
    working)  printf 'run';   return ;;
    idle)     printf '';      return ;;   # terminou: sem ícone (preciso, sem histerese)
    # "" (sem info de hook) → cai no fallback por CPU abaixo
  esac

  # ===== 2) FALLBACK: detecção por CPU (para agentes sem hooks instalados) =====
  if pane_is_busy "$pane"; then
    tmux_cmd set-environment -g "TSE_BUSY_AT_${pane}" "$(now)" 2>/dev/null || true
    tmux_cmd set-environment -gu "TSE_NEEDS_AT_${pane}" 2>/dev/null || true
    printf 'run'; return
  fi
  bat=$(tmux_cmd show-environment -g "TSE_BUSY_AT_${pane}" 2>/dev/null | cut -d= -f2)
  if [ -n "$bat" ] && [ "$(( $(now) - bat ))" -le "$BUSY_HOLD" ]; then
    printf 'run'; return
  fi
  tmux_cmd set-environment -gu "TSE_BUSY_AT_${pane}" 2>/dev/null || true

  # needs-input do environment (agent-indicator), como último recurso
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
