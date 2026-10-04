import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { staticPageMetadata } from '@/lib/seo.server';
import { Link } from '@/i18n/link';
import { ProsePage } from '@/components/public/ProsePage';

export const generateMetadata = (): Promise<Metadata> => staticPageMetadata('/a-propos', 'about');

export default async function AboutPage() {
  const t = await getTranslations('about');
  return (
    <ProsePage title={t('title')} intro={t('intro')}>
      <section>
        <h2>{t('whyTitle')}</h2>
        <p>{t('whyText')}</p>
      </section>
      <section>
        <h2>{t('missionTitle')}</h2>
        <p>{t('missionText')}</p>
      </section>
      <p>
        {t.rich('question', {
          link: (chunks) => (
            <Link href="/contact" className="font-medium text-churchy-500 underline">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </ProsePage>
  );
}
