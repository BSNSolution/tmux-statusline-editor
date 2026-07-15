// EditOptions.tsx — edita as OPÇÕES GERAIS da statusline (não-segmento):
// fundo geral (status-style bg/fg), posição, justify, intervalo, comprimentos.
// É aqui que se muda a "cor de fundo geral" (#9b988f/status-style) que não pertence a nenhum segmento.
import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import type { StatusModel, TmuxStyle } from "@tse/shared";

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
function swatchIndex(hex?: string): number {
  const i = SWATCHES.findIndex((s) => s.hex.toLowerCase() === (hex ?? "").toLowerCase());
  return i >= 0 ? i : 0;
}

type Field = "bg" | "fg" | "position" | "justify" | "interval" | "leftLen" | "rightLen";
const FIELDS: Field[] = ["bg", "fg", "position", "justify", "interval", "leftLen", "rightLen"];

export function EditOptions({ model, onSave, onCancel }: {
  model: StatusModel;
  onSave: (next: StatusModel["options"]) => void;
  onCancel: () => void;
}): React.ReactElement {
  const [opt, setOpt] = useState<StatusModel["options"]>({ ...model.options, style: { ...model.options.style } });
  const [fieldIdx, setFieldIdx] = useState(0);
  const field = FIELDS[fieldIdx]!;

  useInput((_input, key) => {
    if (key.escape) { onCancel(); return; }
    if (key.return) { onSave(opt); return; }
    if (key.upArrow) { setFieldIdx((i) => Math.max(0, i - 1)); return; }
    if (key.downArrow) { setFieldIdx((i) => Math.min(FIELDS.length - 1, i + 1)); return; }

    const dir = key.leftArrow ? -1 : key.rightArrow ? 1 : 0;
    if (dir === 0) return;

    if (field === "bg" || field === "fg") {
      const cur = swatchIndex(opt.style[field]);
      const j = (cur + dir + SWATCHES.length) % SWATCHES.length;
      setOpt({ ...opt, style: { ...opt.style, [field]: SWATCHES[j]!.hex || undefined } as TmuxStyle });
    } else if (field === "position") {
      setOpt({ ...opt, position: opt.position === "bottom" ? "top" : "bottom" });
    } else if (field === "justify") {
      const order: StatusModel["options"]["justify"][] = ["left", "centre", "right"];
      const cur = order.indexOf(opt.justify);
      setOpt({ ...opt, justify: order[(cur + dir + order.length) % order.length]! });
    } else if (field === "interval") {
      setOpt({ ...opt, interval: Math.max(0, opt.interval + dir) });
    } else if (field === "leftLen") {
      setOpt({ ...opt, leftLength: Math.max(0, opt.leftLength + dir * 5) });
    } else if (field === "rightLen") {
      setOpt({ ...opt, rightLength: Math.max(0, opt.rightLength + dir * 5) });
    }
  });

  const row = (f: Field, label: string, value: React.ReactNode) => (
    <Box>
      <Text inverse={field === f}>{field === f ? "› " : "  "}{label}: </Text>
      {value}
    </Box>
  );

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="#7C5CFF" paddingX={1}>
      <Text bold color="#7C5CFF">Opções gerais da barra — ↑/↓ campo · ←/→ valor · Enter salva · Esc cancela</Text>
      <Box>
        <Text dimColor>preview do fundo: </Text>
        <Text backgroundColor={opt.style.bg} color={opt.style.fg}>  exemplo de texto na barra  </Text>
      </Box>
      {row("bg", "Cor de fundo GERAL (bg)",
        <Text backgroundColor={opt.style.bg}>{"  "}{SWATCHES[swatchIndex(opt.style.bg)]!.name}{"  "}</Text>)}
      {row("fg", "Cor de texto GERAL (fg)",
        <Text color={opt.style.fg}>{SWATCHES[swatchIndex(opt.style.fg)]!.name} {opt.style.fg ?? ""}</Text>)}
      {row("position", "Posição", <Text color="#5fb8c8">{opt.position === "bottom" ? "embaixo" : "em cima"}</Text>)}
      {row("justify", "Alinhamento", <Text color="#5fb8c8">{opt.justify}</Text>)}
      {row("interval", "Atualizar a cada (s)", <Text color="#5fb8c8">{opt.interval}s</Text>)}
      {row("leftLen", "Tam. máx. esquerda", <Text color="#5fb8c8">{opt.leftLength}</Text>)}
      {row("rightLen", "Tam. máx. direita", <Text color="#5fb8c8">{opt.rightLength}</Text>)}
      <Text dimColor>dica: aqui muda o fundo da barra inteira (o #9b988f / status-style).</Text>
    </Box>
  );
}
