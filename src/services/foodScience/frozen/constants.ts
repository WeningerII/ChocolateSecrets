import type { FrozenRecipeSubtype } from '../../../types';
import type { FrozenBand } from './types';

/**
 * PAC factors — anti-freezing power relative to sucrose=100.
 * Source: Goff & Hartel, "Ice Cream" 7e (2013), Ch. 12 (sweetener effects on
 * freezing point depression). Ethanol's PAC is approximate; literature gives
 * a range 250–290 depending on solute interaction with the matrix; we use 270.
 *
 * Used in PAC = Σᵢ (m_i × pac_i) / total_mix_mass.
 */
export const PAC_FACTORS: Record<string, number> = {
  sucrose: 100,
  glucose: 190,
  fructose: 190,
  lactose: 100,
  maltose: 100,
  sorbitol: 200,
  glycerol: 510,
  ethanol: 270,
};

/**
 * POD factors — sweetening power relative to sucrose=100.
 * Source: Goff & Hartel, "Ice Cream" 7e (2013), Ch. 12.
 */
export const POD_FACTORS: Record<string, number> = {
  sucrose: 100,
  glucose: 70,
  fructose: 170,
  lactose: 16,
  maltose: 30,
  sorbitol: 50,
  glycerol: 60,
};

/**
 * Sandiness threshold. Lactose crystallizes during cabinet storage when its
 * mass fraction inside the MSNF rises past ~11%. Operational rule from
 * Goff & Hartel ch. 11.
 */
export const SANDINESS_LACTOSE_IN_MSNF_PCT = 11.0;

/**
 * Band ranges per recipe subtype. Inclusive on both ends.
 *
 * Sources cross-checked across:
 *   - Goff & Hartel, Ice Cream 7e (2013) tables 1.2–1.4
 *   - Frisinghelli, Bigatton & Gentile, Italian Artisan Ice-Cream Manual (2010)
 *   - Marshall, Goff, Hartel, Ice Cream 6e (2003)
 *
 * The bands are working-shop targets, not legal definitions. American FDA
 * "ice cream" requires fat ≥ 10% and TS ≥ 20%; we keep our band 10–16% fat to
 * reflect typical artisan rather than minimum-spec production.
 */
export const FROZEN_BANDS_BY_SUBTYPE: Record<FrozenRecipeSubtype, FrozenBand> = {
  gelato: {
    totalSolidsPctRange: [32, 38],
    fatPctRange: [4, 9],
    msnfPctRange: [10, 13],
    totalSugarsPctRange: [16, 22],
    pacRange: [26, 33],
    podRange: [18, 25],
    servingTempCRange: [-12, -10],
  },
  ice_cream: {
    totalSolidsPctRange: [36, 42],
    fatPctRange: [10, 16],
    msnfPctRange: [9, 12],
    totalSugarsPctRange: [14, 18],
    pacRange: [22, 28],
    podRange: [14, 19],
    servingTempCRange: [-15, -12],
  },
  sorbet: {
    totalSolidsPctRange: [28, 34],
    fatPctRange: [0, 1],
    msnfPctRange: [0, 0.5],
    totalSugarsPctRange: [22, 30],
    pacRange: [25, 32],
    podRange: [20, 30],
    servingTempCRange: [-12, -8],
  },
  sherbet: {
    totalSolidsPctRange: [28, 34],
    fatPctRange: [1, 3],
    msnfPctRange: [2, 5],
    totalSugarsPctRange: [22, 28],
    pacRange: [25, 32],
    podRange: [20, 28],
    servingTempCRange: [-12, -8],
  },
  semifreddo: {
    totalSolidsPctRange: [38, 48],
    fatPctRange: [18, 30],
    msnfPctRange: [6, 10],
    totalSugarsPctRange: [16, 22],
    pacRange: [18, 26],
    podRange: [14, 22],
    servingTempCRange: [-10, -8],
  },
  frozen_yogurt: {
    totalSolidsPctRange: [32, 38],
    fatPctRange: [2, 6],
    msnfPctRange: [12, 16],
    totalSugarsPctRange: [14, 20],
    pacRange: [26, 32],
    podRange: [16, 22],
    servingTempCRange: [-12, -10],
  },
  granita: {
    totalSolidsPctRange: [22, 32],
    fatPctRange: [0, 0.5],
    msnfPctRange: [0, 0.5],
    totalSugarsPctRange: [18, 26],
    pacRange: [18, 25],
    podRange: [18, 26],
    servingTempCRange: [-8, -4],
  },
};

/**
 * Target fraction of water frozen (%) at the subtype's serving temperature, the
 * texture-causal coordinate behind scoopability. Eating hardness tracks ice-phase
 * volume; within band = a clean scoop. Anchored to ice-cream science (≈70–80%
 * frozen at service) and adjusted per subtype for serving temperature and typical
 * overrun.
 *
 * PROVISIONAL — calibrate against known-good recipes (and ideally cross-check the
 * freezing curve against measured draw/serving hardness) before retiring the
 * hardening-factor heuristic in scoopability.ts.
 */
export const TARGET_FROZEN_WATER_PCT_BY_SUBTYPE: Record<FrozenRecipeSubtype, [number, number]> = {
  ice_cream: [70, 80],
  gelato: [62, 74],
  sorbet: [62, 74],
  sherbet: [62, 74],
  frozen_yogurt: [62, 74],
  semifreddo: [45, 62],
  granita: [35, 58],
};
