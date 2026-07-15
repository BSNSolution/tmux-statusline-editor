// human.ts — traduz segmentos/tokens do tmux para linguagem HUMANA + valor-exemplo.
// Objetivo: o usuário nunca precisa saber que #I é "índice" ou #W é "nome".
import { CATALOG, itemLabel, itemDescription, getLang, type Segment } from "@tse/shared";

// rótulos de fallback (quando não vem do catálogo), por idioma
function fb(en: string, pt: string): string { return getLang() === "pt" ? pt : en; }

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
  // catálogo primeiro (labels já são humanos, traduzidos pelo idioma ativo)
  const byKey = seg.catalogKey ? CATALOG.find((c) => c.key === seg.catalogKey) : undefined;
  if (byKey) return itemLabel(byKey);
  const byInsert = CATALOG.find((c) => c.insert === seg.content);
  if (byInsert) return itemLabel(byInsert);

  if (seg.kind === "command") return fb("Widget/Script", "Widget/Script");
  if (seg.kind === "conditional") return fb("Condition", "Condição");
  if (seg.kind === "text") {
    const t = seg.content.trim();
    if (t === "") return fb("Space", "Espaço");
    if (/^[·|:\-–—/]+$/.test(t)) return fb(`Separator "${t}"`, `Separador "${t}"`);
    if (t.includes("%")) return fb("Date/Time", "Data/Hora");
    return fb(`Text "${truncate(t, 16)}"`, `Texto "${truncate(t, 16)}"`);
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
  if (byKey) return itemDescription(byKey);
  const byInsert = CATALOG.find((c) => c.insert === seg.content);
  if (byInsert) return itemDescription(byInsert);
  if (seg.kind === "command") return fb("Runs a command and shows its output.", "Roda um comando e mostra a saída.");
  if (seg.kind === "text") return fb("Fixed text that always shows.", "Texto fixo que sempre aparece.");
  return "";
}

function truncate(s: string, n: number): string { return s.length > n ? s.slice(0, n - 1) + "…" : s; }
