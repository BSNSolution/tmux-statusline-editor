// App.tsx — TUI principal do editor de statusline.
import React, { useEffect, useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import {
  CATALOG,
  segmentsToString,
  newId,
  type Segment,
  type StatusModel,
  type CatalogItem,
} from "@tse/shared";

/** Filtra o catálogo por texto (label/categoria/descrição/insert/exemplo). */
function filterCatalog(query: string): CatalogItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return CATALOG;
  return CATALOG.filter((it) =>
    it.label.toLowerCase().includes(q) ||
    it.category.toLowerCase().includes(q) ||
    it.description.toLowerCase().includes(q) ||
    it.insert.toLowerCase().includes(q) ||
    (it.example ?? "").toLowerCase().includes(q));
}
import { defaultModel, importFromServer, tmuxServerRunning, applyModel, detectThemeConflict, disableConflictingTheme } from "../tmux.js";
import { saveVersion, listVersions } from "../history.js";
import { RealPreview } from "./RealPreview.js";
import { EditSegment } from "./EditSegment.js";
import { EditOptions } from "./EditOptions.js";
import { humanName, exampleValue } from "./human.js";
import type { TmuxStyle } from "@tse/shared";

// nomes de cores comuns (hex → palavra) para exibir "roxo" em vez de "#552BD7".
const COLOR_NAMES: Record<string, string> = {
  "#552bd7": "roxo", "#7c5cff": "roxo claro", "#a48bff": "lilás", "#15161a": "charcoal",
  "#2a2c33": "grafite", "#2a2c34": "grafite", "#ffffff": "branco", "#9b988f": "cinza",
  "#7aa2f7": "azul", "#5fb8c8": "ciano", "#4ade80": "verde", "#fbbf24": "amarelo",
  "#ef4444": "vermelho", "#7b44ab": "roxo",
};
function colorWord(c?: string): string { if (!c) return ""; return COLOR_NAMES[c.toLowerCase()] ?? c; }
function hex(c?: string): string | undefined { return c && c.startsWith("#") ? c : (c && !/^colou?r/.test(c) ? c : undefined); }
function colorWords(s: { style: TmuxStyle }): string {
  const p: string[] = [];
  if (s.style.bg) p.push(`fundo ${colorWord(s.style.bg)}`);
  if (s.style.fg) p.push(`texto ${colorWord(s.style.fg)}`);
  if (s.style.bold) p.push("negrito");
  return p.join(" · ");
}

type Tab = "editor" | "historico" | "temas";
type Mode = "nav" | "add" | "edit" | "options";
type Zone = "left" | "right" | "windowFormat" | "windowCurrentFormat";
const ZONES: { key: Zone; label: string }[] = [
  { key: "left", label: "status-left" },
  { key: "windowFormat", label: "abas (outras)" },
  { key: "windowCurrentFormat", label: "aba atual" },
  { key: "right", label: "status-right" },
];

