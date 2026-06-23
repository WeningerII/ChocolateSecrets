import { describe, test, expect } from 'vitest';
import { computeProteinSet } from './protein';

describe('computeProteinSet', () => {
  test('below onset the protein is raw', () => {
    const r = computeProteinSet(50);
    expect(r.band).toBe('raw');
    expect(r.setFraction).toBe(0);
  });

  test('generic protein progresses raw → setting → set → firm → overset', () => {
    expect(computeProteinSet(50).band).toBe('raw');
    expect(computeProteinSet(65).band).toBe('setting');
    expect(computeProteinSet(75).band).toBe('set');
    expect(computeProteinSet(85).band).toBe('firm');
    expect(computeProteinSet(95).band).toBe('overset');
  });

  test('setFraction rises monotonically and clamps to 0..1', () => {
    expect(computeProteinSet(69).setFraction).toBeCloseTo(0.5, 2); // (69−60)/(78−60)
    expect(computeProteinSet(40).setFraction).toBe(0);
    expect(computeProteinSet(120).setFraction).toBe(1);
  });

  test('egg white sets at a lower temperature than whey', () => {
    expect(computeProteinSet(67, 'egg_white').band).toBe('set'); // ≥65 set, <70 firm
    expect(computeProteinSet(67, 'whey').band).toBe('raw');      // whey onset 70
  });

  test('past the upper bound, protein over-coagulates (curdle / toughen)', () => {
    expect(computeProteinSet(85, 'egg_yolk').band).toBe('overset'); // egg_yolk overset 85
  });
});
