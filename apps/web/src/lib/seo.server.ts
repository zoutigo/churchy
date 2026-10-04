import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { isLocale } from '@/i18n/routing';
import { pageMetadata } from './seo';

type TitleKey =
  | 'siteTitle'
  | 'parishes'
  | 'favorites'
  | 'contact'
  | 'forParishes'
  | 'about'
  | 'terms'
  | 'privacy'
  | 'legalNotice';

/**
 * Métadonnées d'une page publique statique dans la langue de la requête : titre traduit (`meta.<titleKey>`),
 * canonical + hreflang, Open Graph. `path` est le chemin **interne** de la page.
 */
export async function staticPageMetadata(path: string, titleKey: TitleKey): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations('meta'), getLocale()]);
  return pageMetadata({
    locale: isLocale(locale) ? locale : 'fr',
    path,
    title: t(titleKey),
    description: t('siteDescription'),
  });
}
