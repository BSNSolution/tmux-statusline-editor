# Security Policy

## Supported Versions

This project is in early development. Security fixes are applied to the latest release on the
`main` branch.

| Version | Supported |
|---------|:---------:|
| 0.1.x   | ✅ |

## Reporting a Vulnerability

If you discover a security vulnerability, **please do not open a public issue.** Instead, report it
privately so we can address it before disclosure:

- Preferred: use GitHub's [private vulnerability reporting](https://github.com/BSNSolution/tmux-statusline-editor/security/advisories/new).
- Or email **contato@bsnsolution.com.br** with details and, if possible, steps to reproduce.

We'll acknowledge your report as soon as we can and keep you informed as we work on a fix.

## Scope notes

This tool reads and writes your local tmux configuration (`~/.tmux.conf`), keeps backups and version
history under `~/.config/tmux-statusline/`, and — only if you opt in with `agent-tabs --install-hooks`
— adds hooks to `~/.claude/settings.json` (with a backup, reversible via `--uninstall-hooks`). It
does not send data anywhere. Catalog items that run shell commands (`#(...)`) execute locally on your
machine; review any custom command before applying it, just as you would any tmux `#()` snippet.
