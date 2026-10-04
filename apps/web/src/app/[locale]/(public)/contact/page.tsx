import { getTranslations } from 'next-intl/server';
import { staticPageMetadata } from '@/lib/seo.server';
import type { Metadata } from 'next';
import { CONTACT_TOPICS, type ContactTopic } from '@churchy/shared';
import { ContactForm } from '@/components/public/ContactForm';

export const generateMetadata = (): Promise<Metadata> => staticPageMetadata('/contact', 'contact');

interface Props {
  searchParams: { sujet?: string };
}

export default async function ContactPage({ searchParams }: Props) {
  const t = await getTranslations('contactPage');
  const topic = CONTACT_TOPICS.includes(searchParams.sujet as ContactTopic)
    ? (searchParams.sujet as ContactTopic)
    : 'QUESTION';

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:grid lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:px-8">
      <div className="space-y-3 pb-8 lg:pb-0">
        <h1 className="font-playfair text-3xl font-bold text-churchy-700 sm:text-4xl">
          {t('title')}
        </h1>
        <p className="max-w-md text-churchy-900/85">{t('intro')}</p>
      </div>
      <div className="rounded-xl border border-churchy-100 bg-white p-5 sm:p-8">
        <ContactForm defaultTopic={topic} />
      </div>
    </div>
  );
}
