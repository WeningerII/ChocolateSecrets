export function normalizeVendorName(name: string): string {
  const SUFFIXES = [
    'corporation', 'corp', 'incorporated', 'inc',
    'limited liability company', 'l\\.l\\.c\\.', 'llc',
    'limited', 'ltd', 'company', 'co'
  ];
  const suffixPattern = new RegExp(`\\b(${SUFFIXES.join('|')})\\b\\.?`, 'gi');
  
  return name
    .toLowerCase()
    .replace(/^the\s+/i, '')      // strip leading "the"
    .replace(suffixPattern, '')    // strip corporate suffixes
    .replace(/[^\w\s]/g, ' ')      // punctuation to space
    .replace(/\s+/g, ' ')          // collapse whitespace
    .trim();
}

export function tokenize(normalized: string): string[] {
  return normalized.split(/\s+/).filter(t => t.length > 0);
}

export function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

export function nameMatchScore(rawA: string, rawB: string): number {
  return jaccardSimilarity(
    tokenize(normalizeVendorName(rawA)),
    tokenize(normalizeVendorName(rawB))
  );
}
