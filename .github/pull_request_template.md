<!-- Thanks for the PR! Keep it focused on one change. -->

## What & why

<!-- What does this change and why? Link any related issue: Closes #123 -->

## Checklist

- [ ] `pnpm build:strict` passes
- [ ] `node --test shared/dist/roundtrip.test.js` passes
- [ ] User-facing strings are translatable (`t("key")`, keys in `shared/src/i18n.ts`)
- [ ] No hardcoded personal/absolute paths; `#(...)` commands are portable (`command -v`, no `case ... )`)
- [ ] If I added a catalog item, I also added its PT translation in `catalog-i18n.ts`
