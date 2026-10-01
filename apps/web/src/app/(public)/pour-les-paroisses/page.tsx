import type { Metadata } from 'next';
import Link from 'next/link';
import { Layers, Megaphone, Printer, ScrollText, Send, CalendarDays } from 'lucide-react';
import { SheetCard } from '@/components/public/SheetCard';

export const metadata: Metadata = { title: 'Pour les paroisses — Churchy' };

const WRAP = 'mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8';

const sections = [
  {
    icon: Send,
    title: 'Publier vos célébrations',
    text: 'Composez chaque messe à partir de modèles, ajoutez les lectures, chants et prières de votre bibliothèque, puis publiez en un clic. Vous pouvez aussi annoncer la messe avant que la feuille soit prête.',
  },
  {
    icon: ScrollText,
    title: 'Diffuser les feuilles numériques',
    text: 'La feuille de célébration est consultable depuis un téléphone, avant la messe. Les fidèles préparent leur participation à l’avance.',
  },
  {
    icon: Megaphone,
    title: 'Publier annonces et activités',
    text: 'Horaires, inscriptions, collectes, pèlerinages, rencontres : tout est publié depuis le même espace, sur la page publique de votre paroisse.',
  },
  {
    icon: Printer,
    title: 'Réduire les impressions',
    text: 'Moins de feuilles à imprimer et à plier chaque semaine : un gain de temps pour l’équipe et de papier pour la paroisse.',
  },
  {
    icon: Layers,
    title: 'Centraliser la communication',
    text: 'Une seule adresse à donner aux fidèles pour retrouver les messes, les annonces et les activités de la paroisse.',
  },
  {
    icon: CalendarDays,
    title: 'Travailler en équipe',
    text: 'Invitez vos collaborateurs avec des rôles adaptés : administrateur, préparateur, lecteur.',
  },
];

export default function ForParishesPage() {
  return (
    <>
      <section className="bg-churchy-700 text-white">
        <div
          className={`${WRAP} grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_19rem] lg:py-20`}
        >
          <div className="space-y-5">
            <h1 className="font-playfair text-4xl font-bold leading-tight text-white sm:text-5xl">
              Publiez vos messes, vos feuilles, vos annonces et vos activités depuis un seul espace
            </h1>
            <p className="max-w-xl text-lg text-churchy-100">
              Churchy est la plateforme qui aide les paroisses à préparer et à diffuser leurs
              célébrations, sans papier superflu.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center rounded-lg bg-amber-500 px-6 font-semibold text-white hover:bg-amber-600"
              >
                Créer le compte de ma paroisse
              </Link>
              <Link
                href="/contact?sujet=PARISH"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-churchy-200/60 px-6 font-semibold text-white hover:bg-white/10"
              >
                Poser une question
              </Link>
            </div>
          </div>
          <SheetCard className="hidden rotate-2 justify-self-center lg:block lg:w-full" />
        </div>
      </section>

      <section className={`${WRAP} py-14 sm:py-20`} aria-labelledby="how-title">
        <h2 id="how-title" className="font-playfair text-3xl font-bold text-churchy-700">
          Ce que Churchy change pour votre paroisse
        </h2>
        <ul className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {sections.map(({ icon: Icon, title, text }) => (
            <li key={title} className="border-t-2 border-churchy-700 pt-4">
              <Icon className="text-amber-500" size={26} aria-hidden />
              <h3 className="mt-3 font-playfair text-lg font-semibold text-churchy-700">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-churchy-900/85">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-churchy-100">
        <div
          className={`${WRAP} flex flex-col items-start gap-4 py-12 sm:flex-row sm:items-center sm:justify-between`}
        >
          <h2 className="font-playfair text-2xl font-bold text-churchy-700">
            Prêt à publier votre première messe ?
          </h2>
          <Link
            href="/register"
            className="inline-flex h-12 items-center rounded-lg bg-churchy-500 px-6 font-semibold text-white hover:bg-churchy-700"
          >
            Créer un compte
          </Link>
        </div>
      </section>
    </>
  );
}
