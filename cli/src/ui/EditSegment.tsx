// EditSegment.tsx — painel de edição de UM segmento.
// Campo "Conteúdo" é um SELETOR DE BIBLIOTECA (nome humano + exemplo real), não texto cru.
// Navegação: ↑/↓ escolhe o campo · ←/→ (ou Enter) muda o valor · Enter salva · Esc cancela.
import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import {
  catalogByInsert, catalogGrouped, catalogByKey,
  t, categoryLabel, itemLabel, itemDescription,
  type Segment, type TmuxStyle, type CatalogItem,
} from "@tse/shared";

// paleta rápida (cores da marca + básicas). Editar hex livre também é possível.
const SWATCHES: { name: string; hex: string }[] = [
  { name: "—(nenhum)", hex: "" },
  { name: "roxo", hex: "#552BD7" },
  { name: "roxo claro", hex: "#7C5CFF" },
  { name: "lilás", hex: "#a48bff" },
  { name: "charcoal", hex: "#15161A" },
  { name: "grafite", hex: "#2A2C33" },
  { name: "branco", hex: "#FFFFFF" },
  { name: "cinza", hex: "#9b988f" },
  { name: "azul", hex: "#7aa2f7" },
  { name: "ciano", hex: "#5fb8c8" },
  { name: "verde", hex: "#4ade80" },
  { name: "amarelo", hex: "#fbbf24" },
  { name: "vermelho", hex: "#ef4444" },
];

type Field = "content" | "fg" | "bg" | "bold" | "dim" | "underscore" | "reverse" | "italics";
const FIELDS: Field[] = ["content", "fg", "bg", "bold", "dim", "underscore", "reverse", "italics"];

// Linhas do seletor de biblioteca: cada item do catálogo + um "texto personalizado" no topo.
type PickerRow =
  | { type: "custom" }
  | { type: "item"; item: CatalogItem };

type PickerLine = { header?: string; row?: PickerRow };

/** Monta as linhas do seletor. Se `query` != "", filtra itens por label/categoria/descrição/insert. */
function buildPickerRows(query: string): PickerLine[] {
  const q = query.trim().toLowerCase();
  const rows: PickerLine[] = [];
  if (q === "") rows.push({ row: { type: "custom" } });   // "texto personalizado" só sem busca
  for (const g of catalogGrouped()) {
    const items = q === ""
      ? g.items
      : g.items.filter((it) =>
          it.label.toLowerCase().includes(q) ||
          g.category.toLowerCase().includes(q) ||
          it.description.toLowerCase().includes(q) ||
          it.insert.toLowerCase().includes(q) ||
          (it.example ?? "").toLowerCase().includes(q));
    if (items.length === 0) continue;
    rows.push({ header: g.category });
    for (const item of items) rows.push({ row: { type: "item", item } });
  }
  return rows;
}

function swatchIndex(hex: string | undefined): number {
  const i = SWATCHES.findIndex((s) => s.hex.toLowerCase() === (hex ?? "").toLowerCase());
  return i >= 0 ? i : 0;
}

/**
 * Infere o kind pelo CONTEÚDO — garante que scripts rodem mesmo se o vínculo com o catálogo se perdeu
 * (ex.: usuário editou o texto à mão). #(...) = command (tmux executa); #{?...} = conditional;
 * #{...}/#.. = format; senão text. Sem isso, um script vira "texto" e o tmux só imprime a string crua.
 */
