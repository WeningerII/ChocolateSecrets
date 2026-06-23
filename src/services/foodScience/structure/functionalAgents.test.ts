import { describe, test, expect } from 'vitest';
import { resolveFunctionalAgent } from './functionalAgents';

describe('resolveFunctionalAgent', () => {
  test('identifies gelling agents', () => {
    expect(resolveFunctionalAgent('Gelatin (200 bloom)')).toMatchObject({ kind: 'gelling_agent', agent: 'gelatin' });
    expect(resolveFunctionalAgent('Agar-agar')).toMatchObject({ agent: 'agar' });
    expect(resolveFunctionalAgent('Apple Pectin')).toMatchObject({ agent: 'pectin_hm' });
    expect(resolveFunctionalAgent('Iota Carrageenan')).toMatchObject({ agent: 'iota_carrageenan' });
    expect(resolveFunctionalAgent('Carrageenan')).toMatchObject({ agent: 'kappa_carrageenan' });
    expect(resolveFunctionalAgent('Corn starch')).toMatchObject({ agent: 'starch' });
  });

  test('low-methoxyl pectin matches before generic pectin', () => {
    expect(resolveFunctionalAgent('Low-methoxyl pectin')).toMatchObject({ agent: 'pectin_lm' });
    expect(resolveFunctionalAgent('LM pectin')).toMatchObject({ agent: 'pectin_lm' });
  });

  test('identifies emulsifiers with HLB', () => {
    expect(resolveFunctionalAgent('Soy Lecithin')).toMatchObject({ kind: 'emulsifier', hlb: 8 });
    expect(resolveFunctionalAgent('Polysorbate 80')).toMatchObject({ kind: 'emulsifier', hlb: 15 });
    expect(resolveFunctionalAgent('Mono- and diglycerides')).toMatchObject({ kind: 'emulsifier' });
    expect(resolveFunctionalAgent('Egg yolk')).toMatchObject({ kind: 'emulsifier' });
  });

  test('returns null for a non-functional ingredient', () => {
    expect(resolveFunctionalAgent('Granulated Sugar')).toBeNull();
    expect(resolveFunctionalAgent('Heavy Cream')).toBeNull();
  });
});
