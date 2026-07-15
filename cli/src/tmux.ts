// tmux.ts — integração com o tmux e o ~/.tmux.conf.
// Responsável por: importar o estado atual (via `tmux show-options` + leitura do arquivo),
// e APLICAR mudanças (reescreve um bloco gerenciado no .tmux.conf + `tmux source-file`).

import { execFile } from "node:child_process";
import fs from "node:fs";
import { promisify } from "node:util";
import {
  parseStatusString,
  modelToConfig,
  parseStyleSpec,
  type StatusModel,
  type Segment,
} from "@tse/shared";
import { tmuxConfPath } from "./paths.js";

const pexec = promisify(execFile);

const BLOCK_START = "# >>> tmux-statusline-editor (gerado — não editar à mão) >>>";
const BLOCK_END = "# <<< tmux-statusline-editor <<<";

/** tmux está instalado? */
export async function tmuxAvailable(): Promise<boolean> {
  try { await pexec("tmux", ["-V"]); return true; } catch { return false; }
}

/** Versão do tmux (ex.: "3.7b"). */
export async function tmuxVersion(): Promise<string | null> {
  try { const { stdout } = await pexec("tmux", ["-V"]); return stdout.trim().replace(/^tmux\s+/, ""); }
  catch { return null; }
}

/** Há um servidor tmux rodando? (necessário p/ show-options e source-file ao vivo) */
export async function tmuxServerRunning(): Promise<boolean> {
  try { await pexec("tmux", ["list-sessions"]); return true; } catch { return false; }
}

async function showOption(name: string, opts: { window?: boolean } = {}): Promise<string> {
  try {
    const args = ["show-options", opts.window ? "-gwv" : "-gv", name];
    const { stdout } = await pexec("tmux", args);
    return stdout.replace(/\n$/, "");
  } catch { return ""; }
}

/** Importa o StatusModel do tmux ao vivo (show-options). Requer servidor rodando. */
export async function importFromServer(): Promise<StatusModel> {
  const [statusOn, interval, position, justify, styleRaw, leftLen, rightLen, left, right, wfmt, wcur, wsep, wact, wbell] =
    await Promise.all([
      showOption("status"),
      showOption("status-interval"),
      showOption("status-position"),
      showOption("status-justify"),
      showOption("status-style"),
      showOption("status-left-length"),
      showOption("status-right-length"),
      showOption("status-left"),
      showOption("status-right"),
      showOption("window-status-format", { window: true }),
      showOption("window-status-current-format", { window: true }),
      showOption("window-status-separator", { window: true }),
      showOption("window-status-activity-style", { window: true }),
      showOption("window-status-bell-style", { window: true }),
    ]);

  // "reverse" (deixado por plugins) inverte fg/bg nas abas com atividade/sino — neutraliza p/ default.
  const neutralize = (s: string) => (s.trim().toLowerCase() === "reverse" || s.trim() === "") ? "default" : s.trim();

  return {
    options: {
      status: statusOn !== "off",
      interval: intOr(interval, 5),
      position: position === "top" ? "top" : "bottom",
      justify: (justify === "centre" || justify === "right") ? justify : "left",
      style: parseStyleSpec(styleRaw),
      leftLength: intOr(leftLen, 40),
      rightLength: intOr(rightLen, 80),
    },
    left: parseStatusString(left),
    right: parseStatusString(right),
    windowFormat: parseStatusString(wfmt),
    windowCurrentFormat: parseStatusString(wcur),
    windowSeparator: wsep,
    windowActivityStyle: neutralize(wact),
    windowBellStyle: neutralize(wbell),
  };
}

/** Info de uma janela real (para o preview das abas). */
export interface RealWindow { index: string; name: string; active: boolean; }

/** Lista as janelas reais da sessão atual (para o preview parecer o de verdade). */
export async function listRealWindows(): Promise<RealWindow[]> {
  try {
    const { stdout } = await pexec("tmux", ["list-windows", "-F", "#{window_index}\t#{window_name}\t#{window_active}"]);
    return stdout.trim().split("\n").filter(Boolean).map((l) => {
      const [index = "", name = "", active = "0"] = l.split("\t");
      return { index, name, active: active === "1" };
    });
  } catch { return []; }
}

/** Expande um format do tmux com os valores REAIS (host, hora, etc.) via display-message. */
export async function expandFormat(fmt: string): Promise<string> {
  if (!fmt) return "";
  try {
    const { stdout } = await pexec("tmux", ["display-message", "-p", fmt]);
    return stdout.replace(/\n$/, "");
  } catch { return fmt; }
}

