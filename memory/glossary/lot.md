---
title: Lot
tags: [chocolatesecrets, glossary]
created: 2026-07-07
updated: 2026-07-07
status: active
type: glossary
---

# Lot

**Definition.** A received quantity of an ingredient at a known unit cost and date;
the atom of inventory and costing.

**In this codebase.** Managed in [[inventory-and-lots]]; lot writes fire
`functions/src/onLotUpdate.ts`. Lots feed [[weighted-average-cost]].

**Related.** [[inventory-and-lots]] · [[weighted-average-cost]]
