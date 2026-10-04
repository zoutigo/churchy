import type { Metadata } from 'next';
import type { PublicParish } from '@churchy/shared';
import { toLocalizedPath } from '@/i18n/paths';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/i18n/routing';

const MAX_DESCRIPTION = 200;
const SHARE_IMAGE = '/opengraph-image';
const SHARE_IMAGE_ALT = 'Churchy — Préparer. Célébrer. Unir.';

/** Texte brut d'une description (HTML nettoyé côté API) : sans balises, espaces réduits, tronqué proprement. */
export function plainDescription(html: string | null | undefined, max = MAX_DESCRIPTION): string {
  const text = (html ?? '')
    .replace(/<\/(p|div|li|h[1-6]|ul|ol|blockquote)>|<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/**
 * Titre, description et aperçu de partage (Open Graph / Twitter) d'une paroisse : le lien d'une paroisse
 * collé dans WhatsApp affiche son nom et sa ville. L'image est celle du site (opengraph-image).
 */
export function parishMetadata(
  parish: Pick<PublicParish, 'id' | 'name' | 'city' | 'description'>,
  locale: Locale = DEFAULT_LOCALE,
): Metadata {
  const title = `${parish.name} — Churchy`;
  const description =
    plainDescription(parish.description) ||
    `Messes, annonces et activités de ${parish.name} (${parish.city}).`;
  const internal = `/paroisses/${parish.id}`;
  const url = toLocalizedPath(locale, internal);
  return {
    title,
    description,
    // Chaque version de la page déclare l'autre (hreflang) ; `x-default` : le français.
    alternates: {
      canonical: url,
      languages: {
        ...Object.fromEntries(LOCALES.map((l) => [l, toLocalizedPath(l, internal)])),
        'x-default': toLocalizedPath(DEFAULT_LOCALE, internal),
      },
    },
    // Un `openGraph` de segment remplace celui du parent, image fichier comprise : on la redonne.
    openGraph: {
      type: 'website',
      locale: locale === 'en' ? 'en_US' : 'fr_FR',
      siteName: 'Churchy',
      url,
      title,
      description,
      images: [{ url: SHARE_IMAGE, width: 1200, height: 630, alt: SHARE_IMAGE_ALT }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [SHARE_IMAGE] },
  };
}
