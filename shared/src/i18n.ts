// i18n.ts — internacionalização mínima e sem dependências.
// Idioma padrão: inglês (en). Detecta o idioma do sistema por LC_ALL/LC_MESSAGES/LANG.
// Só há suporte a en e pt; qualquer outro cai em en.

export type Lang = "en" | "pt";

/** Detecta o idioma a partir das variáveis de ambiente locais (en como padrão). */
export function detectLang(env: Record<string, string | undefined> = getEnv()): Lang {
  const raw = env.TSE_LANG || env.LC_ALL || env.LC_MESSAGES || env.LANG || "";
  const lc = raw.toLowerCase();
  if (lc.startsWith("pt") || lc.includes("pt_br") || lc.includes("pt-br")) return "pt";
  return "en";
}

function getEnv(): Record<string, string | undefined> {
  // process pode não existir em contextos não-node; protege.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p: any = typeof process !== "undefined" ? process : undefined;
  return (p && p.env) || {};
}

let current: Lang = detectLang();

/** Idioma ativo. */
export function getLang(): Lang { return current; }

/** Força um idioma (útil para testes ou flag --lang). */
export function setLang(l: Lang): void { current = l; }

/**
 * Dicionário de strings da INTERFACE (não do catálogo — esse tem tradução própria por key).
 * Chaves em inglês; `pt` traduz. Use t("key") ou t("key", {var}).
 */
type Dict = Record<string, string>;

const EN: Dict = {
  // header / tabs
  "app.title": "tmux statusline editor",
  "tab.editor": "editor",
  "tab.history": "history",
  "tab.themes": "themes",

  // zones
  "zone.left": "status-left",
  "zone.windowFormat": "tabs (others)",
  "zone.windowCurrentFormat": "current tab",
  "zone.right": "status-right",
  "barPart": "bar part: ",

  // editor list / preview
  "preview.real": "preview (how it actually looks):",
  "list.empty": '(empty — press "a" to add an item)',
  "noWindows": " (no windows) ",

  // footer help
  "help.nav": "←/→ part · ↑/↓ item · , / . move · a add · d duplicate · r remove · e edit · c/v/V copy/paste color · l clear colors · g general bg · Enter apply · q quit",
  "help.add": "type to search · ↑/↓ choose · Enter add · Esc clear/cancel",
  "help.edit": "↑/↓ field · ←/→ value · Enter save · Esc cancel",
  "help.other": "Tab back to editor · q quit",

  // statuses
  "st.imported": "Imported from live tmux.",
  "st.noServer": "No tmux server — loaded defaults.",
  "st.added": "Added: {name}",
  "st.duplicated": "Item duplicated: {name} (Enter applies to tmux).",
  "st.removed": "Item removed.",
  "st.moved.back": "Item moved ◀ back (Enter applies to tmux).",
  "st.moved.fwd": "Item moved forward ▶ (Enter applies to tmux).",
  "st.moved.first": "Already the first item.",
  "st.moved.last": "Already the last item.",
  "st.segEdited": "Segment edited (Enter applies to tmux).",
  "st.zoneStyle": "Style applied to the whole zone (Enter applies to tmux).",
  "st.optsEdited": "General options edited (Enter applies to tmux).",
  "st.copied": "Colors copied — go to another item and press 'v' to paste (V pastes to the whole tab).",
  "st.pasted": "Colors pasted to this item (Enter applies to tmux).",
  "st.pastedZone": "Colors pasted to the whole tab/zone (Enter applies to tmux).",
  "st.cleared": "Zone colors cleared (default fg/bg). Enter applies to tmux.",
  "st.themeOff": "Conflicting theme disabled ({n} line(s) commented). Now apply (Enter) — your edits will stick.",
  "st.themeNone": "No theme lines found.",
  "st.applied.live": "✓ Applied to live tmux (+ version saved).",
  "st.applied.file": "✓ Written to ~/.tmux.conf (+ version saved). No server to reload.",
  "st.secondsNote": " (bumped refresh to 1s because of seconds)",
  "loading": "Loading…",

  // theme conflict banner
  "conflict.msg": "⚠ A theme (e.g. tokyo-night) controls your status line and overrides edits. ",
  "conflict.action": 'Press "x" to let the editor take over',
  "conflict.tail": " (reversible, with backup).",

  // history view
  "history.title": "Version history",
  "history.empty": "(no versions saved yet — apply an edit)",
  "history.count": "{n} version(s). (restore/pin coming next)",

  // themes view
  "themes.title": "Themes",
  "themes.wip": "(theme gallery — under construction)",

  // EditSegment
  "seg.title": "Edit segment — ↑/↓ field · ←/→ value · Enter save · Esc cancel",
  "seg.applyHint": 'tip: press "A" (shift+a) to apply this color/style to the WHOLE tab/zone (avoids a patchy look)',
  "seg.preview": "preview: ",
  "seg.shows": "Shows: ",
  "seg.change": "   → change",
  "seg.custom": "Custom text",
  "seg.fg": "Text color (fg): ",
  "seg.bg": "Background (bg): ",
  "seg.none": "none",
  "seg.empty": "(empty)",
  "attr.bold": "Bold",
  "attr.dim": "Dim",
  "attr.underscore": "Underline",
  "attr.reverse": "Reverse",
  "attr.italics": "Italic",
  "attr.on": "● on",
  "attr.off": "○ off",

  // picker (library)
  "pick.title": "Pick what to show — type to search · ↑/↓ navigate · Enter choose · Esc back",
  "pick.search": "search: ",
  "pick.searchHint": '(type… e.g. "git", "battery", "clock", "icon")',
  "pick.results": "{n} result(s) · Esc clears",
  "pick.none": 'Nothing found for "{q}". Clear to see all.',
  "pick.custom": "✏️  Custom text…",
  "pick.customHint": "(type whatever you want)",
  "pick.customDesc": "Fixed text/value you type.",

  // add panel
  "add.title": "What do you want to show here?  (type to search · ↑/↓ choose · Enter add · Esc cancel)",
  "add.shows": '  → shows "{ex}"',

  // EditOptions
  "opt.title": "General options — ↑/↓ field · ←/→ value · Enter save · Esc cancel",
  "opt.bg": "General background (bg): ",
  "opt.fg": "General text (fg): ",
  "opt.position": "Position: ",
  "opt.justify": "Alignment: ",
  "opt.interval": "Refresh (seconds): ",
  "opt.leftLen": "Left max length: ",
  "opt.rightLen": "Right max length: ",
  "opt.bgPreview": "background preview: ",
  "opt.bgSample": "  sample text on the bar  ",
  "opt.posBottom": "bottom",
  "opt.posTop": "top",
  "opt.bgHint": "tip: this changes the whole bar's background (the #9b988f / status-style).",
  "cw.bg": "bg {c}",
  "cw.fg": "fg {c}",
  "cw.bold": "bold",

  // CLI (main)
  "cli.desc": "tmux-statusline — visual editor for the tmux status line",
  "cli.tmuxMissing": "⚠️  tmux not found in PATH. Install tmux before using.",
  "agentTabs.on": "✓ Claude indicator in tabs: on (daemon in background).",
  "agentTabs.hint": "  add #{@agent_icon} to your window-status-format to see the icon.",
  "agentTabs.off.hint": "  turn off: tmux-statusline agent-tabs stop",
  "agentTabs.off": "✓ Claude indicator in tabs: off.",
};

