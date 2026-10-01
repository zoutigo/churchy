/**
 * Valeur d'un champ `datetime-local` (« 2026-10-04T09:30 », heure locale, sans fuseau) → ISO 8601 UTC
 * attendu par l'API. Renvoie null si la saisie est vide ou invalide.
 */
export function localInputToIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
