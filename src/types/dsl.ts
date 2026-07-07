import type { UniversalRole, CategorySubtype } from './roles';

// =====================================================================
// DSL — step condition and slot types (Milestone D)
// =====================================================================

export type StepCondition =
  | { kind: 'always' }
  | { kind: 'role_present'; role: UniversalRole }
  | { kind: 'role_absent'; role: UniversalRole }
  | { kind: 'role_quantity'; role: UniversalRole; op: '<' | '<=' | '=' | '>=' | '>'; grams: number }
  | { kind: 'physics_compare'; metric: 'aw' | 'pH' | 'fatPct' | 'aqueousSugarPct'; op: '<' | '<=' | '=' | '>=' | '>'; value: number }
  | { kind: 'aw_band'; band: 'very-fragile' | 'fragile' | 'stabilized' | 'shelf-stable' | ('very-fragile' | 'fragile' | 'stabilized' | 'shelf-stable')[] }
  | { kind: 'fat_regime'; regime: 'syrup' | 'oil-in-water' | 'inversion-approaching' | 'firm-set' | ('syrup' | 'oil-in-water' | 'inversion-approaching' | 'firm-set')[] }
  | { kind: 'curdle_risk'; min: 'low' | 'medium' | 'high' }
  | { kind: 'category_subtype_present'; subtype: CategorySubtype }
  | { kind: 'and'; conditions: StepCondition[] }
  | { kind: 'or'; conditions: StepCondition[] }
  | { kind: 'not'; condition: StepCondition };

export type SlotFormatter =
  | 'percent_int'              // 41 → "41%"
  | 'gram_int'                 // 234.7 → "235 g"
  | 'gram_one_decimal'         // 234.7 → "234.7 g"
  | 'aw_three_decimals'        // 0.9438 → "0.944"
  | 'ph_two_decimals'          // 3.749 → "3.75"
  | 'temp_c'                   // 31.5 → "31.5°C"
  | 'identity';                // pass-through

export type ContextSlot =
  | { kind: 'physics'; metric: 'aw' | 'pH' | 'fatPct' | 'aqueousSugarPct' | 'shelfLifeWeeks'; formatter: SlotFormatter }
  | { kind: 'role_quantity'; role: UniversalRole; formatter: SlotFormatter }
  | { kind: 'role_property'; role: UniversalRole; property: 'name' }
  | { kind: 'derived'; name: 'temperWindow' | 'temperWorkingPoint' | 'curdleFoldCeiling' | 'curdleRiskLabel' | 'finalAbv'; formatter: SlotFormatter };
