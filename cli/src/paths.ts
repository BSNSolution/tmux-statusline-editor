// paths.ts — locais canônicos do app.
import os from "node:os";
import path from "node:path";

export const HOME = os.homedir();

/** O ~/.tmux.conf do usuário (alvo das mudanças). Pode ser sobrescrito por env p/ testes. */
export function tmuxConfPath(): string {
  return process.env.TSE_TMUX_CONF ?? path.join(HOME, ".tmux.conf");
}

/** Diretório de dados do app: ~/.config/tmux-statusline/ (histórico, backups, temas). */
export function dataDir(): string {
  return process.env.TSE_DATA_DIR ?? path.join(HOME, ".config", "tmux-statusline");
}

export function historyDir(): string {
  return path.join(dataDir(), "history");
}

export function backupsDir(): string {
  return path.join(dataDir(), "backups");
}

export function themesDir(): string {
  return path.join(dataDir(), "themes");
}
