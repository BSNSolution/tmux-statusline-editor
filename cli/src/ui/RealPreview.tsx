// RealPreview.tsx — preview FIEL: pergunta ao tmux como ele realmente renderiza.
// Cada segmento é expandido individualmente via `tmux display-message -p` (valores reais:
// host, hora, sessão…), preservando o estilo do segmento. As abas iteram as janelas REAIS.
import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import type { Segment, StatusModel, TmuxStyle } from "@tse/shared";
import { listRealWindows, expandFormat, type RealWindow } from "../tmux.js";
import { exampleValue } from "./human.js";

/**
 * Expande um segmento para o preview. Scripts `#(...)` (kind "command") NÃO rodam via
 * `display-message -p` (o tmux só os executa no refresh real da barra) — então cai no
 * valor-exemplo do catálogo, para o preview não ficar em branco/enganoso.
 */
async function expandForPreview(s: Segment): Promise<string> {
  if (s.kind === "command" || s.content.includes("#(")) {
    return exampleValue(s);
  }
  const text = await expandFormat(s.content);
  return text || exampleValue(s);
}

function normalize(c?: string): string | undefined {
  if (!c || c === "default" || c === "terminal") return undefined;
  if (c.startsWith("#")) return c;
  if (/^colou?r\d+$/.test(c)) return undefined;
  return c;
}

/** Um pedaço já-expandido (texto real) + o estilo do segmento de origem. */
interface Chunk { key: string; text: string; style: TmuxStyle; }

function StyledChunk({ text, style }: { text: string; style: TmuxStyle }): React.ReactElement {
  // NÃO aplicamos dimColor: o tmux e o Ink escurecem "dim" de formas diferentes, o que
  // desalinha a cor. Como já temos o fg/bg exato, mostramos a cor pura (mais fiel).
  return (
    <Text color={normalize(style.fg)} backgroundColor={normalize(style.bg)} bold={style.bold}
          underline={style.underscore} inverse={style.reverse}
          italic={style.italics} strikethrough={style.strikethrough}>
      {text}
    </Text>
  );
}

export function RealPreview({ model }: { model: StatusModel }): React.ReactElement {
  const [windows, setWindows] = useState<RealWindow[]>([]);
  const [leftChunks, setLeftChunks] = useState<Chunk[]>([]);
  const [rightChunks, setRightChunks] = useState<Chunk[]>([]);
  const [winChunks, setWinChunks] = useState<Chunk[]>([]);

  // recomputa sempre que o model muda: expande cada segmento via tmux (valores reais)
  useEffect(() => {
    let alive = true;
    (async () => {
      const wins = await listRealWindows();
      const left = await expandSegments(model.left, "L");
      const right = await expandSegments(model.right, "R");
      // abas: para cada janela real, expande o format certo com #I/#W daquela janela
      const wc: Chunk[] = [];
      for (const [wi, w] of wins.entries()) {
        const segs = w.active ? model.windowCurrentFormat : model.windowFormat;
        for (const [si, s] of segs.entries()) {
          const content = s.content.split("#I").join(w.index).split("#W").join(w.name);
          const text = (s.kind === "command" || content.includes("#("))
            ? exampleValue(s)
            : (await expandFormat(content)) || exampleValue(s);
          wc.push({ key: `w${wi}s${si}`, text, style: s.style });
        }
      }
      if (alive) { setWindows(wins); setLeftChunks(left); setRightChunks(right); setWinChunks(wc); }
    })();
    return () => { alive = false; };
  }, [model]);

  const bg = normalize(model.options.style.bg);
  const fg = normalize(model.options.style.fg);

  // preenche o "vão" entre as abas e o status-right com o fundo geral, empurrando o right
  // para a ponta (como a barra real faz). Calcula pelo tamanho de texto de cada lado.
  const leftLen = textLen(leftChunks) + textLen(winChunks);
  const rightLen = textLen(rightChunks);
  const width = (process.stdout.columns ?? 120) - 4; // -bordas/padding
  const gap = Math.max(1, width - leftLen - rightLen);

  return (
    <Box borderStyle="single" borderColor="gray" paddingX={1} flexDirection="column">
      <Text dimColor>preview (como fica de verdade):</Text>
      <Box>
        <Text backgroundColor={bg} color={fg} wrap="truncate-end">
          {leftChunks.map((c) => <StyledChunk key={c.key} text={c.text} style={c.style} />)}
          {winChunks.map((c) => <StyledChunk key={c.key} text={c.text} style={c.style} />)}
          {windows.length === 0 ? <Text dimColor> (sem janelas) </Text> : null}
          <Text backgroundColor={bg}>{" ".repeat(gap)}</Text>
          {rightChunks.map((c) => <StyledChunk key={c.key} text={c.text} style={c.style} />)}
        </Text>
      </Box>
    </Box>
  );
}

/** Soma o comprimento visível (nº de caracteres) de uma lista de chunks. */
function textLen(chunks: Chunk[]): number {
  return chunks.reduce((n, c) => n + [...c.text].length, 0);
}

/** Expande cada segmento via tmux (valores reais), preservando o estilo. */
async function expandSegments(segs: Segment[], prefix: string): Promise<Chunk[]> {
  const out: Chunk[] = [];
  for (const [i, s] of segs.entries()) {
    const text = await expandForPreview(s);
    out.push({ key: `${prefix}${i}`, text, style: s.style });
  }
  return out;
}