/** Model default (quando não há servidor nem config). */
export function defaultModel(): StatusModel {
  return {
    options: { status: true, interval: 5, position: "bottom", justify: "left",
      style: { bg: "#15161A", fg: "#9b988f" }, leftLength: 40, rightLength: 80 },
    left: parseStatusString("#[bg=#7b44ab,fg=#ffffff,bold] #S "),
    right: parseStatusString("#[fg=#5fb8c8]#h #[fg=#9b988f]· %H:%M "),
    windowFormat: parseStatusString("#[fg=#9b988f] #I:#W "),
    windowCurrentFormat: parseStatusString("#[bg=#2a2c34,fg=#a48bff,bold] #I:#W #[default]"),
    windowSeparator: "",
    windowActivityStyle: "default",
    windowBellStyle: "default",
  };
}

/** Aplica o model: injeta/atualiza o bloco gerenciado no .tmux.conf e (se possível) source-file ao vivo. */
export async function applyModel(model: StatusModel): Promise<{ wrote: boolean; sourced: boolean }> {
  const conf = tmuxConfPath();
  const block = [BLOCK_START, ...modelToConfig(model), BLOCK_END].join("\n");

  let content = "";
  try { content = fs.readFileSync(conf, "utf8"); } catch { /* arquivo pode não existir ainda */ }

  const re = new RegExp(`${escapeRe(BLOCK_START)}[\\s\\S]*?${escapeRe(BLOCK_END)}`);
  if (re.test(content)) {
    content = content.replace(re, block);
  } else {
    content = content.replace(/\s*$/, "") + "\n\n" + block + "\n";
  }
  fs.writeFileSync(conf, content, "utf8");

  let sourced = false;
  if (await tmuxServerRunning()) {
    try { await pexec("tmux", ["source-file", conf]); sourced = true; } catch { sourced = false; }
  }
  return { wrote: true, sourced };
}

function intOr(s: string, d: number): number { const n = parseInt(s, 10); return Number.isFinite(n) ? n : d; }
function escapeRe(s: string): string { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

// ─────────── Detecção/neutralização de PLUGINS DE TEMA que roubam a statusline ───────────
// Plugins como tokyo-night redefinem window-status-format/status-right em runtime, então
// as edições do editor não "pegam". Para o editor assumir o controle, comentamos as linhas
// que carregam/configuram esses temas (dentro de marcadores, para poder reverter).

const THEME_MARKERS = [
  /tokyo-night/i,
  /catppuccin/i,
  /dracula\/tmux/i,
  /nord-tmux/i,
  /@plugin ['"].*(theme|statusline|powerline).*['"]/i,
];

const DISABLED_START = "# >>> tmux-statusline-editor: tema desativado (revertível) >>>";
const DISABLED_END = "# <<< tmux-statusline-editor: tema desativado <<<";

export interface ThemeConflict {
  present: boolean;
  lines: { n: number; text: string }[];
}

/** Detecta linhas do .tmux.conf que configuram um plugin de tema conflitante. */
export function detectThemeConflict(): ThemeConflict {
  const conf = tmuxConfPath();
  let content = "";
  try { content = fs.readFileSync(conf, "utf8"); } catch { return { present: false, lines: [] }; }
  const out: { n: number; text: string }[] = [];
  content.split("\n").forEach((line, i) => {
    const t = line.trim();
    if (t.startsWith("#")) return; // já comentado
    if (THEME_MARKERS.some((re) => re.test(line))) out.push({ n: i + 1, text: t });
  });
  return { present: out.length > 0, lines: out };
}

/** Comenta as linhas do tema conflitante (com backup do arquivo). Retorna quantas linhas comentou. */
export function disableConflictingTheme(): number {
  const conf = tmuxConfPath();
  let content = "";
  try { content = fs.readFileSync(conf, "utf8"); } catch { return 0; }
  let count = 0;
  const lines = content.split("\n").map((line) => {
    const t = line.trim();
    if (t.startsWith("#")) return line;
    if (THEME_MARKERS.some((re) => re.test(line))) {
      count++;
      return `# [tse-disabled] ${line}`;
    }
    return line;
  });
  if (count > 0) {
    const banner = `${DISABLED_START}\n# ${count} linha(s) de tema comentadas pelo editor. Reverta removendo os "# [tse-disabled] ".\n${DISABLED_END}`;
    fs.writeFileSync(conf, banner + "\n" + lines.join("\n"), "utf8");
  }
  return count;
}

export type { Segment };
