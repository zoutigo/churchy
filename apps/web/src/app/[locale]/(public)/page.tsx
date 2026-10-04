import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/link';
import { CalendarDays, Check, Church, Megaphone, ScrollText } from 'lucide-react';
import { FavoritesShelf } from '@/components/favorites/FavoriteParishes';
import { ParishSearchForm } from '@/components/public/ParishSearchForm';
import { SheetCard } from '@/components/public/SheetCard';
import { staticPageMetadata } from '@/lib/seo.server';

export const generateMetadata = (): Promise<Metadata> => staticPageMetadata('/', 'siteTitle');

const WRAP = 'mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8';

const FEATURES = [
  { key: 'masses', icon: Church },
  { key: 'sheets', icon: ScrollText },
  { key: 'announcements', icon: Megaphone },
  { key: 'activities', icon: CalendarDays },
] as const;
const STEPS = ['one', 'two', 'three', 'four'] as const;
const BENEFITS = ['paper', 'modern', 'central'] as const;

export default function HomePage() {
  const t = useTranslations('home');
  return (
    <>
      {/* La recherche est le premier élément de la page */}
      <section className="bg-churchy-700 text-white">
        <div
          className={`${WRAP} grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-16 lg:py-24`}
        >
          <div className="space-y-6">
            <h1 className="font-playfair text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
              {t('title')}
            </h1>
            <p className="max-w-xl text-base text-churchy-100 sm:text-lg">{t('intro')}</p>
            <ParishSearchForm id="hero-search" />
          </div>
          <SheetCard className="hidden rotate-2 justify-self-center lg:block lg:w-full" />
        </div>
      </section>

      {/* Raccourci des favoris (rien tant qu'il n'y en a pas) : plus besoin de relancer la recherche */}
      <FavoritesShelf />

      <section className={`${WRAP} py-14 sm:py-20`} aria-labelledby="features-title">
        <h2 id="features-title" className="font-playfair text-3xl font-bold text-churchy-700">
          {t('featuresTitle')}
        </h2>
        <ul className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ key, icon: Icon }) => (
            <li key={key} className="border-t-2 border-churchy-700 pt-4">
              <Icon className="text-amber-500" size={28} aria-hidden />
              <h3 className="mt-3 font-playfair text-lg font-semibold text-churchy-700">
                {t(`features.${key}.title`)}
              </h3>
              <p className="mt-1 text-sm text-churchy-900/80">{t(`features.${key}.text`)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-churchy-100" aria-labelledby="prepare-title">
        <div className={`${WRAP} grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-2 lg:gap-16`}>
          <div>
            <h2 id="prepare-title" className="font-playfair text-3xl font-bold text-churchy-700">
              {t('prepareTitle')}
            </h2>
            <ol className="mt-6 space-y-4">
              {STEPS.map((step, i) => (
                <li key={step} className="flex items-start gap-4">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-churchy-700 text-sm font-semibold text-white"
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <span className="pt-0.5 text-churchy-900">{t(`steps.${step}`)}</span>
                </li>
              ))}
            </ol>
          </div>
          <SheetCard className="justify-self-center sm:max-w-sm lg:justify-self-end lg:-rotate-2 lg:w-full" />
        </div>
      </section>

      <section className={`${WRAP} py-14 sm:py-20`} aria-labelledby="parishes-title">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div className="space-y-4">
            <h2 id="parishes-title" className="font-playfair text-3xl font-bold text-churchy-700">
              {t('parishesTitle')}
            </h2>
            <p className="max-w-xl text-churchy-900/85">{t('parishesText')}</p>
            <Link
              href="/pour-les-paroisses"
              className="inline-flex h-12 items-center rounded-lg bg-churchy-500 px-6 font-semibold text-white transition-colors hover:bg-churchy-700"
            >
              {t('parishesCta')}
            </Link>
          </div>
          <ul className="space-y-3">
            {BENEFITS.map((b) => (
              <li
                key={b}
                className="flex items-start gap-3 rounded-xl border border-churchy-100 bg-white p-4"
              >
                <Check className="mt-0.5 shrink-0 text-churchy-300" size={20} aria-hidden />
                <span className="text-churchy-900">{t(`benefits.${b}`)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-churchy-700 text-white" aria-labelledby="final-cta-title">
        <div className={`${WRAP} space-y-6 py-12 sm:py-16`}>
          <h2 id="final-cta-title" className="font-playfair text-3xl font-bold text-white">
            {t('finalTitle')}
          </h2>
          <div className="max-w-3xl">
            <ParishSearchForm id="final-search" />
          </div>
        </div>
      </section>
    </>
  );
}
