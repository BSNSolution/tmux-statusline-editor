#!/usr/bin/env bash
# doctor.sh — verifica (e opcionalmente instala) tudo que o tmux-statusline-editor precisa.
# Objetivo: o app ser AUTOSSUFICIENTE — detecta o que existe, instala o que falta.
#
# Uso:
#   doctor.sh              # só diagnostica (mostra ✓/✗ e o que fazer)
#   doctor.sh --fix        # instala o que falta (pergunta antes de cada passo destrutivo)
#   doctor.sh --fix --yes  # instala sem perguntar (assume sim)
#
# Suporta macOS (brew) e Linux (apt/dnf/pacman). Nunca faz nada destrutivo sem --fix.
set -u

FIX=0; ASSUME_YES=0
for a in "$@"; do
  case "$a" in
    --fix) FIX=1 ;;
    --yes|-y) ASSUME_YES=1 ;;
  esac
done

# ---- helpers de saída ----
green() { printf '\033[32m%s\033[0m' "$1"; }
red()   { printf '\033[31m%s\033[0m' "$1"; }
yellow(){ printf '\033[33m%s\033[0m' "$1"; }
ok()    { printf '  %s %s\n' "$(green ✓)" "$1"; }
miss()  { printf '  %s %s\n' "$(red ✗)" "$1"; }
warn()  { printf '  %s %s\n' "$(yellow !)" "$1"; }
info()  { printf '    %s\n' "$1"; }

has() { command -v "$1" >/dev/null 2>&1; }

confirm() {
  [ "$ASSUME_YES" = 1 ] && return 0
  printf '    instalar %s? [S/n] ' "$1"; read -r ans
  case "$ans" in n|N|nao|não|no) return 1 ;; *) return 0 ;; esac
}

# ---- detecta gerenciador de pacotes ----
OS="$(uname -s)"
PKG=""
if [ "$OS" = "Darwin" ]; then PKG="brew"
elif has apt-get; then PKG="apt"
elif has dnf; then PKG="dnf"
elif has pacman; then PKG="pacman"
fi

pkg_install() {
  # pkg_install <pacote> [cask]
  case "$PKG" in
    brew)   if [ "${2:-}" = "cask" ]; then brew install --cask "$1"; else brew install "$1"; fi ;;
    apt)    sudo apt-get update -qq && sudo apt-get install -y "$1" ;;
    dnf)    sudo dnf install -y "$1" ;;
    pacman) sudo pacman -S --noconfirm "$1" ;;
    *)      return 1 ;;
  esac
}

FAIL=0
echo
echo "tmux-statusline-editor — doctor"
echo "OS: $OS · gerenciador: ${PKG:-nenhum detectado}"
echo

# ============ 1. tmux (essencial) ============
echo "Essenciais:"
if has tmux; then
  ver=$(tmux -V 2>/dev/null | awk '{print $2}')
  ok "tmux ($ver)"
else
  miss "tmux — NECESSÁRIO"
  if [ "$FIX" = 1 ] && confirm "tmux"; then pkg_install tmux && ok "tmux instalado" || { miss "falha ao instalar tmux"; FAIL=1; }
  else FAIL=1; info "instale: brew install tmux  (ou apt install tmux)"; fi
fi

# ============ 2. Node.js (roda a CLI) ============
if has node; then
  ok "node ($(node -v))"
else
  miss "node — NECESSÁRIO para rodar o editor"
  if [ "$FIX" = 1 ] && confirm "node"; then pkg_install node && ok "node instalado" || { miss "falha"; FAIL=1; }
  else FAIL=1; info "instale: brew install node  (ou use nvm)"; fi
fi

# ============ 3. pnpm (build a partir do fonte) ============
if has pnpm; then
  ok "pnpm ($(pnpm -v 2>/dev/null))"
elif has corepack; then
  warn "pnpm ausente, mas corepack existe"
  if [ "$FIX" = 1 ] && confirm "pnpm via corepack"; then corepack enable && corepack prepare pnpm@latest --activate && ok "pnpm ativado" || warn "falha no corepack"; fi