function inferKind(content: string, fallback: Segment["kind"]): Segment["kind"] {
  if (content.includes("#(")) return "command";
  if (content.includes("#{?")) return "conditional";
  if (content.includes("#{") || /#[SIWFTHhP]/.test(content)) return "format";
  return fallback ?? "text";
}

/** Nome humano + exemplo do conteúdo atual, para mostrar no campo. */
function humanizeContent(content: string, catalogKey?: string): { name: string; example: string } {
  const byKey = catalogKey ? catalogByKey(catalogKey) : undefined;
  const item = byKey ?? catalogByInsert(content);
  if (item) return { name: itemLabel(item), example: item.example ?? "" };
  return { name: t("seg.custom"), example: content.trim() || t("seg.empty") };
}

export function EditSegment({ seg, onSave, onCancel, onApplyToZone }: {
  seg: Segment;
  onSave: (next: Segment) => void;
  onCancel: () => void;
  onApplyToZone?: (style: TmuxStyle) => void;   // aplica o estilo atual a TODOS os segmentos da zona
}): React.ReactElement {
  const [content, setContent] = useState(seg.content);
  const [catalogKey, setCatalogKey] = useState<string | undefined>(seg.catalogKey);
  const [kind, setKind] = useState<Segment["kind"]>(seg.kind);
  const [style, setStyle] = useState<TmuxStyle>({ ...seg.style });
  const [fieldIdx, setFieldIdx] = useState(0);
  const [editingText, setEditingText] = useState(false);   // digitando texto livre
  const [picking, setPicking] = useState(false);           // seletor de biblioteca aberto
  const [pickIdx, setPickIdx] = useState(0);               // índice em SELECTABLE (filtrado)
  const [query, setQuery] = useState("");                  // busca no seletor

  const field = FIELDS[fieldIdx]!;

  // linhas do seletor, refeitas conforme a busca
  const rows = buildPickerRows(query);
  const selectable = rows.map((r, i) => (r.row ? i : -1)).filter((i) => i >= 0);

  function chooseItem(item: CatalogItem) {
    setContent(item.insert);
    setCatalogKey(item.key);
    setKind(item.kind ?? "format");
    setPicking(false);
    if (item.key === "text" || item.key === "custom_script") setEditingText(true); // deixa editar de imediato
  }

  useInput((input, key) => {
    // ---- modo: seletor de biblioteca (com busca por texto) ----
    if (picking) {
      if (key.escape) {
        if (query) { setQuery(""); setPickIdx(0); return; }  // 1º Esc limpa a busca
        setPicking(false); return;                            // 2º Esc fecha o seletor
      }
      if (key.upArrow) { setPickIdx((i) => Math.max(0, i - 1)); return; }
      if (key.downArrow) { setPickIdx((i) => Math.min(selectable.length - 1, i + 1)); return; }
      if (key.return) {
        const rowIdx = selectable[pickIdx];
        if (rowIdx === undefined) return;                     // nada encontrado
        const r = rows[rowIdx]!.row!;
        if (r.type === "custom") {
          setCatalogKey(undefined); setKind("text");
          setPicking(false); setEditingText(true);
        } else {
          chooseItem(r.item);
        }
        return;
      }
      // digitação = busca
      if (key.backspace || key.delete) { setQuery((q) => q.slice(0, -1)); setPickIdx(0); return; }
      if (input && !key.ctrl && !key.meta && input.length === 1 && input >= " ") {
        setQuery((q) => q + input); setPickIdx(0); return;
      }
      return;
    }
    // ---- modo: digitando texto livre ----
    if (editingText) {
      if (key.escape) { setEditingText(false); }
      return;   // o TextInput consome o resto
    }
    // ---- modo: navegação normal dos campos ----
    if (key.escape) { onCancel(); return; }
    if (key.return) { onSave({ ...seg, content, style, kind: inferKind(content, kind), catalogKey }); return; }
    if (input === "A" && onApplyToZone) { onApplyToZone(style); return; }
    if (key.upArrow) { setFieldIdx((i) => Math.max(0, i - 1)); return; }
    if (key.downArrow) { setFieldIdx((i) => Math.min(FIELDS.length - 1, i + 1)); return; }

    if (field === "content") {
      // → ou Enter abre o SELETOR DE BIBLIOTECA (posicionado no item atual)
      if (key.rightArrow || key.return) {
        const base = buildPickerRows("");   // sem filtro ao abrir
        const curKey = catalogKey ?? catalogByInsert(content)?.key;
        const rowIdx = curKey
          ? base.findIndex((r) => r.row?.type === "item" && r.row.item.key === curKey)
          : -1;
        const baseSelectable = base.map((r, i) => (r.row ? i : -1)).filter((i) => i >= 0);
        const sel = rowIdx >= 0 ? baseSelectable.indexOf(rowIdx) : 0;
        setQuery(""); setPickIdx(sel >= 0 ? sel : 0);
        setPicking(true);
      }
      return;
    }
    if (field === "fg" || field === "bg") {
      const cur = swatchIndex(style[field]);
      if (key.leftArrow) { const j = (cur - 1 + SWATCHES.length) % SWATCHES.length; setStyle({ ...style, [field]: SWATCHES[j]!.hex || undefined }); }
      if (key.rightArrow) { const j = (cur + 1) % SWATCHES.length; setStyle({ ...style, [field]: SWATCHES[j]!.hex || undefined }); }
      return;
    }
    // atributos booleanos: espaço ou ←/→ alterna
    if (input === " " || key.leftArrow || key.rightArrow) {
      setStyle({ ...style, [field]: !style[field as keyof TmuxStyle] });
    }
  });

  // ===== render: seletor de biblioteca ocupa o painel quando aberto =====
  if (picking) {
    const hasResults = selectable.length > 0;
    const curSel = hasResults ? selectable[Math.min(pickIdx, selectable.length - 1)]! : -1;
    // janela de rolagem: mostra ~16 linhas ao redor da seleção
    const WINDOW = 16;
    const start = Math.max(0, Math.min(curSel - Math.floor(WINDOW / 2), Math.max(0, rows.length - WINDOW)));
    const visible = rows.slice(start, start + WINDOW);
    return (
      <Box flexDirection="column" borderStyle="round" borderColor="#7C5CFF" paddingX={1}>
        <Text bold color="#7C5CFF">{t("pick.title")}</Text>
        {/* linha de busca */}
        <Box>
          <Text color="#fbbf24">{t("pick.search")}</Text>
          <Text>{query || <Text dimColor>{t("pick.searchHint")}</Text>}</Text>
          {query ? <Text dimColor>{"   "}{t("pick.results", { n: selectable.length })}</Text> : null}
        </Box>
        {!hasResults && <Text color="#ef4444">{t("pick.none", { q: query })}</Text>}
        {visible.map((r, i) => {
          const absIdx = start + i;
          if (r.header) return <Text key={`h${absIdx}`} color="#9b988f" bold>{`── ${categoryLabel(r.header)} ──`}</Text>;
          const sel = absIdx === curSel;
          if (r.row!.type === "custom") {
            return (
              <Text key={`r${absIdx}`} color={sel ? "#7C5CFF" : undefined} underline={sel}>
                {sel ? "› " : "  "}{t("pick.custom")}  <Text dimColor>{t("pick.customHint")}</Text>
              </Text>
            );
          }
          const it = r.row!.item;
          return (
            <Box key={`r${absIdx}`}>
              <Text color={sel ? "#7C5CFF" : undefined} underline={sel}>{sel ? "› " : "  "}{itemLabel(it)}</Text>
              {it.example ? <Text color="#5fb8c8">{"  ("}{it.example}{")"}</Text> : null}
            </Box>
          );
        })}
        {(() => {
          if (curSel < 0) return null;
          const r = rows[curSel]!.row!;
          const desc = r.type === "item" ? itemDescription(r.item) : t("pick.customDesc");
          return <Text dimColor>{"› "}{desc}</Text>;
        })()}
      </Box>
    );
  }

  // ===== render: painel de edição do segmento =====
  const human = humanizeContent(content, catalogKey);
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="#7C5CFF" paddingX={1}>
      <Text bold color="#7C5CFF">{t("seg.title")}</Text>
      {onApplyToZone ? <Text color="#fbbf24">{t("seg.applyHint")}</Text> : null}

      {/* preview do segmento com o estilo atual (usa o valor-exemplo, não o código cru) */}
      <Box>
        <Text dimColor>{t("seg.preview")}</Text>
        <Text color={style.fg} backgroundColor={style.bg} bold={style.bold}
              underline={style.underscore} inverse={style.reverse} italic={style.italics}>
          {human.example || content || t("seg.empty")}
        </Text>
      </Box>

      {/* campo: conteúdo — agora mostra o NOME HUMANO + exemplo, e abre o seletor */}
      <Box>
        <Text color={field === "content" ? "#7C5CFF" : undefined}>{field === "content" ? "› " : "  "}{t("seg.shows")}</Text>
        {editingText
          ? <TextInput value={content} onChange={setContent} onSubmit={() => setEditingText(false)} />
          : (
            <Box>
              <Text color="#5fb8c8">{human.name}</Text>
              {human.example ? <Text dimColor>{"  (ex.: "}{human.example}{")"}</Text> : null}
              {field === "content" ? <Text color="#fbbf24">{t("seg.change")}</Text> : null}
            </Box>
          )}
      </Box>

      {/* fg / bg */}
      {(["fg", "bg"] as const).map((f) => (
        <Box key={f}>
          <Text color={field === f ? "#7C5CFF" : undefined}>{field === f ? "› " : "  "}{f === "fg" ? t("seg.fg") : t("seg.bg")}</Text>
          <Text color={style[f]} backgroundColor={f === "bg" ? style[f] : undefined}>
            {"  "}{SWATCHES[swatchIndex(style[f])]!.name}{"  "}
          </Text>
          <Text dimColor>{style[f] ?? t("seg.none")}</Text>
        </Box>
      ))}

      {/* atributos */}
      {(["bold", "dim", "underscore", "reverse", "italics"] as const).map((f) => (
        <Box key={f}>
          <Text color={field === f ? "#7C5CFF" : undefined}>{field === f ? "› " : "  "}{padLabel(f)}: </Text>
          <Text color={style[f] ? "#4ade80" : "gray"}>{style[f] ? t("attr.on") : t("attr.off")}</Text>
        </Box>
      ))}
    </Box>
  );
}

function padLabel(f: string): string {
  const map: Record<string, string> = {
    bold: t("attr.bold"), dim: t("attr.dim"), underscore: t("attr.underscore"),
    reverse: t("attr.reverse"), italics: t("attr.italics"),
  };
  return map[f] ?? f;
}
