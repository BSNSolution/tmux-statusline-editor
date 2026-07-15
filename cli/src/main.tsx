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

// scripts/ fica ao lado do dist/ (cli/scripts/). __dirname = cli/dist.
const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPTS = resolve(HERE, "..", "scripts");
function script(name: string): string { return resolve(SCRIPTS, name); }

async function run() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];

  if (argv.includes("--version") || argv.includes("-v")) {
    console.log("tmux-statusline 0.1.0");
    return;
  }
  if (argv.includes("--help") || argv.includes("-h") || cmd === "help") {
    console.log(`tmux-statusline — editor visual da statusline do tmux

Uso:
  tmux-statusline               abre o editor (TUI)
  tmux-statusline doctor        verifica dependências (tmux, node, Nerd Font, plugin…)
  tmux-statusline doctor --fix  instala o que faltar (macOS/Linux)
  tmux-statusline agent-tabs    liga o indicador do Claude Code nas abas (daemon)
  tmux-statusline agent-tabs stop   desliga o daemon
  tmux-statusline --list-themes / --disable-themes / --enable-themes
  tmux-statusline --version · --help

Teclas no editor: setas navegam · , / . (ou Shift+↑/↓) movem o item · a adiciona · d duplica ·
  r remove · l limpa cores · e edita (biblioteca buscável) · Enter aplica · Tab troca de aba · q sai.
`);
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
    const sub = argv[1];
    if (sub === "stop") {
      spawnSync("pkill", ["-f", "agent-tabs-daemon.sh"], { stdio: "ignore" });
      console.log("✓ indicador do Claude nas abas: desligado.");
      return;
    }
    // liga em background (destacado do processo atual)
    spawnSync("pkill", ["-f", "agent-tabs-daemon.sh"], { stdio: "ignore" });
    const child = spawn("sh", [script("agent-tabs-daemon.sh"), sub ?? "2"], {
      detached: true, stdio: "ignore",
    });
    child.unref();
    console.log("✓ indicador do Claude nas abas: ligado (daemon em background).");
    console.log("  adicione #{@agent_icon} no seu window-status-format para ver o ícone.");
    console.log("  desligar: tmux-statusline agent-tabs stop");
    return;
  }

  // --- gestão de temas por linha de comando (sem TUI) ---
  if (argv.includes("--list-themes")) {
    const lines = findThemeLines();
    if (lines.length === 0) { console.log("Nenhum tema de statusline ativo no ~/.tmux.conf."); return; }
    console.log("Temas/plugins de statusline ATIVOS:");
    for (const l of lines) console.log(`  L${l.n}: ${l.text}`);
    return;
  }
  if (argv.includes("--disable-themes")) {
    const { disabled, backupFile } = disableThemes();
    console.log(disabled > 0
      ? `✓ ${disabled} linha(s) de tema desativadas e salvas em:\n  ${backupFile}\n  (reative com: tmux-statusline --enable-themes)`
      : "Nenhum tema para desativar.");
    const msg = await reloadClean({ hard: argv.includes("--hard") });
    console.log("  " + msg);
    return;
  }
  if (argv.includes("--enable-themes")) {
    const n = enableThemes();
    console.log(n > 0 ? `✓ ${n} linha(s) de tema reativadas no ~/.tmux.conf. Recarregue o tmux (prefixo + r ou reinicie).` : "Nenhum tema desativado para reativar.");
    return;
  }

  if (!(await tmuxAvailable())) {
    console.error("⚠️  tmux não encontrado no PATH. Instale o tmux antes de usar.");
    process.exit(1);
  }

  render(<App />);
}

run().catch((e) => { console.error(e); process.exit(1); });
