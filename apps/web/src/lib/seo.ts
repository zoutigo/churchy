import type { Metadata } from 'next';
import type { PublicParish } from '@churchy/shared';
import { toLocalizedPath } from '@/i18n/paths';
import { DEFAULT_LOCALE, LOCALES, type Locale } from '@/i18n/routing';

const MAX_DESCRIPTION = 200;
/** Image d'aperçu (1200×630) générée par `app/[locale]/opengraph-image.tsx`, une par langue. */
const shareImage = (locale: Locale) => `/${locale}/opengraph-image`;
const SHARE_IMAGE_ALT = 'Churchy';
const OG_LOCALES: Record<Locale, string> = { fr: 'fr_FR', en: 'en_US' };

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

/** Canonical de la page dans sa langue, et `hreflang` vers chacune de ses versions (`x-default` : le français). */
export function localizedAlternates(path: string, locale: Locale): Metadata['alternates'] {
  return {
    canonical: toLocalizedPath(locale, path),
    languages: {
      ...Object.fromEntries(LOCALES.map((l) => [l, toLocalizedPath(l, path)])),
      'x-default': toLocalizedPath(DEFAULT_LOCALE, path),
    },
  };
}

/**
 * Métadonnées complètes d'une page publique : titre, description, canonical + hreflang, Open Graph et
 * Twitter Card (un `openGraph` de segment remplace celui du parent, image comprise : on la redonne).
 * `path` est le chemin **interne** (`/paroisses/12`).
 */
export function pageMetadata({
  locale,
  path,
  title,
  description,
}: {
  locale: Locale;
  path: string;
  title: string;
  description: string;
}): Metadata {
  const image = shareImage(locale);
  return {
    title,
    description,
    alternates: localizedAlternates(path, locale),
    openGraph: {
      type: 'website',
      locale: OG_LOCALES[locale],
      alternateLocale: LOCALES.filter((l) => l !== locale).map((l) => OG_LOCALES[l]),
      siteName: 'Churchy',
      url: toLocalizedPath(locale, path),
      title,
      description,
      images: [{ url: image, width: 1200, height: 630, alt: SHARE_IMAGE_ALT }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

const PARISH_FALLBACK: Record<Locale, (name: string, city: string) => string> = {
  fr: (name, city) => `Messes, annonces et activités de ${name} (${city}).`,
  en: (name, city) => `Masses, announcements and activities of ${name} (${city}).`,
};

/**
 * Titre, description et aperçu de partage d'une paroisse : le lien d'une paroisse collé dans WhatsApp
 * affiche son nom et sa ville, dans la langue de la page.
 */
export function parishMetadata(
  parish: Pick<PublicParish, 'id' | 'name' | 'city' | 'description'>,
  locale: Locale = DEFAULT_LOCALE,
): Metadata {
  return pageMetadata({
    locale,
    path: `/paroisses/${parish.id}`,
    title: `${parish.name} — Churchy`,
    description:
      plainDescription(parish.description) || PARISH_FALLBACK[locale](parish.name, parish.city),
  });
}
