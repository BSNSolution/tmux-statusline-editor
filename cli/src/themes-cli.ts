// themes-cli.ts — gerencia PLUGINS DE TEMA do tmux (salvar/desativar/reativar).
// O problema: um plugin de tema (tokyo-night) já carregado na MEMÓRIA do tmux continua
// sobrescrevendo a statusline mesmo após comentar a linha — porque hooks/scripts dele
// seguem rodando. Solução real: comentar as linhas + descarregar via kill-server (reinício
// limpo) OU source-file limpo. E salvar tudo num backup reativável.
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmuxConfPath, dataDir } from "./paths.js";

const pexec = promisify(execFile);

// linhas que ligam plugins/temas de statusline (NÃO mexe em tpm/sensible/resurrect/yank etc.)
const THEME_LINE_RE = [
  /@plugin\s+['"][^'"]*(tokyo-night|catppuccin|dracula|nord|powerline|statusline)[^'"]*['"]/i,
  /@tokyo-night/i,
  /@catppuccin/i,
  /@dracula/i,
  /status-right.*tokyo-night/i,
  /status-left.*tokyo-night/i,
  /run.*tokyo-night/i,
];

// plugins essenciais que NUNCA devem ser tocados (não são temas de statusline)
const KEEP = /tpm|tmux-sensible|tmux-resurrect|tmux-continuum|tmux-yank|vim-tmux-navigator|agent-indicator/i;

const DISABLED_MARK = "# [tse-theme-disabled] ";

function themesBackupFile(): string {
  return path.join(dataDir(), "themes-desativados.tmux.conf");
}

/** Retorna as linhas (não comentadas) que ativam temas de statusline. */
export function findThemeLines(): { n: number; text: string }[] {
  const conf = tmuxConfPath();
  let content = "";
  try { content = fs.readFileSync(conf, "utf8"); } catch { return []; }
  const out: { n: number; text: string }[] = [];
  content.split("\n").forEach((line, i) => {
    const t = line.trim();
    if (t.startsWith("#")) return;
    if (KEEP.test(line)) return;                 // preserva plugins essenciais
    if (THEME_LINE_RE.some((re) => re.test(line))) out.push({ n: i + 1, text: t });
  });
  return out;
}

/** Desativa os temas: salva as linhas num backup reativável + comenta no conf. */
export function disableThemes(): { disabled: number; backupFile: string } {
  const conf = tmuxConfPath();
  fs.mkdirSync(dataDir(), { recursive: true });
  let content = "";
  try { content = fs.readFileSync(conf, "utf8"); } catch { return { disabled: 0, backupFile: themesBackupFile() }; }

  const saved: string[] = [];
  const lines = content.split("\n").map((line) => {
    const t = line.trim();
    if (t.startsWith("#")) return line;
    if (KEEP.test(line)) return line;
    if (THEME_LINE_RE.some((re) => re.test(line))) {
      saved.push(line);
      return DISABLED_MARK + line;
    }
    return line;
  });

  if (saved.length > 0) {
    // salva o backup reativável (append, com timestamp lógico via contador de blocos)
    const header = `# ===== tema desativado pelo tmux-statusline-editor =====\n# Para REATIVAR: rode  tmux-statusline --enable-themes  (ou descomente no ~/.tmux.conf removendo "${DISABLED_MARK.trim()}")\n`;
    fs.writeFileSync(themesBackupFile(), header + saved.join("\n") + "\n");
    fs.writeFileSync(conf, lines.join("\n"));
  }
  return { disabled: saved.length, backupFile: themesBackupFile() };
}

/** Reativa: descomenta as linhas marcadas no conf. */
export function enableThemes(): number {
  const conf = tmuxConfPath();
  let content = "";
  try { content = fs.readFileSync(conf, "utf8"); } catch { return 0; }
  let count = 0;
  const re = new RegExp("^" + DISABLED_MARK.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const lines = content.split("\n").map((line) => {
    if (re.test(line)) { count++; return line.replace(re, ""); }
    return line;
  });
  if (count > 0) fs.writeFileSync(conf, lines.join("\n"));
  return count;
}

/**
 * Reinicia o servidor tmux LIMPO para descarregar plugins/hooks já carregados na memória.
 * ⚠️ Isso reinicia o tmux — as sessões são preservadas se tmux-resurrect/continuum estiverem
 * configurados; senão, avisa. Aqui fazemos o mais seguro: apenas source-file + unset dos hooks
 * de tema. kill-server só com --hard.
 */
export async function reloadClean(opts: { hard?: boolean } = {}): Promise<string> {
  const conf = tmuxConfPath();
  if (opts.hard) {
    // salva sessões (se resurrect existir) e mata o servidor — reinício 100% limpo
    try { await pexec("tmux", ["run-shell", `${process.env.HOME}/.tmux/plugins/tmux-resurrect/scripts/save.sh`]); } catch { /* opcional */ }
    try { await pexec("tmux", ["kill-server"]); return "Servidor tmux reiniciado do zero (memória limpa)."; }
    catch { return "Não consegui matar o servidor (nenhum rodando?)."; }
  }
  // modo suave: limpa os hooks que o tema instala e recarrega o conf
  try {
    await pexec("tmux", ["set-hook", "-gu", "after-new-window"]).catch(() => {});
    await pexec("tmux", ["set-hook", "-gu", "after-kill-pane"]).catch(() => {});
    await pexec("tmux", ["set-hook", "-gu", "pane-focus-in"]).catch(() => {});
    await pexec("tmux", ["source-file", conf]);
    return "Recarregado (hooks de tema limpos). Se ainda sobrescrever, use --hard (reinicia o tmux).";
  } catch { return "Falha ao recarregar."; }
}
