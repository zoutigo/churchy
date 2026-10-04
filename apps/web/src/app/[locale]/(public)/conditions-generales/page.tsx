import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { staticPageMetadata } from '@/lib/seo.server';
import { ProsePage } from '@/components/public/ProsePage';

export const generateMetadata = (): Promise<Metadata> =>
  staticPageMetadata('/conditions-generales', 'terms');

export default async function Page() {
  const t = await getTranslations('terms');
  return (
    <ProsePage title={t('title')} provisional>
      <section>
        <h2>{t('purposeTitle')}</h2>
        <p>{t('purposeText')}</p>
      </section>
      <section>
        <h2>{t('accountsTitle')}</h2>
        <p>{t('accountsText')}</p>
      </section>
      <section>
        <h2>{t('contentTitle')}</h2>
        <p>{t('contentText')}</p>
      </section>
      <section>
        <h2>{t('liabilityTitle')}</h2>
        <p>{t('liabilityText')}</p>
      </section>
    </ProsePage>
  );
}
