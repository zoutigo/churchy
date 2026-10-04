import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { staticPageMetadata } from '@/lib/seo.server';
import { ProsePage } from '@/components/public/ProsePage';

export const generateMetadata = (): Promise<Metadata> =>
  staticPageMetadata('/mentions-legales', 'legalNotice');

export default async function Page() {
  const t = await getTranslations('legalNotice');
  return (
    <ProsePage title={t('title')} provisional>
      <section>
        <h2>{t('publisherTitle')}</h2>
        <p>{t('publisherText')}</p>
      </section>
      <section>
        <h2>{t('hostTitle')}</h2>
        <p>{t('hostText')}</p>
      </section>
      <section>
        <h2>{t('contactTitle')}</h2>
        <p>{t('contactText')}</p>
      </section>
    </ProsePage>
  );
}
