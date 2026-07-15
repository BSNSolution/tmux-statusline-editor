#!/usr/bin/env bash
# run.sh — abre o editor de statusline do tmux (TUI). Builda se necessário.
cd "$(dirname "$0")"
[ -f cli/dist/main.js ] || pnpm -r build >/dev/null 2>&1
FORCE_COLOR=3 exec node cli/dist/main.js "$@"
