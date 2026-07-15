<div align="center">

# 🎨 tmux-statusline-editor

### A visual editor for your tmux status line — right in the terminal.

Build your bar by picking items from a plain-language library, tweak colors with a faithful
live preview, and apply instantly. No more memorizing `#{...}` or `#[fg=...]`.

**Think [`tweakcc`](https://github.com/piqoni/tweakcc), but for tmux.**

[![License: MIT](https://img.shields.io/badge/License-MIT-7C5CFF.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![tmux 3.x](https://img.shields.io/badge/tmux-3.x-1BB91F.svg?logo=tmux&logoColor=white)](https://github.com/tmux/tmux)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux-lightgrey.svg)](#requirements)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#-contributing)

🇧🇷 **[Leia em português →](README.pt-BR.md)**

</div>

---

```
 ⚡ BSN Solution     1:BSN ⚙   2:Mac 🔔   3:ATM   4:TRIGO   5:CREA          host · 14:35:07
 └────────────────┘ └── tabs, live agent status ──┘                      └── real values ──┘
        ▲ status-left                                                          ▲ status-right
```

The whole bar above is built and colored inside the TUI — including the powerline borders and the
per-tab AI-agent indicator. Everything you see is rendered by tmux itself, so the preview never lies.

---

## ✨ Why you'll like it

Configuring the tmux status line by hand is cryptic — `#[fg=#9b988f,bg=#15161A]`,
`#{?window_zoomed_flag,...}`, `#(script)`. This editor turns all of that into plain language,
shows a **faithful preview**, and applies changes live with **backups and version history** so
you never lose a config.

- 🧩 **80+ item library** in human categories — session, window/pane, host, date/time, git, Nerd
  Font icons, powerline separators, widgets (battery, CPU, IP…), ready-made combos, and a
  **Claude Code & Ghostty** category.
- 🔍 **Type-to-search** the library — "git", "battery", "clock", "icon"…
- 🎨 **Per-segment colors** (name or hex), bold/italic/underline, plus **copy/paste style** and
  "apply to the whole zone".
- 👁️ **Faithful preview** — every segment expanded by tmux with your real windows, host and time,
  in truecolor.
- ⏱️ **Apply live** + **version history** with automatic backups.
- 🔀 **Move / duplicate / remove** items; **theme management** for plugins that hijack the bar
  (tokyo-night, etc.).
- 🤖 **AI agent indicator in tabs** — see ⚙ (working) / 🔔 (needs you) on every tab, even in the
  background, driven by [Claude Code](https://claude.com/claude-code).
- 🌍 **Bilingual** (English / Portuguese), auto-detected from your system, English by default.
- 📦 **Self-sufficient** — a `doctor` command checks and installs everything you need. No
  hardcoded paths; runs on any machine.

## 🚀 Quick start

```bash
git clone https://github.com/BSNSolution/tmux-statusline-editor.git
cd tmux-statusline-editor

bash cli/scripts/doctor.sh --fix   # check & install dependencies (optional)
pnpm install && pnpm build:strict  # build
./run.sh                           # launch the editor
```

That's it — `run.sh` forces truecolor so colors match inside tmux. Press `a` to add an item,
`e` to edit, `Enter` to apply. Your current bar is imported automatically.

## ⌨️ Editor keys

| Key | Action | | Key | Action |
|-----|--------|-|-----|--------|
| `←` `→` | switch bar part | | `e` | **edit** (searchable library + colors) |
| `↑` `↓` | move between items | | `c`/`v`/`V` | **copy** / paste / paste-to-zone color |
| `,` `.` | **move** the item | | `l` | **clear** the zone's colors |
| `a` | **add** item (search) | | `g` | general options |
| `d` | **duplicate** | | `Enter` | **apply** to tmux (saves a version) |
| `r` | **remove** | | `Tab` / `q` | switch tab / quit |

## 📸 What it does

<table>
<tr><td><b>Human library</b></td><td>Pick "Window name", "Battery", "Git branch" — never <code>#W</code> or <code>#{...}</code>. Each item shows a real example of its output.</td></tr>
<tr><td><b>Faithful preview</b></td><td>The bar at the top is rendered by tmux with your real session, windows, host and clock — what you see is what you'll get.</td></tr>
<tr><td><b>Version history</b></td><td>Every apply saves a JSON version and backs up your <code>~/.tmux.conf</code>. Roll back anytime.</td></tr>
<tr><td><b>Agent indicator</b></td><td>Running Claude Code in several panes? Each tab shows ⚙/🔔 so you know which one needs you — even in the background.</td></tr>
</table>

## 📋 Requirements

| Dependency | Required | For |
|------------|:--------:|-----|
| **tmux** 3.x | ✅ | it's what we're configuring |
| **Node.js** 18+ | ✅ | runs the CLI |
| **pnpm** | build from source | monorepo build |
| **Nerd Font** | recommended | icons & powerline borders |
| **tmux-agent-indicator** | optional | the Claude Code items in tabs |

> Run `tmux-statusline doctor` to see what's installed, or `doctor --fix` to install the rest
> (`brew` on macOS; `apt`/`dnf`/`pacman` on Linux).

## 🤖 Agent indicator in tabs

If you run [Claude Code](https://claude.com/claude-code) across tmux panes, this shows on **each
tab** whether the agent is working or waiting — including background tabs.

```bash
node cli/dist/main.js agent-tabs   # start the daemon (needs tmux-agent-indicator)
```

Then add `#{@agent_icon}` to your `window-status-format` (you can do it from the editor). The
daemon scans **all panes** of each window, shows ⚙/🔔 (running beats needs), **clears when you
focus the pane**, **expires on its own** (no stuck icons), and leaves **no gap** when idle.

## 🏗️ How it works

pnpm monorepo, two packages, pure core + thin TUI:

```
shared/  @tse/shared — pure, tested core (no I/O)
  parser.ts / generator.ts   raw status line ⇄ model, round-trip tested
  catalog.ts + i18n          ~85 items, English default + Portuguese
cli/     @tse/cli — the Ink/React TUI + tmux I/O
  ui/                        editor, color editor, faithful preview
  scripts/                   doctor.sh, agent-tabs-daemon.sh
```

The **parser** and **generator** convert the status line both ways without losing anything
(guaranteed by round-trip tests against real bars). The preview asks tmux how it renders — so it
can't lie. User data lives in `~/.config/tmux-statusline/` (`history/` + `backups/`).

## 🛠️ Development

```bash
pnpm install
pnpm build:strict                             # tsc --noEmit && tsc -b (both packages)
node --test shared/dist/roundtrip.test.js     # core tests
./run.sh                                       # run the TUI
```

Strict TypeScript (`noUncheckedIndexedAccess`), project references, no `any`.

## 🐛 Known gotchas (and how we handle them)

- `#()` in `window-status-format` only runs in the **active tab's** context — the agent indicator
  uses `#{@agent_icon}` (a per-window option tmux expands per-tab) + a daemon instead.
- `window-status-activity-style = reverse` (from plugins) can invert fg/bg — neutralized on import.
- Theme plugins inject styles into tmux **memory** that survive commenting the line — use the
  editor's theme management, never `kill-server`.

## 🤝 Contributing

Contributions are very welcome — this started as a scratch-your-own-itch tool and grew into
something we think many tmux users will enjoy.

- 🐞 **Found a bug?** Open an issue with your tmux version (`tmux -V`) and steps to reproduce.
- 💡 **Want a new item** for the library (a new widget, icon, or combo)? PRs to `shared/src/catalog.ts`
  are easy and high-impact — add the item, a translation in `catalog-i18n.ts`, and you're done.
- 🌍 **Another language?** The i18n layer (`shared/src/i18n.ts`) is simple to extend.
- ✅ Before opening a PR: `pnpm build:strict` and `node --test shared/dist/roundtrip.test.js` must pass.

Good first issues: new catalog items, more ready-made combos, theme presets, and the themes gallery.

## 📄 License

[MIT](LICENSE) © [BSN Solution](https://bsnsolution.com.br) — free to use, modify, and share.

<div align="center">
<sub>If this saved you from fighting <code>#[fg=...]</code>, consider giving it a ⭐.</sub>
</div>
