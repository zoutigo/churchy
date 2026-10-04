import { isRichHtml, type Content, type ContentType } from '@churchy/shared';

export const ALL_TYPES = 'ALL';
export type ContentTypeFilter = typeof ALL_TYPES | ContentType;

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** Texte brut d'un corps (HTML du texte riche → texte), pour la recherche. */
const plainText = (body: string) => (isRichHtml(body) ? body.replace(/<[^>]*>/g, ' ') : body);

/**
 * Filtre la bibliothèque : par type, puis par recherche (tous les mots, titre ou texte, sans tenir
 * compte de la casse ni des accents).
 */
export function filterContents(
  contents: Content[],
  query: string,
  type: ContentTypeFilter,
): Content[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return contents.filter((c) => {
    if (type !== ALL_TYPES && c.type !== type) return false;
    if (words.length === 0) return true;
    const haystack = normalize(`${c.title} ${plainText(c.body)}`);
    return words.every((w) => haystack.includes(w));
  });
}
