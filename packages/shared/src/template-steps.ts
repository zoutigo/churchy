/** Clé stable d'une étape à partir de son titre : deux modèles qui ont « Psaume » se rapprochent par cette clé. */
export function stepKey(title: string): string {
  return (
    title
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'etape'
  );
}

/** Clés uniques dans un modèle : un titre répété reçoit un suffixe (-2, -3…). */
export function uniqueKeys(titles: string[]): string[] {
  const seen = new Map<string, number>();
  return titles.map((title) => {
    const base = stepKey(title);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}-${n}`;
  });
}
