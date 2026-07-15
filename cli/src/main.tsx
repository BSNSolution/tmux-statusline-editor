#!/usr/bin/env node
// main.tsx — ponto de entrada da CLI. Sobe a TUI (Ink) ou trata flags/subcomandos.
import React from "react";
import { render } from "ink";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { App } from "./ui/App.js";
import { tmuxAvailable } from "./tmux.js";
import { findThemeLines, disableThemes, enableThemes, reloadClean } from "./themes-cli.js";
import { t, setLang, getLang, type Lang } from "@tse/shared";

// scripts/ fica ao lado do dist/ (cli/scripts/). __dirname = cli/dist.
const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPTS = resolve(HERE, "..", "scripts");
function script(name: string): string { return resolve(SCRIPTS, name); }

async function run() {
  const argv = process.argv.slice(2);

  // --lang en|pt força o idioma (senão detecta do sistema; padrão inglês)
  const langIdx = argv.findIndex((a) => a === "--lang");
  if (langIdx >= 0 && argv[langIdx + 1]) setLang(argv[langIdx + 1] as Lang);
  // remove "--lang" e seu valor; sem --lang, langIdx=-1 e nada é removido indevidamente
  const langValIdx = langIdx >= 0 ? langIdx + 1 : -1;
  const argvClean = argv.filter((a, i) => a !== "--lang" && i !== langValIdx);
  const cmd = argvClean[0];

  if (argvClean.includes("--version") || argvClean.includes("-v")) {
    console.log("tmux-statusline 0.1.0");
    return;
  }
  if (argvClean.includes("--help") || argvClean.includes("-h") || cmd === "help") {
    const help = getLang() === "pt"
      ? `${t("cli.desc")}

Uso:
  tmux-statusline               abre o editor (TUI)
  tmux-statusline doctor        verifica dependências (tmux, node, Nerd Font, plugin…)
  tmux-statusline doctor --fix  instala o que faltar (macOS/Linux)
  tmux-statusline agent-tabs    liga o indicador do Claude Code nas abas (daemon)
  tmux-statusline agent-tabs stop   desliga o daemon
  tmux-statusline --list-themes / --disable-themes / --enable-themes
  tmux-statusline --lang en|pt  força o idioma (padrão: idioma do sistema, senão inglês)
  tmux-statusline --version · --help

Teclas no editor: setas navegam · , / . (ou Shift+↑/↓) movem o item · a adiciona · d duplica ·
  r remove · l limpa cores · e edita (biblioteca buscável) · Enter aplica · Tab troca de aba · q sai.
`
      : `${t("cli.desc")}

Usage:
  tmux-statusline               open the editor (TUI)
  tmux-statusline doctor        check dependencies (tmux, node, Nerd Font, plugin…)
  tmux-statusline doctor --fix  install what's missing (macOS/Linux)
  tmux-statusline agent-tabs    turn on the Claude Code indicator in tabs (daemon)
  tmux-statusline agent-tabs stop   turn off the daemon
  tmux-statusline --list-themes / --disable-themes / --enable-themes
  tmux-statusline --lang en|pt  force the language (default: system language, else English)
  tmux-statusline --version · --help

Editor keys: arrows navigate · , / . (or Shift+↑/↓) move the item · a add · d duplicate ·
  r remove · l clear colors · e edit (searchable library) · Enter apply · Tab switch tab · q quit.
`;
    console.log(help);
    return;
  }

  // --- doctor: verifica/instala dependências (app autossuficiente) ---
  if (cmd === "doctor") {
    const args = argv.slice(1);
    const r = spawnSync("bash", [script("doctor.sh"), ...args], { stdio: "inherit" });
    process.exit(r.status ?? 0);
  }

  // --- agent-tabs: liga/desliga o daemon do indicador do Claude nas abas ---
  if (cmd === "agent-tabs") {
    const sub = argvClean[1];
    // instala/remove os hooks do Claude Code (estado preciso por painel)
    if (argvClean.includes("--install-hooks")) {
      const r = spawnSync("python3", [script("install-hooks.py"), script("agent-hook.sh"), "install"], { stdio: "inherit" });
      process.exit(r.status ?? 0);
    }
    if (argvClean.includes("--uninstall-hooks")) {
      const r = spawnSync("python3", [script("install-hooks.py"), script("agent-hook.sh"), "uninstall"], { stdio: "inherit" });
      process.exit(r.status ?? 0);
    }
    if (argvClean.includes("--hooks-status")) {
      const r = spawnSync("python3", [script("install-hooks.py"), script("agent-hook.sh"), "status"], { stdio: "inherit" });
      process.exit(r.status ?? 0);
    }
    if (sub === "stop") {
      spawnSync("pkill", ["-f", "agent-tabs-daemon.sh"], { stdio: "ignore" });
      console.log(t("agentTabs.off"));
      return;
    }
    spawnSync("pkill", ["-f", "agent-tabs-daemon.sh"], { stdio: "ignore" });
    const child = spawn("sh", [script("agent-tabs-daemon.sh"), sub ?? "2"], {
      detached: true, stdio: "ignore",
    });
    child.unref();
    console.log(t("agentTabs.on"));
    console.log(t("agentTabs.hint"));
    console.log(t("agentTabs.off.hint"));
    return;
  }

  // --- gestão de temas por linha de comando (sem TUI) ---
  const pt = getLang() === "pt";
  if (argvClean.includes("--list-themes")) {
    const lines = findThemeLines();
    if (lines.length === 0) { console.log(pt ? "Nenhum tema de statusline ativo no ~/.tmux.conf." : "No active status-line theme in ~/.tmux.conf."); return; }
    console.log(pt ? "Temas/plugins de statusline ATIVOS:" : "ACTIVE status-line themes/plugins:");
    for (const l of lines) console.log(`  L${l.n}: ${l.text}`);
    return;
  }
  if (argvClean.includes("--disable-themes")) {
    const { disabled, backupFile } = disableThemes();
    console.log(disabled > 0
      ? (pt
          ? `✓ ${disabled} linha(s) de tema desativadas e salvas em:\n  ${backupFile}\n  (reative com: tmux-statusline --enable-themes)`
          : `✓ ${disabled} theme line(s) disabled and saved to:\n  ${backupFile}\n  (re-enable with: tmux-statusline --enable-themes)`)
      : (pt ? "Nenhum tema para desativar." : "No theme to disable."));
    const msg = await reloadClean({ hard: argvClean.includes("--hard") });
    console.log("  " + msg);
    return;
  }
  if (argvClean.includes("--enable-themes")) {
    const n = enableThemes();
    console.log(n > 0
      ? (pt
          ? `✓ ${n} linha(s) de tema reativadas no ~/.tmux.conf. Recarregue o tmux (prefixo + r ou reinicie).`
          : `✓ ${n} theme line(s) re-enabled in ~/.tmux.conf. Reload tmux (prefix + r or restart).`)
      : (pt ? "Nenhum tema desativado para reativar." : "No disabled theme to re-enable."));
    return;
  }

  if (!(await tmuxAvailable())) {
    console.error(t("cli.tmuxMissing"));
    process.exit(1);
  }

  render(<App />);
}

run().catch((e) => { console.error(e); process.exit(1); });
