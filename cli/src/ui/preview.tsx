// preview.tsx — renderiza segmentos como texto colorido do Ink, usando VALORES DE EXEMPLO
// (não os tokens crus) para que o preview PAREÇA o resultado final. Roda no terminal → fonte real.
import React from "react";
import { Text } from "ink";
import type { Segment, TmuxStyle } from "@tse/shared";
import { exampleValue } from "./human.js";

/** Converte cor tmux para algo que o Ink entende (hex e nomes básicos; colourN cai sem cor). */
function normalize(c?: string): string | undefined {
  if (!c || c === "default" || c === "terminal") return undefined;
  if (c.startsWith("#")) return c;
  if (/^colou?r\d+$/.test(c)) return undefined;
  return c;
}

export function StyledSegment({ seg }: { seg: Segment }): React.ReactElement {
  const st: TmuxStyle = seg.style;
  return (
    <Text
      color={normalize(st.fg)}
      backgroundColor={normalize(st.bg)}
      bold={st.bold}
      dimColor={st.dim}
      underline={st.underscore}
      inverse={st.reverse}
      italic={st.italics}
      strikethrough={st.strikethrough}
    >
      {exampleValue(seg)}
    </Text>
  );
}

export function PreviewLine({ segments }: { segments: Segment[] }): React.ReactElement {
  return (
    <Text>
      {segments.map((s) => (
        <StyledSegment key={s.id} seg={s} />
      ))}
    </Text>
  );
}