export function App(): React.ReactElement {
  const { exit } = useApp();
  const [model, setModel] = useState<StatusModel | null>(null);
  const [tab, setTab] = useState<Tab>("editor");
  const [zoneIdx, setZoneIdx] = useState(0);
  const [segIdx, setSegIdx] = useState(0);
  const [mode, setMode] = useState<"nav" | "add" | "edit" | "options">("nav");
  const [addIdx, setAddIdx] = useState(0);
  const [addQuery, setAddQuery] = useState("");   // busca na tela de adicionar
  const [status, setStatus] = useState("");
  const [themeConflict, setThemeConflict] = useState(false);
  const [copiedStyle, setCopiedStyle] = useState<TmuxStyle | null>(null);

  const zone = ZONES[zoneIdx]!.key;

  // carrega o model inicial (do tmux ao vivo, ou default)
  useEffect(() => {
    (async () => {
      if (await tmuxServerRunning()) {
        try { setModel(await importFromServer()); setStatus("Importado do tmux ao vivo."); return; } catch { /* fallthrough */ }
      }
      setModel(defaultModel());
      setStatus("Sem servidor tmux — carregado padrão.");
    })();
    // detecta plugin de tema que rouba a statusline (tokyo-night etc.)
    setThemeConflict(detectThemeConflict().present);
  }, []);

  const segs = model ? model[zone] : [];

  function updateZone(next: Segment[]) {
    if (!model) return;
    setModel({ ...model, [zone]: next });
  }

  useInput((input, key) => {
    if (!model) return;

    // durante a edição de segmento/opções, os painéis cuidam do teclado — não interferir.
    if (mode === "edit" || mode === "options") return;

    if (mode === "add") {
      const filtered = filterCatalog(addQuery);
      if (key.escape) {
        if (addQuery) { setAddQuery(""); setAddIdx(0); return; }  // 1º Esc limpa a busca
        setMode("nav"); return;                                   // 2º Esc fecha
      }
      if (key.upArrow) { setAddIdx((i) => Math.max(0, i - 1)); return; }
      if (key.downArrow) { setAddIdx((i) => Math.min(Math.max(0, filtered.length - 1), i + 1)); return; }
      if (key.return) {
        const item = filtered[Math.min(addIdx, filtered.length - 1)];
        if (!item) return;   // nada encontrado
        const seg: Segment = {
          id: newId(), kind: item.kind ?? "format", content: item.insert,
          style: { ...(segs[segIdx]?.style ?? {}) }, label: item.label, catalogKey: item.key,
          opaque: item.kind === "command" || item.kind === "conditional",
        };
        const next = [...segs]; next.splice(segIdx + 1, 0, seg);
        updateZone(next); setSegIdx(segIdx + 1); setMode("nav");
        setStatus(`Adicionado: ${item.label}`);
        return;
      }
      // digitação = busca
      if (key.backspace || key.delete) { setAddQuery((q) => q.slice(0, -1)); setAddIdx(0); return; }
      if (input && !key.ctrl && !key.meta && input.length === 1 && input >= " ") {
        setAddQuery((q) => q + input); setAddIdx(0); return;
      }
      return;
    }

    // modo navegação
    if (input === "q") { exit(); return; }
    if (key.tab) { setTab((t) => (t === "editor" ? "historico" : t === "historico" ? "temas" : "editor")); return; }
    if (input === "h") { setTab("historico"); return; }
    if (input === "t") { setTab("temas"); return; }
    // "e" fora do editor volta pro editor; dentro do editor, edita o segmento (tratado abaixo)
    if (input === "e" && tab !== "editor") { setTab("editor"); return; }

    if (tab !== "editor") return;

    if (key.leftArrow) { setZoneIdx((i) => Math.max(0, i - 1)); setSegIdx(0); return; }
    if (key.rightArrow) { setZoneIdx((i) => Math.min(ZONES.length - 1, i + 1)); setSegIdx(0); return; }
    // mover o item na ordem da barra: Shift+↑/↓ OU as teclas , / . (mnemônico < >).
    // Shift+seta nem sempre chega em todos os terminais/tmux — por isso as letras como alternativa.
    if ((key.upArrow && key.shift) || input === "," || input === "<") { moveSeg(-1); return; }
    if ((key.downArrow && key.shift) || input === "." || input === ">") { moveSeg(1); return; }
    if (key.upArrow) { setSegIdx((i) => Math.max(0, i - 1)); return; }
    if (key.downArrow) { setSegIdx((i) => Math.min(segs.length - 1, i + 1)); return; }
    if (input === "a") { setMode("add"); setAddIdx(0); setAddQuery(""); return; }
    if (input === "d") { duplicateSeg(); return; }   // d = duplicar
    if (input === "r") { removeSeg(); return; }      // r = remover
    if (input === "e") { if (segs[segIdx]) setMode("edit"); return; }  // editar segmento atual
    if (input === "g") { setMode("options"); return; }                 // editar opções gerais (fundo geral etc.)
    if (input === "c") {                                               // copiar cores/estilo do segmento atual
      if (segs[segIdx]) { setCopiedStyle({ ...segs[segIdx]!.style }); setStatus("Cores copiadas — vá noutro item e tecle 'v' para colar (V cola na aba inteira)."); }
      return;
    }
    if (input === "v" && copiedStyle) {                                // colar no segmento atual
      const arr = [...segs]; arr[segIdx] = { ...arr[segIdx]!, style: { ...copiedStyle } };
      updateZone(arr); setStatus("Cores coladas neste item (Enter aplica no tmux).");
      return;
    }
    if (input === "V" && copiedStyle) {                                // colar na zona/aba inteira
      updateZone(segs.map((s) => ({ ...s, style: { ...copiedStyle } })));
      setStatus("Cores coladas na aba/zona inteira (Enter aplica no tmux).");
      return;
    }
    if (input === "l") {                                              // l = limpar/resetar cores da zona atual
      updateZone(segs.map((s) => ({ ...s, style: {} })));             // remove todos os fg/bg/attrs
      setStatus("Cores da zona limpas (fundo/texto padrão). Enter aplica no tmux.");
      return;
    }
    if (input === "x" && themeConflict) {                              // desativar plugin de tema conflitante
      const n = disableConflictingTheme();
      setThemeConflict(false);
      setStatus(n > 0 ? `Tema conflitante desativado (${n} linha(s) comentadas). Agora aplique (Enter) — suas edições vão pegar.` : "Nenhuma linha de tema encontrada.");
      return;
    }
    if (key.return) { void doApply(); return; }
  });

  function saveEditedSegment(next: Segment) {
    const arr = [...segs]; arr[segIdx] = next;
    updateZone(arr); setMode("nav");
    setStatus("Segmento editado (Enter aplica no tmux).");
  }
  function applyStyleToZone(style: import("@tse/shared").TmuxStyle) {
    // aplica fg/bg/atributos a TODOS os segmentos da zona (mantém o conteúdo de cada um)
    const arr = segs.map((s) => ({ ...s, style: { ...style } }));
    updateZone(arr); setMode("nav");
    setStatus("Estilo aplicado à zona inteira (Enter aplica no tmux).");
  }
  function saveOptions(next: StatusModel["options"]) {
    if (!model) return;
    setModel({ ...model, options: next }); setMode("nav");
    setStatus("Opções gerais editadas (Enter aplica no tmux).");
  }

  function moveSeg(dir: number) {
    const j = segIdx + dir;
    if (j < 0 || j >= segs.length) { setStatus(dir < 0 ? "Já é o primeiro item." : "Já é o último item."); return; }
    const next = [...segs];
    const tmp = next[segIdx]!; next[segIdx] = next[j]!; next[j] = tmp;
    updateZone(next); setSegIdx(j);
    setStatus(`Item movido ${dir < 0 ? "◀ para trás" : "para frente ▶"} (Enter aplica no tmux).`);
  }
  function removeSeg() {
    if (segs.length === 0) return;
    const next = segs.filter((_, i) => i !== segIdx);
    updateZone(next); setSegIdx(Math.max(0, segIdx - 1));
    setStatus("Segmento removido.");
  }
  function duplicateSeg() {
    const cur = segs[segIdx];
    if (!cur) return;
    const copy: Segment = { ...cur, id: newId(), style: { ...cur.style } };
    const next = [...segs]; next.splice(segIdx + 1, 0, copy);
    updateZone(next); setSegIdx(segIdx + 1);
    setStatus(`Item duplicado: ${humanName(cur)} (Enter aplica no tmux).`);
  }
  async function doApply() {
    if (!model) return;
    // Se algum segmento usa segundos (%S) mas o refresh é > 1s, os segundos "pulam".
    // Ajusta status-interval p/ 1 automaticamente (senão o relógio de segundos não anda).
    let m = model;
    let secNote = "";
    const usesSeconds = allSegments(m).some((s) => s.content.includes("%S"));
    if (usesSeconds && m.options.interval > 1) {
      m = { ...m, options: { ...m.options, interval: 1 } };
      setModel(m);
      secNote = " (ajustei o refresh p/ 1s por causa dos segundos)";
    }
    saveVersion(m, `edição ${new Date().toLocaleTimeString("pt-BR")}`);
    const r = await applyModel(m);
    setStatus((r.sourced ? "✓ Aplicado no tmux ao vivo (+ versão salva)." : "✓ Escrito no ~/.tmux.conf (+ versão salva). Sem servidor p/ recarregar.") + secNote);
  }

  if (!model) return <Text>Carregando…</Text>;

  return (
    <Box flexDirection="column" width="100%">
      <Header tab={tab} />
      {themeConflict && (
        <Box borderStyle="round" borderColor="#fbbf24" paddingX={1}>
          <Text color="#fbbf24">⚠ Um tema (ex.: tokyo-night) controla sua statusline e sobrepõe as edições. </Text>
          <Text bold color="#fbbf24">Tecle "x" para o editor assumir o controle</Text>
          <Text color="#fbbf24"> (revertível, com backup).</Text>
        </Box>
      )}
      {tab === "editor" && mode === "edit" && segs[segIdx] && (
        <EditSegment seg={segs[segIdx]!} onSave={saveEditedSegment} onCancel={() => setMode("nav")} onApplyToZone={applyStyleToZone} />
      )}
      {tab === "editor" && mode === "options" && (
        <EditOptions model={model} onSave={saveOptions} onCancel={() => setMode("nav")} />
      )}
      {tab === "editor" && mode !== "edit" && mode !== "options" && (
        <EditorView model={model} zone={zone} segs={segs} segIdx={segIdx} mode={mode} addIdx={addIdx} addQuery={addQuery} />
      )}
      {tab === "historico" && <HistoryView />}
      {tab === "temas" && <ThemesView />}
      <Footer status={status} tab={tab} mode={mode} />
    </Box>
  );
}

