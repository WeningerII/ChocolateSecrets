---
title: Sourcing & Vendors
tags: [chocolatesecrets, domain]
created: 2026-07-07
updated: 2026-07-07
status: active
type: domain
---

# Sourcing & Vendors

## What this covers
Suppliers, purchase orders, sourcing notes, and normalizing vendor names extracted
from bills into canonical suppliers.

## Key code
- Pages: `src/pages/Suppliers.tsx`, `src/pages/PurchaseOrders.tsx`.
- Services: `src/services/sourcingService.ts`, `src/services/vendorsService.ts`.
- Component: `src/components/SourcingPanel.tsx`; hook `src/hooks/useKeptSourcingNotes.ts`.
- Functions: `functions/src/resolveVendor.ts`, `functions/src/vendorResolution.ts`
  (canonicalize vendors from [[expenses-bills-payments]]).

## Rules / gotchas
- Vendor resolution links messy bill vendor strings to canonical supplier records;
  keep the mapping deterministic and auditable.
- Purchase orders tie back to [[inventory-and-lots]] on receipt.

## Related
- [[system-overview]] · [[expenses-bills-payments]] · [[inventory-and-lots]]