const PT: Dict = {
  "app.title": "editor de statusline do tmux",
  "tab.editor": "editor",
  "tab.history": "histórico",
  "tab.themes": "temas",

  "zone.left": "status-left",
  "zone.windowFormat": "abas (outras)",
  "zone.windowCurrentFormat": "aba atual",
  "zone.right": "status-right",
  "barPart": "parte da barra: ",

  "preview.real": "preview (como fica de verdade):",
  "list.empty": '(vazio — tecle "a" para adicionar um item)',
  "noWindows": " (sem janelas) ",

  "help.nav": "←/→ parte · ↑/↓ item · , / . mover · a adicionar · d duplicar · r remover · e editar · c/v/V copiar/colar cor · l limpar cores · g fundo geral · Enter aplicar · q sair",
  "help.add": "digite p/ buscar · ↑/↓ escolher · Enter adicionar · Esc limpa/cancela",
  "help.edit": "↑/↓ campo · ←/→ valor · Enter salva · Esc cancela",
  "help.other": "Tab volta ao editor · q sai",

  "st.imported": "Importado do tmux ao vivo.",
  "st.noServer": "Sem servidor tmux — carregado padrão.",
  "st.added": "Adicionado: {name}",
  "st.duplicated": "Item duplicado: {name} (Enter aplica no tmux).",
  "st.removed": "Segmento removido.",
  "st.moved.back": "Item movido ◀ para trás (Enter aplica no tmux).",
  "st.moved.fwd": "Item movido para frente ▶ (Enter aplica no tmux).",
  "st.moved.first": "Já é o primeiro item.",
  "st.moved.last": "Já é o último item.",
  "st.segEdited": "Segmento editado (Enter aplica no tmux).",
  "st.zoneStyle": "Estilo aplicado à zona inteira (Enter aplica no tmux).",
  "st.optsEdited": "Opções gerais editadas (Enter aplica no tmux).",
  "st.copied": "Cores copiadas — vá noutro item e tecle 'v' para colar (V cola na aba inteira).",
  "st.pasted": "Cores coladas neste item (Enter aplica no tmux).",
  "st.pastedZone": "Cores coladas na aba/zona inteira (Enter aplica no tmux).",
  "st.cleared": "Cores da zona limpas (fundo/texto padrão). Enter aplica no tmux.",
  "st.themeOff": "Tema conflitante desativado ({n} linha(s) comentadas). Agora aplique (Enter) — suas edições vão pegar.",
  "st.themeNone": "Nenhuma linha de tema encontrada.",
  "st.applied.live": "✓ Aplicado no tmux ao vivo (+ versão salva).",
  "st.applied.file": "✓ Escrito no ~/.tmux.conf (+ versão salva). Sem servidor p/ recarregar.",
  "st.secondsNote": " (ajustei o refresh p/ 1s por causa dos segundos)",
  "loading": "Carregando…",

  "conflict.msg": "⚠ Um tema (ex.: tokyo-night) controla sua statusline e sobrepõe as edições. ",
  "conflict.action": 'Tecle "x" para o editor assumir o controle',
  "conflict.tail": " (revertível, com backup).",

  "history.title": "Histórico de versões",
  "history.empty": "(nenhuma versão salva ainda — aplique uma edição)",
  "history.count": "{n} versão(ões). (restaurar/pin vem no próximo passo)",

  "themes.title": "Temas",
  "themes.wip": "(galeria de temas — em construção)",

  "seg.title": "Editar segmento — ↑/↓ campo · ←/→ valor · Enter salva · Esc cancela",
  "seg.applyHint": 'dica: tecle "A" (shift+a) p/ aplicar esta cor/estilo à ABA/zona INTEIRA (evita o visual picotado)',
  "seg.preview": "preview: ",
  "seg.shows": "Mostra: ",
  "seg.change": "   → trocar",
  "seg.custom": "Texto personalizado",
  "seg.fg": "Cor texto (fg): ",
  "seg.bg": "Cor fundo (bg): ",
  "seg.none": "nenhum",
  "seg.empty": "(vazio)",
  "attr.bold": "Negrito",
  "attr.dim": "Fraco (dim)",
  "attr.underscore": "Sublinhado",
  "attr.reverse": "Inverter",
  "attr.italics": "Itálico",
  "attr.on": "● ligado",
  "attr.off": "○ desligado",

  "pick.title": "Escolher o que mostrar — digite p/ buscar · ↑/↓ navega · Enter escolhe · Esc volta",
  "pick.search": "buscar: ",
  "pick.searchHint": '(digite… ex.: "git", "bateria", "hora", "ícone")',
  "pick.results": "{n} resultado(s) · Esc limpa",
  "pick.none": 'Nada encontrado para "{q}". Apague p/ ver tudo.',
  "pick.custom": "✏️  Texto personalizado…",
  "pick.customHint": "(digite o que quiser)",
  "pick.customDesc": "Texto/valor fixo que você digita.",

  "add.title": "O que você quer mostrar aqui?  (digite p/ buscar · ↑/↓ escolhe · Enter adiciona · Esc cancela)",
  "add.shows": '  → mostra "{ex}"',

  "opt.title": "Opções gerais — ↑/↓ campo · ←/→ valor · Enter salva · Esc cancela",
  "opt.bg": "Fundo geral (bg): ",
  "opt.fg": "Texto geral (fg): ",
  "opt.position": "Posição: ",
  "opt.justify": "Alinhamento: ",
  "opt.interval": "Refresh (segundos): ",
  "opt.leftLen": "Comprimento máx. esquerda: ",
  "opt.rightLen": "Comprimento máx. direita: ",
  "opt.bgPreview": "preview do fundo: ",
  "opt.bgSample": "  exemplo de texto na barra  ",
  "opt.posBottom": "embaixo",
  "opt.posTop": "em cima",
  "opt.bgHint": "dica: aqui muda o fundo da barra inteira (o #9b988f / status-style).",
  "cw.bg": "fundo {c}",
  "cw.fg": "texto {c}",
  "cw.bold": "negrito",

  "cli.desc": "tmux-statusline — editor visual da statusline do tmux",
  "cli.tmuxMissing": "⚠️  tmux não encontrado no PATH. Instale o tmux antes de usar.",
  "agentTabs.on": "✓ indicador do Claude nas abas: ligado (daemon em background).",
  "agentTabs.hint": "  adicione #{@agent_icon} no seu window-status-format para ver o ícone.",
  "agentTabs.off.hint": "  desligar: tmux-statusline agent-tabs stop",
  "agentTabs.off": "✓ indicador do Claude nas abas: desligado.",
};

const DICTS: Record<Lang, Dict> = { en: EN, pt: PT };

/** Traduz uma chave para o idioma ativo, com interpolação simples de {vars}. */
export function t(key: string, vars?: Record<string, string | number>): string {
  const dict = DICTS[current] ?? EN;
  let s = dict[key] ?? EN[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}