function Header({ tab }: { tab: Tab }) {
  return (
    <Box borderStyle="round" borderColor="#7C5CFF" paddingX={1} justifyContent="space-between">
      <Text bold color="#7C5CFF">tmux statusline editor</Text>
      <Text>
        {(["editor", "historico", "temas"] as Tab[]).map((t) => (
          <Text key={t} color={t === tab ? "#a48bff" : "gray"} bold={t === tab}> {t} </Text>
        ))}
      </Text>
    </Box>
  );
}

function EditorView({ model, zone, segs, segIdx, mode, addIdx, addQuery }: {
  model: StatusModel; zone: Zone; segs: Segment[]; segIdx: number; mode: Mode; addIdx: number; addQuery: string;
}) {
  return (
    <Box flexDirection="column">
      {/* preview FIEL — expande via tmux com as janelas/valores reais */}
      <RealPreview model={model} />

      <Box>
        <Text dimColor>parte da barra: </Text>
        {ZONES.map((z) => (
          <Text key={z.key} bold={z.key === zone} color={z.key === zone ? "#a48bff" : "gray"}> {z.key === zone ? "▸" : " "}{z.label} </Text>
        ))}
      </Box>

      {/* lista de segmentos da zona atual — linguagem humana + valor + amostra de cor */}
      <Box flexDirection="column" borderStyle="single" borderColor="#2A2C33" paddingX={1}>
        {segs.length === 0 && <Text dimColor>(vazio — tecle "a" para adicionar um item)</Text>}
        {segs.map((s, i) => {
          const sel = i === segIdx;
          return (
            <Text key={s.id}>
              {/* marcador de seleção (não usa inverse, p/ não estragar a amostra de cor) */}
              <Text color="#a48bff" bold>{sel ? "› " : "  "}</Text>
              {/* amostra da cor REAL do item — nunca invertida */}
              <Text color={hex(s.style.fg)} backgroundColor={hex(s.style.bg)} bold={s.style.bold}> {exampleValue(s) || " "} </Text>
              {"  "}
              {/* só o NOME recebe o destaque de seleção */}
              <Text bold color={sel ? "#a48bff" : undefined} underline={sel}>{humanName(s)}</Text>
              <Text dimColor>  {colorWords(s)}</Text>
            </Text>
          );
        })}
      </Box>

      {mode === "add" && (() => {
        const filtered = filterCatalog(addQuery);
        const cur = Math.min(addIdx, Math.max(0, filtered.length - 1));
        return (
          <Box flexDirection="column" borderStyle="round" borderColor="#7C5CFF" paddingX={1}>
            <Text bold color="#7C5CFF">O que você quer mostrar aqui?  (digite p/ buscar · ↑/↓ escolhe · Enter adiciona · Esc cancela)</Text>
            <Box>
              <Text color="#fbbf24">buscar: </Text>
              <Text>{addQuery || <Text dimColor>(digite… ex.: "git", "bateria", "hora", "claude", "ícone")</Text>}</Text>
              {addQuery ? <Text dimColor>{"   "}{filtered.length} resultado(s) · Esc limpa</Text> : null}
            </Box>
            {filtered.length === 0 && <Text color="#ef4444">Nada encontrado para "{addQuery}". Apague p/ ver tudo.</Text>}
            {windowAround(filtered, cur, 8).map(({ item, idx }) => (
              <Text key={item.key} color={idx === cur ? "#7C5CFF" : undefined} underline={idx === cur}>
                {idx === cur ? "› " : "  "}
                <Text bold>{item.label}</Text>
                {item.example ? <Text color="#5fb8c8">  → mostra "{item.example}"</Text> : null}
                <Text dimColor>   ({item.category})</Text>
              </Text>
            ))}
            <Text dimColor>{"  "}{filtered[cur]?.description ?? ""}</Text>
          </Box>
        );
      })()}
    </Box>
  );
}

