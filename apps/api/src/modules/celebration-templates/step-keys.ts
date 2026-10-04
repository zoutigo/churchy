import { stepKey } from '@churchy/shared';

/**
 * Clés de la liste finale d'étapes : une étape existante garde sa clé, une nouvelle prend celle de son
 * titre, suffixée (-2, -3…) si elle est déjà prise par une autre étape du modèle.
 */
export function uniqueStepKeys(steps: { title: string; key?: string }[]): string[] {
  const taken = new Set(steps.flatMap((s) => (s.key ? [s.key] : [])));
  return steps.map((s) => {
    if (s.key) return s.key;
    const base = stepKey(s.title);
    let key = base;
    for (let n = 2; taken.has(key); n++) key = `${base}-${n}`;
    taken.add(key);
    return key;
  });
}
