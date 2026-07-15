// generator.ts — converte Segment[] / StatusModel de volta para a sintaxe do tmux.

import type { Segment, StatusModel, TmuxStyle } from "./model.js";

/** Gera um bloco #[...] a partir de um TmuxStyle. Retorna "" se o estilo for vazio. */
export function styleToSpec(st: TmuxStyle): string {
  if (st.reset) return "#[default]";
  const parts: string[] = [];
  if (st.fg) parts.push(`fg=${st.fg}`);
  if (st.bg) parts.push(`bg=${st.bg}`);
  if (st.bold) parts.push("bold");
  if (st.dim) parts.push("dim");
  if (st.underscore) parts.push("underscore");
  if (st.blink) parts.push("blink");
  if (st.reverse) parts.push("reverse");
  if (st.italics) parts.push("italics");
  if (st.strikethrough) parts.push("strikethrough");
  return parts.length ? `#[${parts.join(",")}]` : "";
}

/** Dois estilos são iguais? (para evitar reemitir #[...] redundante) */
function styleEq(a: TmuxStyle, b: TmuxStyle): boolean {
  const keys: (keyof TmuxStyle)[] = ["fg", "bg", "bold", "dim", "underscore", "blink", "reverse", "italics", "strikethrough", "reset"];
  return keys.every((k) => (a[k] ?? undefined) === (b[k] ?? undefined));
}

/** Gera a string crua de uma lista de segmentos, emitindo #[...] só quando o estilo muda. */
export function segmentsToString(segments: Segment[]): string {
  let out = "";
  let prev: TmuxStyle | null = null;
  for (const seg of segments) {
    if (prev === null || !styleEq(prev, seg.style)) {
      out += styleToSpec(seg.style);
      prev = seg.style;
    }
    out += seg.content;
  }
  return out;
}

/** Gera o conjunto de linhas `set -g ...` do StatusModel completo. */
export function modelToConfig(m: StatusModel): string[] {
  const lines: string[] = [];
  lines.push(`set -g status ${m.options.status ? "on" : "off"}`);
  lines.push(`set -g status-interval ${m.options.interval}`);
  lines.push(`set -g status-position ${m.options.position}`);
  lines.push(`set -g status-justify ${m.options.justify}`);
  const styleSpec = statusStyleToString(m.options.style);
  if (styleSpec) lines.push(`set -g status-style "${styleSpec}"`);
  lines.push(`set -g status-left-length ${m.options.leftLength}`);
  lines.push(`set -g status-right-length ${m.options.rightLength}`);
  lines.push(`set -g status-left "${escapeQuotes(segmentsToString(m.left))}"`);
  lines.push(`set -g status-right "${escapeQuotes(segmentsToString(m.right))}"`);
  lines.push(`setw -g window-status-format "${escapeQuotes(segmentsToString(m.windowFormat))}"`);
  lines.push(`setw -g window-status-current-format "${escapeQuotes(segmentsToString(m.windowCurrentFormat))}"`);
  lines.push(`setw -g window-status-separator "${escapeQuotes(m.windowSeparator)}"`);
  // Neutraliza a inversão fg/bg que plugins deixam nas abas com atividade/sino (default = sem reverse).
  lines.push(`setw -g window-status-activity-style ${m.windowActivityStyle ?? "default"}`);
  lines.push(`setw -g window-status-bell-style ${m.windowBellStyle ?? "default"}`);
  return lines;
}

/** status-style é um estilo "chapado" (sem #[]), ex.: "bg=#15161A,fg=#9b988f". */
export function statusStyleToString(st: TmuxStyle): string {
  const parts: string[] = [];
  if (st.bg) parts.push(`bg=${st.bg}`);
  if (st.fg) parts.push(`fg=${st.fg}`);
  if (st.bold) parts.push("bold");
  if (st.dim) parts.push("dim");
  return parts.join(",");
}

function escapeQuotes(s: string): string {
  return s.replace(/"/g, '\\"');
}