function HistoryView() {
  const versions = listVersions();
  return (
    <Box flexDirection="column" borderStyle="single" borderColor="#2A2C33" paddingX={1}>
      <Text bold color="#a48bff">Histórico de versões</Text>
      {versions.length === 0 && <Text dimColor>(nenhuma versão salva ainda — aplique uma edição)</Text>}
      {versions.slice(0, 15).map((v) => (
        <Text key={v.id}>
          <Text color="#7aa2f7">{v.id}</Text>  {v.pinned ? "📌" : "  "} <Text>{truncate(v.label, 40)}</Text>
        </Text>
      ))}
      <Text dimColor>{versions.length} versão(ões). (restaurar/pin vem no próximo passo)</Text>
    </Box>
  );
}

function ThemesView() {
  return (
    <Box flexDirection="column" borderStyle="single" borderColor="#2A2C33" paddingX={1}>
      <Text bold color="#a48bff">Temas</Text>
      <Text dimColor>(galeria de temas — em construção)</Text>
    </Box>
  );
}

function Footer({ status, tab, mode }: { status: string; tab: Tab; mode: Mode }) {
  const help = mode === "add"
    ? "digite p/ buscar · ↑/↓ escolher · Enter adicionar · Esc limpa/cancela"
    : mode === "edit" || mode === "options"
      ? "↑/↓ campo · ←/→ valor · Enter salva · Esc cancela"
      : tab === "editor"
        ? "←/→ parte · ↑/↓ item · , / . mover · a adicionar · d duplicar · r remover · e editar · c/v/V copiar/colar cor · l limpar cores · g fundo geral · Enter aplicar · q sair"
        : "Tab volta ao editor · q sai";
  return (
    <Box flexDirection="column" paddingX={1}>
      {status ? <Text color="#5fb8c8">{status}</Text> : null}
      <Text dimColor>{help}</Text>
    </Box>
  );
}

// helpers de UI
function allSegments(m: StatusModel): Segment[] {
  return [...m.left, ...m.right, ...m.windowFormat, ...m.windowCurrentFormat];
}
function truncate(s: string, n: number): string { return s.length > n ? s.slice(0, n - 1) + "…" : s; }
function styleHint(s: Segment): string {
  const p: string[] = [];
  if (s.style.fg) p.push(`fg:${s.style.fg}`);
  if (s.style.bg) p.push(`bg:${s.style.bg}`);
  if (s.style.bold) p.push("bold");
  return p.join(" ");
}
function windowAround<T>(arr: T[], center: number, size: number): { item: T; idx: number }[] {
  const half = Math.floor(size / 2);
  let start = Math.max(0, center - half);
  const end = Math.min(arr.length, start + size);
  start = Math.max(0, end - size);
  const out: { item: T; idx: number }[] = [];
  for (let i = start; i < end; i++) out.push({ item: arr[i]!, idx: i });
  return out;
}
