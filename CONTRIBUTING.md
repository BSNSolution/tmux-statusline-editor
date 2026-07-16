# Contributing to tmux-statusline-editor

Thanks for your interest in contributing! This project grew from a scratch-your-own-itch tool into
something we hope many tmux users enjoy — and contributions of all sizes are welcome.

🇧🇷 A versão em português está no final deste arquivo.

## Ways to contribute

- 🐞 **Report a bug** — open an issue with your `tmux -V`, OS, and clear steps to reproduce.
- 💡 **Add a catalog item** — a new widget, icon, or ready-made combo. This is the easiest,
  highest-impact contribution (see below).
- 🌍 **Add a language** — the i18n layer is simple to extend.
- 🎨 **Theme presets / themes gallery** — help build the themes feature.
- 📖 **Docs** — improve the README, fix typos, add examples.

## Development setup

```bash
git clone https://github.com/BSNSolution/tmux-statusline-editor.git
cd tmux-statusline-editor
bash cli/scripts/doctor.sh          # check dependencies (add --fix to install)
pnpm install
pnpm build:strict                   # tsc --noEmit && tsc -b (both packages)
./run.sh                            # run the TUI
```

Requirements: **tmux 3.x**, **Node.js 18+**, **pnpm**. A Nerd Font is recommended for icons.

## Project layout

```
shared/  @tse/shared — pure, tested core (no I/O)
  model.ts · parser.ts · generator.ts · catalog.ts · catalog-i18n.ts · i18n.ts
  roundtrip.test.ts   (parser∘generator = identity)
cli/     @tse/cli — the Ink/React TUI + tmux I/O
  ui/ · tmux.ts · history.ts · themes-cli.ts · scripts/
```

Keep new logic in `shared/` **pure and testable**; put I/O and rendering in `cli/`.

## Adding a catalog item (most common PR)

1. Add the item to `shared/src/catalog.ts` in the right category — set `key`, `insert`, `label`
   (English), `category`, `description`, `example`, and `kind` (`text`/`format`/`command`/`conditional`).
2. Add its Portuguese translation to `shared/src/catalog-i18n.ts` (`CATALOG_PT[key]`).
3. If it's a `#(...)` command: **make it portable** (no hardcoded paths — use `command -v`; detect the
   OS when needed) and **avoid `case ... )`** inside `#()` (the `)` breaks tmux's parser — use `if/elif`).
4. Build and test.

## Before you open a PR

Both must pass:

```bash
pnpm build:strict
node --test shared/dist/roundtrip.test.js
```

- Match the surrounding code style (strict TypeScript, no `any`, no hardcoded personal/absolute paths).
- Keep user-facing strings translatable (`t("key")` from `@tse/shared`, keys in `shared/src/i18n.ts`).
- One focused change per PR; describe **what** and **why** in the description.

## Commit messages

We loosely follow [Conventional Commits](https://www.conventionalcommits.org):
`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`. Example: `feat(catalog): add uptime widget`.

---

## 🇧🇷 Contribuindo (resumo em português)

- Rode `bash cli/scripts/doctor.sh` para checar dependências (tmux 3.x, Node 18+, pnpm).
- Setup: `pnpm install && pnpm build:strict`, rode com `./run.sh`.
- **Adicionar item ao catálogo** é a contribuição mais fácil: adicione em `shared/src/catalog.ts` +
  a tradução PT em `catalog-i18n.ts`. Scripts `#(...)` devem ser **portáveis** (sem caminho fixo;
  use `command -v`) e **sem `case ... )`** dentro de `#()` (quebra o parser do tmux — use `if/elif`).
- Antes do PR: `pnpm build:strict` e `node --test shared/dist/roundtrip.test.js` têm que passar.
- Textos visíveis devem ser traduzíveis via `t("chave")`. Sem `any`, sem caminho pessoal/absoluto.
