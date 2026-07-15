// history.ts — backup + histórico de versões da statusline.
// Requisito do usuário: poder voltar ao estado anterior ou a QUALQUER versão anterior.
//
// Design (JSON-based, sem dependência de git):
// - backups/: cópia integral do ~/.tmux.conf ANTES de cada aplicação (timestamped).
// - history/: uma entrada por versão salva/aplicada — { id, ts, label, model, pinned }.
//   Restaurar uma versão = aplicá-la de novo, o que cria uma NOVA entrada (nunca destrói).
// - Guarda as N últimas não-fixadas (default 50) + todas as fixadas.

import fs from "node:fs";
import path from "node:path";
import type { StatusModel } from "@tse/shared";
import { backupsDir, historyDir, tmuxConfPath } from "./paths.js";

export interface HistoryEntry {
  id: string;            // ex.: 20260714-153012-123
  ts: string;            // ISO
  label: string;         // rótulo (auto ou do usuário)
  model: StatusModel;    // snapshot completo
  pinned: boolean;       // fixada = nunca podada
  backupFile?: string;   // nome do backup do .tmux.conf correspondente
}

const MAX_UNPINNED = 50;

function ensureDir(d: string) { fs.mkdirSync(d, { recursive: true }); }

function stamp(date: Date): string {
  const p = (n: number, l = 2) => String(n).padStart(l, "0");
  return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}-${p(date.getMilliseconds(), 3)}`;
}

/** Copia o ~/.tmux.conf atual para backups/ (antes de aplicar). Retorna o nome do arquivo (ou null se não existir). */
export function backupCurrentConf(now: Date): string | null {
  const conf = tmuxConfPath();
  if (!fs.existsSync(conf)) return null;
  ensureDir(backupsDir());
  const name = `tmux.conf.${stamp(now)}.bak`;
  fs.copyFileSync(conf, path.join(backupsDir(), name));
  return name;
}

/** Salva uma versão no histórico. Faz backup do conf junto. */
export function saveVersion(model: StatusModel, label: string, opts: { pinned?: boolean; now?: Date } = {}): HistoryEntry {
  const now = opts.now ?? new Date();
  ensureDir(historyDir());
  const backupFile = backupCurrentConf(now) ?? undefined;
  const entry: HistoryEntry = {
    id: stamp(now),
    ts: now.toISOString(),
    label: label || "sem rótulo",
    model,
    pinned: opts.pinned ?? false,
    backupFile,
  };
  fs.writeFileSync(path.join(historyDir(), `${entry.id}.json`), JSON.stringify(entry, null, 2), "utf8");
  prune();
  return entry;
}

/** Lista as versões, mais recentes primeiro. */
export function listVersions(): HistoryEntry[] {
  const dir = historyDir();
  if (!fs.existsSync(dir)) return [];
  const entries: HistoryEntry[] = [];
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".json")) continue;
    try { entries.push(JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as HistoryEntry); } catch { /* ignora corrompido */ }
  }
  return entries.sort((a, b) => (a.ts < b.ts ? 1 : -1));
}

export function getVersion(id: string): HistoryEntry | null {
  const p = path.join(historyDir(), `${id}.json`);
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, "utf8")) as HistoryEntry; } catch { return null; }
}

/** Fixa/desfixa uma versão (fixadas nunca são podadas). */
export function setPinned(id: string, pinned: boolean): boolean {
  const e = getVersion(id);
  if (!e) return false;
  e.pinned = pinned;
  fs.writeFileSync(path.join(historyDir(), `${id}.json`), JSON.stringify(e, null, 2), "utf8");
  return true;
}

/** Remove versões não-fixadas além das MAX_UNPINNED mais recentes. */
function prune(): void {
  const all = listVersions();
  const unpinned = all.filter((e) => !e.pinned);
  const toDelete = unpinned.slice(MAX_UNPINNED);
  for (const e of toDelete) {
    try { fs.rmSync(path.join(historyDir(), `${e.id}.json`)); } catch { /* ignore */ }
  }
}