else
  warn "pnpm ausente (necessário só para buildar do fonte)"
  if [ "$FIX" = 1 ] && confirm "pnpm"; then npm install -g pnpm && ok "pnpm instalado" || warn "falha"; fi
  info "instale: npm i -g pnpm  (ou corepack enable)"
fi

echo
echo "Recomendados (a interface funciona sem, mas com menos recursos visuais):"

# ============ 4. Nerd Font (ícones/glifos powerline) ============
NF_FOUND=0
if has fc-list && fc-list 2>/dev/null | grep -qi "nerd"; then
  NF_FOUND=1
elif [ "$OS" = "Darwin" ]; then
  # find é robusto (não depende de glob expandir); procura em ambas as pastas de fontes
  if find "$HOME/Library/Fonts" /Library/Fonts -iname '*nerd*' -print 2>/dev/null | grep -q .; then
    NF_FOUND=1
  fi
fi
if [ "$NF_FOUND" = 1 ]; then
  ok "Nerd Font instalada (ícones e bordas powerline funcionam)"
else
  warn "Nerd Font não encontrada — ícones/bordas podem aparecer como quadrados"
  if [ "$FIX" = 1 ] && confirm "uma Nerd Font (CaskaydiaCove)"; then
    if [ "$PKG" = brew ]; then
      brew install --cask font-caskaydia-cove-nerd-font && ok "Nerd Font instalada" || warn "falha (adicione o tap: brew tap homebrew/cask-fonts)"
    else
      info "Baixe em https://www.nerdfonts.com e instale manualmente."
    fi
  else
    info "https://www.nerdfonts.com — configure seu terminal para usá-la."
  fi
fi

# ============ 5. tmux-agent-indicator (só p/ os itens do Claude Code nas abas) ============
TPM_DIR="${TMUX_PLUGIN_MANAGER_PATH:-$HOME/.tmux/plugins}"
if [ -d "$TPM_DIR/tmux-agent-indicator" ]; then
  ok "tmux-agent-indicator (indicador do Claude nas abas disponível)"
else
  warn "tmux-agent-indicator ausente (opcional — só p/ os itens 'Dev: Claude Code')"
  if [ "$FIX" = 1 ] && confirm "tmux-agent-indicator (via git clone)"; then
    mkdir -p "$TPM_DIR"
    if git clone --depth 1 https://github.com/accessd/tmux-agent-indicator "$TPM_DIR/tmux-agent-indicator" 2>/dev/null; then
      ok "tmux-agent-indicator clonado"
      info "adicione ao ~/.tmux.conf: set -g @plugin 'accessd/tmux-agent-indicator' (via TPM) ou run-shell do .tmux"
    else warn "falha no clone (verifique a rede/URL)"; fi
  else
    info "https://github.com/accessd/tmux-agent-indicator"
  fi
fi

# ============ 6. FORCE_COLOR / truecolor no terminal ============
if [ -n "${COLORTERM:-}" ] && printf '%s' "$COLORTERM" | grep -qiE "truecolor|24bit"; then
  ok "truecolor no terminal (\$COLORTERM=$COLORTERM)"
else
  warn "truecolor não confirmado — o editor força FORCE_COLOR=3, mas o terminal precisa suportar"
  info "no tmux, garanta: set -ga terminal-overrides ',*:Tc'  (ou terminal-features)"
fi

echo
if [ "$FAIL" = 1 ]; then
  printf '%s Faltam itens ESSENCIAIS. Rode com --fix para instalar, ou instale manualmente.\n' "$(red '✗')"
  exit 1
else
  printf '%s Tudo pronto para usar o tmux-statusline-editor.\n' "$(green '✓')"
  [ "$FIX" != 1 ] && info "(rode 'doctor.sh --fix' para instalar os itens recomendados que faltarem)"
  exit 0
fi
