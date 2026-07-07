---
title: Localization (i18n)
tags: [chocolatesecrets, domain]
created: 2026-07-07
updated: 2026-07-07
status: active
type: domain
---

# Localization (i18n)

## What this covers
Multi-language UI (en/es/ko) via i18next, plus AI-assisted translation of
user content (recipes).

## Key code
- Setup: `src/i18n.ts`; strings under `src/locales/{en,es,ko}/*.json` (25 namespaces).
- Hooks: `src/hooks/useLanguage.ts`, `useAutoTranslate.ts`, `useRuntimeTranslation.ts`.
- Services: `src/services/translateRecipe.ts`, `src/services/translationClient.ts`;
  function `functions/src/translation.ts` (batch translation via Gemini —
  [[gemini-ai-functions]]).
- Guards: `scripts/check-locale-parity.mjs` (keys match across locales),
  `scripts/check-hardcoded-strings.mjs`, `scripts/migrate-localized-strings.mjs`.

## Rules / gotchas
- Avoid hardcoded UI strings — the check scripts fail CI on drift.
- Keep locale JSON key parity across en/es/ko. (These files are excluded from the
  code graph via `.graphifyignore` — they're data, not structure.)

## Related
- [[system-overview]] · [[gemini-ai-functions]]
