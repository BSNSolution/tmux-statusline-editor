# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- Community files (CONTRIBUTING, CODE_OF_CONDUCT, SECURITY), issue/PR templates, and CI.

## [0.1.0] — 2026-07-15

First public release.

### Added

- **Visual TUI editor** for the tmux status line (Ink/React), with import of your current bar.
- **80+ item library** in plain-language categories (session, window/pane, host, date/time, git,
  Nerd Font icons, powerline separators, widgets, ready-made combos, Claude Code & Ghostty), with
  type-to-search.
- **Per-segment color editor** (name or hex, bold/italic/underline), copy/paste style, apply-to-zone.
- **Faithful preview** rendered by tmux itself (real windows/host/clock, truecolor).
- **Apply live** (`tmux source-file`) and **version history** with automatic backups.
- **Move / duplicate / remove** items and **theme management** for plugins that hijack the bar.
- **AI agent indicator in tabs** — ⚙ (working) / 🔔 (needs you) on every tab, even in the background.
  State from **Claude Code hooks** (precise) with a **CPU fallback** and hysteresis.
- **Bilingual UI** (English / Portuguese), auto-detected from the system, English by default,
  overridable with `--lang`.
- **`doctor`** command that checks and installs dependencies (macOS/Linux); portable, no hardcoded paths.
- Round-trip tests for the parser/generator core.

[Unreleased]: https://github.com/BSNSolution/tmux-statusline-editor/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/BSNSolution/tmux-statusline-editor/releases/tag/v0.1.0
