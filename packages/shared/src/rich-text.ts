import { z } from 'zod';
import { ERR } from './constants/error-codes.constants';

/** Taille maximale d'un texte riche (HTML), images en base64 comprises. */
export const RICH_TEXT_MAX_LENGTH = 1_500_000;

const HTML_START = /^\s*<(p|h[1-6]|ul|ol|blockquote|div|table|hr|pre|img)[\s>/]/i;

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Vrai si la valeur est du HTML produit par l'éditeur (sinon : ancien texte brut). */
export function isRichHtml(value: string): boolean {
  return HTML_START.test(value);
}

/** Convertit un texte brut (anciens contenus) en HTML : paragraphes sur lignes vides, `<br>` sinon. */
export function plainTextToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/** Valeur toujours en HTML, quel que soit son format d'origine. */
export function toRichHtml(value: string): string {
  return isRichHtml(value) ? value : plainTextToHtml(value);
}

/** Texte brut d'un contenu (aperçus, contrôle de vacuité). */
export function richTextToPlain(value: string): string {
  if (!isRichHtml(value)) return value.trim();
  return value
    .replace(/<\/(p|h[1-6]|li|blockquote|tr|div)>|<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Un contenu est non vide s'il contient du texte ou une image. */
export function hasRichContent(value: string): boolean {
  return richTextToPlain(value).length > 0 || /<img[\s>]/i.test(value);
}

/** Champ texte riche obligatoire (HTML de l'éditeur ou texte brut). */
export const richTextSchema = (emptyMessage: string) =>
  z.string().max(RICH_TEXT_MAX_LENGTH, ERR.contentTooLarge).refine(hasRichContent, emptyMessage);
