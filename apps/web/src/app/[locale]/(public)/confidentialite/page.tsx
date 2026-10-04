import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { staticPageMetadata } from '@/lib/seo.server';
import { ProsePage } from '@/components/public/ProsePage';

export const generateMetadata = (): Promise<Metadata> =>
  staticPageMetadata('/confidentialite', 'privacy');

export default async function Page() {
  const t = await getTranslations('privacy');
  return (
    <ProsePage title={t('title')} provisional>
      <section>
        <h2>{t('collectedTitle')}</h2>
        <p>{t('collectedText')}</p>
      </section>
      <section>
        <h2>{t('useTitle')}</h2>
        <p>{t('useText')}</p>
      </section>
      <section>
        <h2>{t('cookiesTitle')}</h2>
        <p>{t('cookiesText')}</p>
      </section>
      <section>
        <h2>{t('rightsTitle')}</h2>
        <p>{t('rightsText')}</p>
      </section>
    </ProsePage>
  );
}
