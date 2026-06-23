/**
 * Verifiability registry — the machine-readable "where are the walls" map.
 *
 * Every food-quality dimension the kernels can speak to, tagged with:
 *   - how it's objectively MEASURED (the instrument that gives ground truth), and
 *   - how PREDICTABLE it is from composition + process:
 *       first_principles — derivable from physics/chemistry (e.g. water activity)
 *       calibrated       — modeled but anchored to empirical tables/coefficients
 *       proxy            — a heuristic stand-in, not the underlying physics
 *       none             — not derivable from chemistry at all (the hard wall);
 *                          knowable only by a tasting panel, never universal
 *   - what COMPUTES it today (`computedBy`), or null if it is a known gap.
 *
 * The wall is explicit: aroma character and hedonic liking are `none` /
 * `panel_only` / not computed, by nature — not a backlog item.
 */
export type ScopeCategory =
  | 'state' | 'mechanical' | 'microstructure' | 'composition'
  | 'color' | 'stability' | 'transport' | 'perceptual';

export type Predictability = 'first_principles' | 'calibrated' | 'proxy' | 'none';

export type Measurability = { instrument: string } | 'panel_only' | 'none';

export interface QualityDimension {
  id: string;
  category: ScopeCategory;
  predictability: Predictability;
  measurability: Measurability;
  /** Exported symbol that computes it today, or null for a known gap / the wall. */
  computedBy: string | null;
  notes?: string;
}

export const QUALITY_DIMENSIONS: readonly QualityDimension[] = [
  // --- Thermodynamic state (the strongest ground) ---
  { id: 'water_activity', category: 'state', predictability: 'first_principles', measurability: { instrument: 'water-activity meter' }, computedBy: 'calculateNorrishAw' },
  { id: 'ph', category: 'state', predictability: 'first_principles', measurability: { instrument: 'pH meter' }, computedBy: 'calculateMixedPH' },
  { id: 'initial_freezing_point', category: 'state', predictability: 'first_principles', measurability: { instrument: 'cryoscope / DSC' }, computedBy: 'computeFreezing' },
  { id: 'ice_fraction_at_serving', category: 'state', predictability: 'first_principles', measurability: { instrument: 'DSC / calorimetry' }, computedBy: 'computeFreezing', notes: 'The texture-causal coordinate; ideal colligative model.' },
  { id: 'glass_transition_tg_prime', category: 'state', predictability: 'calibrated', measurability: { instrument: 'DSC' }, computedBy: 'estimateTgPrime', notes: 'Proteins/stabilizers raise Tg′ and are not yet modeled.' },

  // --- Composition & reaction products ---
  { id: 'macro_composition', category: 'composition', predictability: 'first_principles', measurability: { instrument: 'proximate analysis' }, computedBy: 'resolveComposition' },
  { id: 'pac_anti_freezing', category: 'composition', predictability: 'first_principles', measurability: { instrument: 'cryoscope' }, computedBy: 'calculatePAC', notes: 'Sugar factors are exactly colligative (Wolfram-validated).' },
  { id: 'maillard_browning', category: 'composition', predictability: 'calibrated', measurability: { instrument: 'GC-MS / colorimeter' }, computedBy: 'computeMaillardBrowning', notes: 'Relative browning potential: reducing sugars + protein integrated over the bake T·time profile, modulated by aw. Not absolute color (instrument/panel).' },
  { id: 'lipid_oxidation', category: 'composition', predictability: 'calibrated', measurability: { instrument: 'peroxide value / TBARS' }, computedBy: null, notes: 'Gap: needs storage time·temperature.' },

  // --- Mechanical / texture ---
  { id: 'scoopability', category: 'mechanical', predictability: 'calibrated', measurability: { instrument: 'penetrometer / TPA' }, computedBy: 'classifyFrozenWaterScoopability', notes: 'Physics path (ice fraction) alongside the hardening-factor heuristic.' },
  { id: 'chocolate_snap', category: 'mechanical', predictability: 'proxy', measurability: { instrument: 'three-point bend' }, computedBy: 'computeChocolateSnap', notes: 'Class-based fat estimate; composition lumps fat.' },

  // --- Microstructure ---
  { id: 'solid_fat_content', category: 'microstructure', predictability: 'calibrated', measurability: { instrument: 'pNMR (ISO 8292)' }, computedBy: 'sfcAtTemp' },
  { id: 'polymorph_temper_window', category: 'microstructure', predictability: 'calibrated', measurability: { instrument: 'XRD / DSC' }, computedBy: 'computePolymorphWindow' },
  { id: 'ice_crystal_size', category: 'microstructure', predictability: 'none', measurability: { instrument: 'cold-stage microscopy' }, computedBy: null, notes: 'Process/storage-set, not derivable from composition.' },
  { id: 'overrun', category: 'microstructure', predictability: 'none', measurability: { instrument: 'density / weight ratio' }, computedBy: null, notes: 'Aeration is a process variable.' },

  // --- Stability / safety ---
  { id: 'shelf_life', category: 'stability', predictability: 'calibrated', measurability: { instrument: 'predictive microbiology / plating' }, computedBy: 'predictShelfLife' },
  { id: 'curdle_risk', category: 'stability', predictability: 'calibrated', measurability: { instrument: 'visual / titration' }, computedBy: 'assessCurdleRisk' },
  { id: 'recrystallization_margin', category: 'stability', predictability: 'calibrated', measurability: { instrument: 'DSC + storage trial' }, computedBy: 'estimateTgPrime' },

  // --- Thermal & transport ---
  { id: 'heat_transfer_doneness', category: 'transport', predictability: 'calibrated', measurability: { instrument: 'thermocouple' }, computedBy: 'computeDoneness', notes: 'Lumped-capacitance core-temperature march over the bake T·time profile (Siebel cp, evaporative plateau); flags high-Biot items as optimistic.' },
  { id: 'moisture_migration', category: 'transport', predictability: 'calibrated', measurability: { instrument: 'gravimetric / a_w gradient' }, computedBy: null, notes: 'Gap: needs Fickian model + step model.' },

  // --- Perceptual ---
  { id: 'sweetness_intensity', category: 'perceptual', predictability: 'calibrated', measurability: 'panel_only', computedBy: 'calculatePOD', notes: 'Relative POD, not absolute sucrose-equivalent.' },
  { id: 'aroma_character', category: 'perceptual', predictability: 'none', measurability: 'panel_only', computedBy: null, notes: 'Wall: structure→odor is not derivable.' },
  { id: 'hedonic_liking', category: 'perceptual', predictability: 'none', measurability: 'panel_only', computedBy: null, notes: 'Wall: no universal objective function; personal/cultural/contextual.' },
] as const;
