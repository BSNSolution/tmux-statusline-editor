// roundtrip.test.ts — garante que parse -> gerar -> parse é estável (semanticamente igual).
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseStatusString } from "./parser.js";
import { segmentsToString } from "./generator.js";
import { resetIdCounter, type Segment } from "./model.js";

/** Compara segmentos ignorando o id (que é gerado). */
function stripIds(segs: Segment[]) {
  return segs.map((s) => ({ kind: s.kind, content: s.content, style: s.style }));
}

const CASES: string[] = [
  // sua status-left real (powerline)
  '#[bg=#7b44ab,fg=#ffffff,bold] #S #[bg=#15161A,fg=#7b44ab]',
  // sua status-right real (widget custom + host + hora)
  '#{agent_indicator} #[fg=#5fb8c8]#h #[fg=#9b988f]· %H:%M ',
  // window-status-current real
  '#[bg=#2a2c34,fg=#a48bff,bold] #I:#W #[default]',
  // condicional + prefixo (tokyo-night)
  '#[fg=#2A2F41,bg=#7aa2f7,bold] #{?client_prefix,󰠠 ,#[dim]󰤂 }#[bold,nodim]#[fg=#7aa2f7,bg=#15161A]',
  // script aninhado com #{...} dentro do #(...)
  '#(/Users/x/.tmux/plugins/tokyo-night-tmux/src/path-widget.sh #{pane_current_path})#[fg=#7aa2f7,bg=#1A1B26] 󰃭 %d/%m/%Y %H:%M:%S ',
  // literal com ## e texto simples
  'CPU: ##1 #[fg=red]load %H:%M',
];

for (const [idx, raw] of CASES.entries()) {
  test(`round-trip estável #${idx}`, () => {
    resetIdCounter();
    const a = parseStatusString(raw);
    const regen = segmentsToString(a);
    resetIdCounter();
    const b = parseStatusString(regen);
    assert.deepEqual(stripIds(b), stripIds(a), `caso ${idx}\n  raw:   ${raw}\n  regen: ${regen}`);
  });
}

test("estilo powerline é preservado (fg/bg)", () => {
  resetIdCounter();
  const segs = parseStatusString('#[bg=#7b44ab,fg=#ffffff,bold] #S #[bg=#15161A,fg=#7b44ab]');
  // primeiro segmento de conteúdo (" #S ") deve ter bg roxo, fg branco, bold
  const withContent = segs.find((s) => s.content.includes("#S"));
  assert.ok(withContent, "achou o segmento #S");
  assert.equal(withContent!.style.bg, "#7b44ab");
  assert.equal(withContent!.style.fg, "#ffffff");
  assert.equal(withContent!.style.bold, true);
});

test("comando #(...) com #{...} aninhado fica opaco e inteiro", () => {
  resetIdCounter();
  const segs = parseStatusString('#(script.sh #{pane_current_path})');
  const cmd = segs.find((s) => s.kind === "command");
  assert.ok(cmd, "achou o comando");
  assert.equal(cmd!.content, '#(script.sh #{pane_current_path})');
  assert.equal(cmd!.opaque, true);
});
