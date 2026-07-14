---
title: Refactor Backlog — UI-gated decompositions
tags: [chocolatesecrets, architecture, refactor, backlog]
created: 2026-07-07
updated: 2026-07-07
status: active
type: architecture
---

# Refactor Backlog — UI-gated decompositions

Work deliberately **not** done during the god-module decomposition
([[0004-decompose-god-modules]]) because it changes runtime behavior or
component structure and therefore needs a **running UI** to verify — lint + unit
tests alone are insufficient. Prioritized; do the cheap, high-leverage items
first. See [[system-overview]] for where these components live and
[[recipes-and-costing]] for the domain.

## Prioritized checklist

- [x] **1. Decompose `RecipeEditor.tsx` JSX into tab sub-components.** ✅ DONE
  2026-07-12 (`f3983ac`): extracted `OverviewTab`, `DesignTab`, `ComponentsTab`,
  and shared `editorShared` (ProvenanceBadge/ConfidenceDot/getActionIcon) under
  `src/components/recipeEditor/`; RecipeEditor.tsx 1445 → 485 LOC as a slim
  orchestrator. Behavior-preserving (verbatim JSX; parent keeps all hooks/state/
  handlers and the tab wrappers). Verified: tsc + 917 tests + production build +
  a Chromium smoke drive (tab switching, production-details toggle, live-math
  footer, save→onSave all confirmed). See [[project-backlog]] section E.

- [ ] **2. Split the 25-`useState` pages into smaller stateful units.**
  `src/pages/Ingredients.tsx`, `src/pages/BillReview.tsx`, and
  `src/pages/PrepList.tsx` each carry ~25 `useState` hooks. Group related state
  (ideally into reducers or child components) to cut prop/state sprawl. Requires
  clicking through each page — form edits, filters, modals, and save flows — to
  confirm no state-timing regressions.

- [x] **3. Migrate to i18next typed keys to delete the `t('key' as any)` casts.**
  ✅ DONE 2026-07-12 (`fbdc296`, `98b56e1`). The typed union already existed; the
  casts were forced by TS's instantiation-depth limit on big namespaces (bare deep
  keys fail, `t('ns:key')` fully-qualified keys pass). Removed 103 static + 3
  `useTranslation` + 3 `(t as any)` casts; kept 121 dynamic (inherently un-typeable)
  covered instead by a new `src/i18n.keys.test.ts` guard. Found & fixed 12 missing
  keys + 6 placeholder-mismatch bugs the casts hid. Full write-up in
  [[project-backlog]] section D.

- [ ] **4. Type the ~dozen genuine data `any`s.**
  Replace real (non-key-cast) `any`s on data shapes with proper types — e.g. the
  `getFieldMeta` state and `BillReview`'s `dateToYMD` Firestore `Timestamp`
  handling. These touch parsing/formatting of live Firestore data, so verify
  against real documents in the running app (dates, receipts, field metadata).

## Notes
- Each item must land behind `npm run lint` + `npm test` **and** a manual UI
  pass; prefer one item per PR so a regression is easy to bisect.
- Rebuild the graph (`graphify update .`) after any structural split so file-node
  degrees stay accurate.

## Related
- [[0004-decompose-god-modules]] · [[system-overview]] · [[recipes-and-costing]]
- Superset inventory (2026-07-11 full audit): [[project-backlog]]
