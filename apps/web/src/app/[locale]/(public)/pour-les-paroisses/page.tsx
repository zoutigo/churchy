import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { staticPageMetadata } from '@/lib/seo.server';
import { Link } from '@/i18n/link';
import { Layers, Megaphone, Printer, ScrollText, Send, CalendarDays } from 'lucide-react';
import { SheetCard } from '@/components/public/SheetCard';

export const generateMetadata = (): Promise<Metadata> =>
  staticPageMetadata('/pour-les-paroisses', 'forParishes');

const WRAP = 'mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8';

const SECTIONS = [
  { key: 'publish', icon: Send },
  { key: 'sheets', icon: ScrollText },
  { key: 'news', icon: Megaphone },
  { key: 'paper', icon: Printer },
  { key: 'central', icon: Layers },
  { key: 'team', icon: CalendarDays },
] as const;

export default async function ForParishesPage() {
  const t = await getTranslations('forParishes');
  return (
    <>
      <section className="bg-churchy-700 text-white">
        <div
          className={`${WRAP} grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_19rem] lg:py-20`}
        >
          <div className="space-y-5">
            <h1 className="font-playfair text-4xl font-bold leading-tight text-white sm:text-5xl">
              {t('title')}
            </h1>
            <p className="max-w-xl text-lg text-churchy-100">{t('intro')}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center rounded-lg bg-amber-500 px-6 font-semibold text-white hover:bg-amber-600"
              >
                {t('create')}
              </Link>
              <Link
                href="/contact?sujet=PARISH"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-churchy-200/60 px-6 font-semibold text-white hover:bg-white/10"
              >
                {t('ask')}
              </Link>
            </div>
          </div>
          <SheetCard className="hidden rotate-2 justify-self-center lg:block lg:w-full" />
        </div>
      </section>

      <section className={`${WRAP} py-14 sm:py-20`} aria-labelledby="how-title">
        <h2 id="how-title" className="font-playfair text-3xl font-bold text-churchy-700">
          {t('changesTitle')}
        </h2>
        <ul className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map(({ key, icon: Icon }) => (
            <li key={key} className="border-t-2 border-churchy-700 pt-4">
              <Icon className="text-amber-500" size={26} aria-hidden />
              <h3 className="mt-3 font-playfair text-lg font-semibold text-churchy-700">
                {t(`sections.${key}.title`)}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-churchy-900/85">
                {t(`sections.${key}.text`)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-churchy-100">
        <div
          className={`${WRAP} flex flex-col items-start gap-4 py-12 sm:flex-row sm:items-center sm:justify-between`}
        >
          <h2 className="font-playfair text-2xl font-bold text-churchy-700">{t('readyTitle')}</h2>
          <Link
            href="/register"
            className="inline-flex h-12 items-center rounded-lg bg-churchy-500 px-6 font-semibold text-white hover:bg-churchy-700"
          >
            {t('createShort')}
          </Link>
        </div>
      </section>
    </>
  );
}
