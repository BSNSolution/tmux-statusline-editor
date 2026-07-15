#!/bin/sh
# agent-hook.sh — grava o ESTADO PRECISO do Claude Code por painel do tmux, a partir dos hooks
# oficiais do Claude Code. É o sinal direto (não indireto como CPU): o próprio Claude nos avisa
# quando começa a trabalhar, quando termina, e quando precisa de você.
#
# Instale nos hooks do ~/.claude/settings.json (o comando `tmux-statusline agent-tabs --install-hooks`
# faz isso), mapeando o evento → estado:
#   UserPromptSubmit / PreToolUse / PostToolUse  →  working   (Claude está processando)
#   Stop / SessionEnd                            →  idle      (terminou / esperando você)
#   Notification / PermissionRequest             →  needs     (precisa da sua atenção)
#
# Uso:  agent-hook.sh <working|idle|needs>
# O painel é lido de $TMUX_PANE (o Claude Code roda dentro de um pane do tmux e exporta essa var).
#
# Estado gravado em: ${TSE_STATE_DIR:-$HOME/.cache/tmux-statusline}/pane-<id>.state
# Formato do arquivo (1 linha): "<state> <epoch_seconds>"
# O daemon (agent-tabs-daemon.sh) lê esses arquivos como fonte primária, com a idade servindo de TTL.

set -u

STATE="${1:-}"
[ -n "$STATE" ] || { echo "uso: agent-hook.sh <working|idle|needs>" >&2; exit 0; }

# só faz sentido dentro do tmux
pane="${TMUX_PANE:-}"
[ -n "$pane" ] || exit 0

dir="${TSE_STATE_DIR:-$HOME/.cache/tmux-statusline}"
mkdir -p "$dir" 2>/dev/null || exit 0

# sanea o id do pane p/ nome de arquivo (%116 -> 116)
safe=$(printf '%s' "$pane" | tr -cd '0-9A-Za-z_')
printf '%s %s\n' "$STATE" "$(date +%s)" > "$dir/pane-$safe.state" 2>/dev/null || true

# não bloqueia o Claude: sempre sai 0 e sem consumir o stdin de forma que atrapalhe
exit 0
