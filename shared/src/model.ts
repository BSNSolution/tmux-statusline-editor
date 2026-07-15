// model.ts — o modelo de dados central da statusline do tmux.
// Uma statusline é uma sequência de SEGMENTOS. Cada segmento tem um estilo (fg/bg/attrs)
// e um conteúdo (texto literal, um format #{...}, uma variável simples #S/#h, um comando
// #(script) opaco, ou um separator powerline). O parser converte a sintaxe crua do tmux
// neste modelo; o gerador faz o caminho inverso.

/** Cor no tmux: nome ("red","colour4"), hex ("#7b44ab"), "default", ou "terminal". */
export type TmuxColor = string;

/** Atributos de estilo do tmux (#[...]). */
export interface TmuxStyle {
  fg?: TmuxColor;
  bg?: TmuxColor;
  bold?: boolean;
  dim?: boolean;
  underscore?: boolean;
  blink?: boolean;
  reverse?: boolean;
  italics?: boolean;
  strikethrough?: boolean;
  /** Se true, este segmento reseta para o estilo default (#[default]). */
  reset?: boolean;
}

/** Tipos de conteúdo de um segmento. */
export type SegmentKind =
  | "text"       // texto literal
  | "format"     // um item do catálogo: #{...} ou variável tipo #S, #h, #I, #W
  | "command"    // #(script args) — tratado como opaco (preserva verbatim)
  | "conditional"// #{?cond,a,b} — condicional do tmux (opaco por ora, editável como texto)
  | "separator"; // separator powerline (caractere , , etc.) — normalmente só muda de bg/fg

/** Um segmento da statusline. */
export interface Segment {
  id: string;
  kind: SegmentKind;
  /** O conteúdo cru que vai para a saída (ex.: "#S", "#{pane_current_path}", " · ", "%H:%M"). */
  content: string;
  /** Estilo aplicado a este segmento (vira um #[...] antes do conteúdo). */
  style: TmuxStyle;
  /** Rótulo amigável exibido no editor (do catálogo, ou derivado). */
  label?: string;
  /** Para kind=format: a key do catálogo (ex.: "session_name"). */
  catalogKey?: string;
  /** true = conteúdo não deve ser mexido pelo editor (comandos/condicionais complexos). */
  opaque?: boolean;
}

/** As três zonas editáveis da statusline. */
export interface StatusModel {
  /** Opções globais de status. */
  options: {
    status: boolean;
    interval: number;
    position: "top" | "bottom";
    justify: "left" | "centre" | "right";
    style: TmuxStyle;            // status-style (bg/fg de fundo geral)
    leftLength: number;         // status-left-length
    rightLength: number;        // status-right-length
  };
  left: Segment[];              // status-left
  right: Segment[];             // status-right
  /** window-status-format e -current-format são cada um uma lista de segmentos. */
  windowFormat: Segment[];
  windowCurrentFormat: Segment[];
  windowSeparator: string;      // window-status-separator (ex.: "")
  /**
   * Estilos-base aplicados por CIMA do formato das abas. Plugins (tokyo-night) costumam
   * setar isto como "reverse", o que INVERTE fg/bg nas abas com atividade/sino e destoa do
   * que o usuário configurou. Gerenciamos aqui p/ neutralizar (default = sem inversão).
   */
  windowActivityStyle?: string; // window-status-activity-style (ex.: "default")
  windowBellStyle?: string;     // window-status-bell-style     (ex.: "default")
}

/** Um tema = paleta + estilos-base aplicáveis. */
export interface Theme {
  key: string;
  name: string;
  author?: string;
  /** Paleta nomeada (ex.: bg, fg, accent, muted, ...). */
  palette: Record<string, TmuxColor>;
  /** Overrides de opções/segmentos que o tema aplica. */
  statusStyle: TmuxStyle;
  /** Separadores powerline preferidos do tema. */
  separators?: { left?: string; right?: string };
}

export function emptyStyle(): TmuxStyle {
  return {};
}

let _idc = 0;
/** Gera id estável dentro de um processo (não usa Math.random p/ ser determinístico em testes). */
export function newId(prefix = "seg"): string {
  _idc += 1;
  return `${prefix}_${_idc}`;
}

export function resetIdCounter(): void {
  _idc = 0;
}
