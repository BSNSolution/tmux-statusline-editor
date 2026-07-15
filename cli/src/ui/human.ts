// human.ts — traduz segmentos/tokens do tmux para linguagem HUMANA + valor-exemplo.
// Objetivo: o usuário nunca precisa saber que #I é "índice" ou #W é "nome".
import { CATALOG, type Segment } from "@tse/shared";

/** Valores de exemplo para renderizar um preview que parece o resultado final. */
const EXAMPLE: Record<string, string> = {
  "#S": "main",
  "#I": "2",
  "#W": "Mac",
  "#F": "*",
  "#T": "zsh",
  "#h": "macbook",
  "#H": "macbook.local",
  "#{pane_current_path}": "~/Work",
  "#{pane_current_command}": "nvim",
  "#{session_windows}": "5",
  "%H:%M": "17:20",
  "%H:%M:%S": "17:20:45",
  "%d/%m/%Y": "14/07/2026",
  "%Y-%m-%d": "2026-07-14",
  "%A": "segunda",
};

/** Nome humano de um segmento (sem jargão). Usa o catálogo, com fallbacks amigáveis. */
export function humanName(seg: Segment): string {
  // catálogo primeiro (labels já são humanos)
  const byKey = seg.catalogKey ? CATALOG.find((c) => c.key === seg.catalogKey) : undefined;
  if (byKey) return byKey.label;
  const byInsert = CATALOG.find((c) => c.insert === seg.content);
  if (byInsert) return byInsert.label;

  if (seg.kind === "command") return "Widget/Script";
  if (seg.kind === "conditional") return "Condição";
  if (seg.kind === "text") {
    const t = seg.content.trim();
    if (t === "") return "Espaço";
    if (/^[·|:\-–—/]+$/.test(t)) return `Separador "${t}"`;
    if (t.includes("%")) return "Data/Hora";
    return `Texto "${truncate(t, 16)}"`;
  }
  return truncate(seg.content, 20);
}

/** Valor de EXEMPLO que esse segmento produziria (para o preview parecer real). */
export function exampleValue(seg: Segment): string {
  // 1) item do catálogo (por key ou por conteúdo) tem exemplo curado
  const byKey = seg.catalogKey ? CATALOG.find((c) => c.key === seg.catalogKey) : undefined;
  const item = byKey ?? CATALOG.find((c) => c.insert === seg.content);
  if (item?.example) return item.example;
  // 2) strftime e tokens conhecidos
  if (EXAMPLE[seg.content] !== undefined) return EXAMPLE[seg.content]!;
  // 3) substitui múltiplos tokens dentro de um texto (ex.: " #I:#W ")
  let s = seg.content;
  let replaced = false;
  for (const [tok, val] of Object.entries(EXAMPLE)) {
    if (s.includes(tok)) { s = s.split(tok).join(val); replaced = true; }
  }
  if (replaced) return s;
  if (seg.kind === "command") return "…";        // script: valor desconhecido
  if (seg.kind === "conditional") return "…";
  return seg.content;                            // texto literal: ele mesmo
}

/** Descrição de 1 linha (leigo) do que o segmento faz. */
export function humanDescription(seg: Segment): string {
  const byKey = seg.catalogKey ? CATALOG.find((c) => c.key === seg.catalogKey) : undefined;
  if (byKey) return byKey.description;
  const byInsert = CATALOG.find((c) => c.insert === seg.content);
  if (byInsert) return byInsert.description;
  if (seg.kind === "command") return "Roda um comando e mostra a saída.";
  if (seg.kind === "text") return "Texto fixo que sempre aparece.";
  return "";
}

function truncate(s: string, n: number): string { return s.length > n ? s.slice(0, n - 1) + "…" : s; }
