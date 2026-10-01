import Link from 'next/link';
import { CalendarDays, Check, Church, Megaphone, ScrollText } from 'lucide-react';
import { ParishSearchForm } from '@/components/public/ParishSearchForm';
import { SheetCard } from '@/components/public/SheetCard';

const WRAP = 'mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8';

const features = [
  {
    icon: Church,
    title: 'Messes',
    text: 'Consultez les prochaines célébrations de votre paroisse.',
  },
  {
    icon: ScrollText,
    title: 'Feuilles de célébration',
    text: 'Voyez quelles feuilles sont disponibles avant la messe.',
  },
  {
    icon: Megaphone,
    title: 'Annonces',
    text: 'Retrouvez les informations importantes publiées par la paroisse.',
  },
  {
    icon: CalendarDays,
    title: 'Activités',
    text: 'Découvrez les événements, rencontres et activités à venir.',
  },
];

const steps = [
  'La paroisse publie sa célébration.',
  'La feuille est mise à disposition avant la messe.',
  'Vous préparez votre participation à l’avance.',
  'Le jour de la messe, plus besoin de chercher une feuille papier.',
];

const benefits = [
  'Réduire les impressions papier',
  'Moderniser la diffusion des feuilles de célébration',
  'Centraliser les informations de la paroisse',
];

export default function HomePage() {
  return (
    <>
      {/* La recherche est le premier élément de la page */}
      <section className="bg-churchy-700 text-white">
        <div
          className={`${WRAP} grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-16 lg:py-24`}
        >
          <div className="space-y-6">
            <h1 className="font-playfair text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
              Votre paroisse, à portée de main
            </h1>
            <p className="max-w-xl text-base text-churchy-100 sm:text-lg">
              Retrouvez les messes, les feuilles de célébration, les annonces et les activités de
              votre paroisse.
            </p>
            <ParishSearchForm id="hero-search" />
          </div>
          <SheetCard className="hidden rotate-2 justify-self-center lg:block lg:w-full" />
        </div>
      </section>

      <section className={`${WRAP} py-14 sm:py-20`} aria-labelledby="features-title">
        <h2 id="features-title" className="font-playfair text-3xl font-bold text-churchy-700">
          Toute votre paroisse, au même endroit
        </h2>
        <ul className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, text }) => (
            <li key={title} className="border-t-2 border-churchy-700 pt-4">
              <Icon className="text-amber-500" size={28} aria-hidden />
              <h3 className="mt-3 font-playfair text-lg font-semibold text-churchy-700">{title}</h3>
              <p className="mt-1 text-sm text-churchy-900/80">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-churchy-100" aria-labelledby="prepare-title">
        <div className={`${WRAP} grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-2 lg:gap-16`}>
          <div>
            <h2 id="prepare-title" className="font-playfair text-3xl font-bold text-churchy-700">
              Préparez votre messe avant même d’arriver à l’église.
            </h2>
            <ol className="mt-6 space-y-4">
              {steps.map((s, i) => (
                <li key={s} className="flex items-start gap-4">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-churchy-700 text-sm font-semibold text-white"
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <span className="pt-0.5 text-churchy-900">{s}</span>
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
              Vous représentez une paroisse ?
            </h2>
            <p className="max-w-xl text-churchy-900/85">
              Churchy vous permet de publier vos messes, vos feuilles de célébration, vos annonces
              et vos activités depuis un seul espace.
            </p>
            <Link
              href="/pour-les-paroisses"
              className="inline-flex h-12 items-center rounded-lg bg-churchy-500 px-6 font-semibold text-white transition-colors hover:bg-churchy-700"
            >
              Découvrir Churchy pour les paroisses
            </Link>
          </div>
          <ul className="space-y-3">
            {benefits.map((b) => (
              <li
                key={b}
                className="flex items-start gap-3 rounded-xl border border-churchy-100 bg-white p-4"
              >
                <Check className="mt-0.5 shrink-0 text-churchy-300" size={20} aria-hidden />
                <span className="text-churchy-900">{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-churchy-700 text-white" aria-labelledby="final-cta-title">
        <div className={`${WRAP} space-y-6 py-12 sm:py-16`}>
          <h2 id="final-cta-title" className="font-playfair text-3xl font-bold text-white">
            Trouvez votre paroisse sur Churchy
          </h2>
          <div className="max-w-3xl">
            <ParishSearchForm id="final-search" />
          </div>
        </div>
      </section>
    </>
  );
}
