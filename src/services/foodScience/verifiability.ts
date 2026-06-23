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
 * The wall is NOT at perception. Taste, chemesthesis, texture and aroma RELEASE
 * are the physics/chemistry of the sense organs and are modelable from
 * composition + process. Only two things resist: aroma CHARACTER (structure→odor,
 * a frontier — increasingly ML-tractable, not impossible) and the individual /
 * contextual variance in hedonic liking (population-level palatability is still
 * optimizable). The map below is drawn at that — universal-food — scale.
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
  { id: 'titratable_acidity', category: 'state', predictability: 'first_principles', measurability: { instrument: 'titration (autotitrator)' }, computedBy: 'computeTitratableAcidity', notes: 'Total neutralizable acid to the pH 8.2 endpoint — a better sourness predictor than pH.' },
  { id: 'initial_freezing_point', category: 'state', predictability: 'first_principles', measurability: { instrument: 'cryoscope / DSC' }, computedBy: 'computeFreezing' },
  { id: 'ice_fraction_at_serving', category: 'state', predictability: 'first_principles', measurability: { instrument: 'DSC / calorimetry' }, computedBy: 'computeFreezing', notes: 'The texture-causal coordinate; ideal colligative model.' },
  { id: 'glass_transition_tg_prime', category: 'state', predictability: 'calibrated', measurability: { instrument: 'DSC' }, computedBy: 'estimateTgPrime', notes: 'Proteins/stabilizers raise Tg′ and are not yet modeled.' },
  { id: 'boiling_point_elevation', category: 'state', predictability: 'first_principles', measurability: { instrument: 'thermometer' }, computedBy: 'computeBoilingPoint', notes: 'Colligative (van ’t Hoff), the hot-end sibling of the freezing curve.' },
  { id: 'candy_stage', category: 'state', predictability: 'calibrated', measurability: { instrument: 'candy thermometer' }, computedBy: 'classifyCandyStage', notes: 'Syrup temperature → confectioner stage (thread … hard-crack … caramel).' },
  { id: 'osmotic_pressure', category: 'state', predictability: 'first_principles', measurability: { instrument: 'osmometer' }, computedBy: 'computeOsmolality', notes: 'Colligative (van ’t Hoff); the physical basis of sugar/salt preservation.' },

  // --- Composition & reaction products ---
  { id: 'macro_composition', category: 'composition', predictability: 'first_principles', measurability: { instrument: 'proximate analysis' }, computedBy: 'resolveComposition' },
  { id: 'pac_anti_freezing', category: 'composition', predictability: 'first_principles', measurability: { instrument: 'cryoscope' }, computedBy: 'calculatePAC', notes: 'Sugar factors are exactly colligative (Wolfram-validated).' },
  { id: 'energy_nutrition', category: 'composition', predictability: 'first_principles', measurability: { instrument: 'bomb calorimetry / nutrition panel' }, computedBy: 'computeNutrition', notes: 'Atwater energy (kcal/100 g) + macronutrient grams and energy shares.' },
  { id: 'maillard_browning', category: 'composition', predictability: 'calibrated', measurability: { instrument: 'GC-MS / colorimeter' }, computedBy: 'computeMaillardBrowning', notes: 'Relative browning potential: reducing sugars + protein integrated over the bake T·time profile, modulated by aw. Not absolute color (instrument/panel).' },
  { id: 'lipid_oxidation', category: 'composition', predictability: 'calibrated', measurability: { instrument: 'peroxide value / TBARS' }, computedBy: 'computeLipidOxidation', notes: 'Relative rancidity potential: unsaturated fat over the storage T·time profile, Arrhenius, with the Labuza a_w U-curve. Falls back to fat×0.6 when the unsaturated split is unknown.' },
  { id: 'thermal_properties', category: 'composition', predictability: 'first_principles', measurability: { instrument: 'line heat source / DSC' }, computedBy: 'computeThermalProperties', notes: 'Choi–Okos: k, ρ, cₚ and thermal diffusivity α from composition + temperature. Validated vs textbook food values; feeds every transient-conduction calc.' },
  { id: 'fermentation', category: 'composition', predictability: 'calibrated', measurability: { instrument: 'HPLC / fermentation gravity' }, computedBy: 'ferment', notes: 'Operator (state→state): yeast consumes fermentable sugar → ethanol + CO₂ over time. Gay-Lussac stoichiometry is first-principles (Wolfram-verified); rate is the Rosso cardinal-temperature model with representative culture parameters (calibrated).' },

  // --- Mechanical / texture ---
  { id: 'scoopability', category: 'mechanical', predictability: 'calibrated', measurability: { instrument: 'penetrometer / TPA' }, computedBy: 'classifyFrozenWaterScoopability', notes: 'Physics path (ice fraction) alongside the hardening-factor heuristic.' },
  { id: 'chocolate_snap', category: 'mechanical', predictability: 'proxy', measurability: { instrument: 'three-point bend' }, computedBy: 'computeChocolateSnap', notes: 'Class-based fat estimate; composition lumps fat.' },
  { id: 'viscosity', category: 'mechanical', predictability: 'calibrated', measurability: { instrument: 'viscometer / rheometer' }, computedBy: 'computeRheology', notes: 'Relative viscosity (solute jamming divergence × Arrhenius temperature) + flow type + consistency band.' },
  { id: 'formula_balance', category: 'mechanical', predictability: 'calibrated', measurability: { instrument: 'crumb texture (TPA) / specific volume' }, computedBy: 'computeFormulaBalance', notes: 'High-ratio cake balance (Figoni): sugar≥flour, liquid≥sugar, egg≥fat. Screens ingredient-role ratios for a directional crumb fault (dense/tough vs over-tender/sinking) before mixing.' },

  // --- Microstructure ---
  { id: 'solid_fat_content', category: 'microstructure', predictability: 'calibrated', measurability: { instrument: 'pNMR (ISO 8292)' }, computedBy: 'sfcAtTemp' },
  { id: 'polymorph_temper_window', category: 'microstructure', predictability: 'calibrated', measurability: { instrument: 'XRD / DSC' }, computedBy: 'computePolymorphWindow' },
  { id: 'sugar_crystallization', category: 'microstructure', predictability: 'calibrated', measurability: { instrument: 'microscopy / polarimetry' }, computedBy: 'computeSucroseCrystallization', notes: 'Graining risk: sucrose supersaturation vs the solubility curve, suppressed by doctoring sugars.' },
  { id: 'protein_coagulation', category: 'microstructure', predictability: 'calibrated', measurability: { instrument: 'DSC / texture analyzer' }, computedBy: 'computeProteinSet', notes: 'Thermal set state vs peak temperature, per protein class (egg/whey/collagen); pairs with the doneness core temp.' },
  { id: 'emulsion_stability', category: 'microstructure', predictability: 'calibrated', measurability: { instrument: 'droplet sizing / Turbiscan' }, computedBy: 'computeEmulsion', notes: 'o/w vs w/o from phase volume + emulsifier HLB; inversion risk past close packing.' },
  { id: 'foam_stability', category: 'microstructure', predictability: 'proxy', measurability: { instrument: 'overrun / drainage half-life' }, computedBy: 'computeFoam', notes: 'Protein foamability × dissolved-sugar viscosity ÷ fat antagonism (protein-foam model).' },
  { id: 'gelation', category: 'microstructure', predictability: 'calibrated', measurability: { instrument: 'rheometer (G′)' }, computedBy: 'computeGelation', notes: 'Hydrocolloid set: minimum dose, set/melt window, character, co-factor needs (sugar/Ca/K).' },
  { id: 'ice_crystal_size', category: 'microstructure', predictability: 'none', measurability: { instrument: 'cold-stage microscopy' }, computedBy: null, notes: 'Process/storage-set, not derivable from composition.' },
  { id: 'overrun', category: 'microstructure', predictability: 'none', measurability: { instrument: 'density / weight ratio' }, computedBy: null, notes: 'Aeration is a process variable.' },

  // --- Stability / safety ---
  { id: 'shelf_life', category: 'stability', predictability: 'calibrated', measurability: { instrument: 'predictive microbiology / plating' }, computedBy: 'predictShelfLife' },
  { id: 'curdle_risk', category: 'stability', predictability: 'calibrated', measurability: { instrument: 'visual / titration' }, computedBy: 'assessCurdleRisk' },
  { id: 'recrystallization_margin', category: 'stability', predictability: 'calibrated', measurability: { instrument: 'DSC + storage trial' }, computedBy: 'estimateTgPrime' },

  // --- Thermal & transport ---
  { id: 'heat_transfer_doneness', category: 'transport', predictability: 'calibrated', measurability: { instrument: 'thermocouple' }, computedBy: 'computeDoneness', notes: 'Lumped-capacitance core-temperature march over the bake T·time profile (Siebel cp, evaporative plateau); flags high-Biot items as optimistic.' },
  { id: 'moisture_migration', category: 'transport', predictability: 'calibrated', measurability: { instrument: 'gravimetric / a_w gradient' }, computedBy: 'computeMoistureMigration', notes: 'Relative migration risk: first-order equilibration of the per-phase a_w gap over storage, across an assumed diffusion barrier.' },
  { id: 'heat_penetration', category: 'transport', predictability: 'first_principles', measurability: { instrument: 'thermocouple grid' }, computedBy: 'computeHeatPenetration', notes: 'Gradient-aware transient conduction (one-term Heisler, slab/cyl/sphere): center & surface temperature and time-to-core-target, valid at high Biot where the lumped doneness model overestimates. Verified vs Incropera Table 5.1.' },
  { id: 'mass_diffusion', category: 'transport', predictability: 'first_principles', measurability: { instrument: 'sectioning + titration / refractometry' }, computedBy: 'computeMassPenetration', notes: 'Brining/curing/marinating/bloom: Fickian penetration to the center via the same one-term solution (Bi_m→∞ for a stirred bath). Scaling exact; diffusivities are representative.' },
  { id: 'surface_coefficient', category: 'transport', predictability: 'first_principles', measurability: { instrument: 'heat-flux sensor' }, computedBy: 'computeSurfaceCoefficient', notes: 'The boundary condition itself: h = h_conv + h_rad. Convection from Nusselt–Reynolds/Rayleigh–Prandtl correlations (geometry-specific); radiation linearized Stefan–Boltzmann. Replaces the h lookup table. Fluid props anchored to Wolfram ThermodynamicData.' },
  { id: 'freezing_time', category: 'transport', predictability: 'first_principles', measurability: { instrument: 'thermocouple + timer' }, computedBy: 'computePlankTime', notes: "Plank's moving-boundary equation: latent-heat freezing/thawing time from the freezing point, frozen/thawed conductivity (Choi–Okos ice) and surface h. Neglects sensible heat (a first estimate); thawing runs slower than freezing." },
  { id: 'psychrometric_state', category: 'transport', predictability: 'first_principles', measurability: { instrument: 'hygrometer / sling psychrometer' }, computedBy: 'computePsychrometrics', notes: 'Moist-air state: Magnus saturation pressure, humidity ratio, dew point, and the wet-bulb temperature a wet surface cools to (evaporative cooling). Validated vs Wolfram.' },
  { id: 'drying_rate', category: 'transport', predictability: 'first_principles', measurability: { instrument: 'gravimetric drying curve' }, computedBy: 'computeDryingRate', notes: 'Constant-rate evaporation flux via the heat–mass analogy: h·(T_air − T_wb)/ΔH_vap, surface held at the wet bulb. Constant-rate period only; falling-rate is internal moisture diffusion.' },

  // --- Perception: taste (receptor-level, modelable from the chemical inventory) ---
  { id: 'sweetness_intensity', category: 'perceptual', predictability: 'calibrated', measurability: 'panel_only', computedBy: 'calculatePOD', notes: 'Relative sweetening power (POD); the perception-layer sibling is taste_sweet.' },
  { id: 'taste_sweet', category: 'perceptual', predictability: 'calibrated', measurability: 'panel_only', computedBy: 'computeTasteProfile', notes: 'Perceived sweetness: Beidler dose-response on sucrose-equivalents, after mixture interactions.' },
  { id: 'taste_salty', category: 'perceptual', predictability: 'calibrated', measurability: 'panel_only', computedBy: 'computeTasteProfile', notes: 'From sodium (Na→NaCl), Beidler saturation.' },
  { id: 'taste_sour', category: 'perceptual', predictability: 'calibrated', measurability: 'panel_only', computedBy: 'computeTasteProfile', notes: 'pH proxy; titratable acidity is the better predictor (needs an acid inventory).' },
  { id: 'taste_bitter', category: 'perceptual', predictability: 'calibrated', measurability: 'panel_only', computedBy: 'computeTasteProfile', notes: 'From caffeine + theobromine (chemical inventory), suppressed by sweet/salt. Polyphenol bitterness not yet included.' },
  { id: 'taste_umami', category: 'perceptual', predictability: 'calibrated', measurability: 'panel_only', computedBy: 'computeTasteProfile', notes: 'From free glutamate, salt-enhanced. 5′-nucleotide synergy (multiplicative) not yet modeled.' },

  // --- Perception: aroma & liking (the relocated frontier) ---
  { id: 'aroma_release', category: 'perceptual', predictability: 'first_principles', measurability: { instrument: 'headspace GC-MS / APCI-MS' }, computedBy: 'computeAromaRelease', notes: 'Matrix modulation of aroma delivery: three-phase partition (fat traps lipophilic volatiles), relative headspace by polarity class. The tractable half of aroma — release, not character.' },
  { id: 'aroma_character', category: 'perceptual', predictability: 'proxy', measurability: 'panel_only', computedBy: null, notes: 'Still the frontier: WHICH volatiles and what they smell like (structure→odor). Release is now modeled (aroma_release); character is increasingly ML-tractable (Principal Odor Map, 2023).' },
  { id: 'palatability_balance', category: 'perceptual', predictability: 'proxy', measurability: 'panel_only', computedBy: 'computePalatability', notes: 'Population-level sensory balance from the taste profile — the optimization target. A tunable heuristic, NOT individual liking.' },
  { id: 'hedonic_liking', category: 'perceptual', predictability: 'none', measurability: 'panel_only', computedBy: null, notes: 'Only the individual/contextual variance is irreducible; the population-level part is palatability_balance.' },
] as const;
