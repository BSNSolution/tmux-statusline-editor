// parser.ts — converte a sintaxe crua de uma statusline do tmux em Segment[].
// Uma string de status-left/right é uma sequência de:
//   - #[...]              -> muda o estilo dos segmentos seguintes (não gera conteúdo próprio)
//   - #{...}              -> format (pode ter { } aninhados: #{?a,b,c})
//   - #(...)              -> comando (pode ter ( ) aninhados)
//   - #S #h #I #W #F #T #H -> variáveis curtas de 1 letra
//   - ## -> um literal '#'
//   - qualquer outro texto -> literal
// Estratégia: tokenizar caractere a caractere respeitando aninhamento de {} e ().
// Cada #[...] atualiza o "estilo corrente"; o próximo conteúdo herda esse estilo até o
// próximo #[...]. Assim reconstruímos segmentos {style, content}.

import { CATALOG } from "./catalog.js";
import type { Segment, TmuxStyle } from "./model.js";
import { newId } from "./model.js";

/** Faz parse de um #[...] em um objeto TmuxStyle (parcial — o que aparecer). */
export function parseStyleSpec(spec: string): TmuxStyle {
  const st: TmuxStyle = {};
  for (const rawPart of spec.split(",")) {
    const part = rawPart.trim();
    if (!part) continue;
    if (part === "default") { st.reset = true; continue; }
    if (part === "none" || part === "nobold" || part === "nodim") { /* ignore reset-of-attr */ continue; }
    if (part.startsWith("fg=")) { st.fg = part.slice(3); continue; }
    if (part.startsWith("bg=")) { st.bg = part.slice(3); continue; }
    switch (part) {
      case "bold": st.bold = true; break;
      case "dim": st.dim = true; break;
      case "underscore": case "underline": st.underscore = true; break;
      case "blink": st.blink = true; break;
      case "reverse": st.reverse = true; break;
      case "italics": case "italic": st.italics = true; break;
      case "strikethrough": st.strikethrough = true; break;
      default:
        // atributos posicionais sem fg=/bg= (ex.: "colour4" solto) — raro; ignora com segurança
        break;
    }
  }
  return st;
}

/** Lê um bloco delimitado que começa em s[i] === open, respeitando aninhamento. Retorna [conteúdo interno incluindo delimitadores, próximo índice]. */
function readDelimited(s: string, i: number, open: string, close: string): [string, number] {
  let depth = 0;
  const start = i;
  for (; i < s.length; i++) {
    const c = s[i];
    if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) { i++; break; } }
  }
  return [s.slice(start, i), i];
}

/** Classifica o conteúdo (sem o estilo) num kind + rótulo/catalogKey. */
function classify(content: string): Pick<Segment, "kind" | "label" | "catalogKey" | "opaque"> {
  if (content.startsWith("#(")) return { kind: "command", opaque: true, label: "Script #()" };
  if (content.startsWith("#{?")) return { kind: "conditional", opaque: true, label: "Condicional" };
  if (content.startsWith("#{")) {
    const hit = CATALOG.find((c) => c.insert === content);
    return { kind: "format", label: hit?.label ?? content, catalogKey: hit?.key };
  }
  if (/^#[SHIWFTh]$/.test(content)) {
    const hit = CATALOG.find((c) => c.insert === content);
    return { kind: "format", label: hit?.label ?? content, catalogKey: hit?.key };
  }
  // texto literal (inclui strftime %H:%M etc.)
  const hit = CATALOG.find((c) => c.insert === content);
  return { kind: "text", label: hit?.label ?? undefined, catalogKey: hit?.key };
}

/**
 * Parse principal: string crua -> Segment[].
 * Segmentos de texto contíguos com o mesmo estilo são mantidos como um só.
 */
export function parseStatusString(raw: string): Segment[] {
  const segments: Segment[] = [];
  let style: TmuxStyle = {};
  let textBuf = "";

  const flushText = () => {
    if (textBuf.length === 0) return;
    const meta = classify(textBuf);
    segments.push({ id: newId(), content: textBuf, style: { ...style }, ...meta });
    textBuf = "";
  };

  let i = 0;
  while (i < raw.length) {
    const c = raw[i] ?? "";
    if (c === "#" && i + 1 < raw.length) {
      const n = raw[i + 1] ?? "";
      if (n === "#") { textBuf += "#"; i += 2; continue; }            // ## -> literal #
      if (n === "[") {                                                 // #[...] -> estilo
        flushText();
        const [block, next] = readDelimited(raw, i + 1, "[", "]");     // block = "[...]"
        style = mergeStyle(style, parseStyleSpec(block.slice(1, -1))); // sem os colchetes
        i = next;
        continue;
      }
      if (n === "{") {                                                 // #{...}
        flushText();
        const [block, next] = readDelimited(raw, i + 1, "{", "}");
        const content = "#" + block;                                   // "#{...}"
        const meta = classify(content);
        segments.push({ id: newId(), content, style: { ...style }, ...meta });
        i = next;
        continue;
      }
      if (n === "(") {                                                 // #(...)
        flushText();
        const [block, next] = readDelimited(raw, i + 1, "(", ")");
        const content = "#" + block;                                   // "#(...)"
        const meta = classify(content);
        segments.push({ id: newId(), content, style: { ...style }, ...meta });
        i = next;
        continue;
      }
      if (/[SHIWFTh]/.test(n)) {                                       // #S #h etc.
        flushText();
        const content = "#" + n;
        const meta = classify(content);
        segments.push({ id: newId(), content, style: { ...style }, ...meta });
        i += 2;
        continue;
      }
    }
    textBuf += c;
    i++;
  }
  flushText();
  return segments;
}

/** Mescla estilos: um #[default] limpa; senão sobrepõe campos definidos. */
function mergeStyle(base: TmuxStyle, next: TmuxStyle): TmuxStyle {
  if (next.reset) return {}; // default reseta tudo
  return { ...base, ...next };
}
