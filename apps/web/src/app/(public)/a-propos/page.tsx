import type { Metadata } from 'next';
import Link from 'next/link';
import { ProsePage } from '@/components/public/ProsePage';

export const metadata: Metadata = { title: 'À propos — Churchy' };

export default function AboutPage() {
  return (
    <ProsePage
      title="À propos de Churchy"
      intro="Churchy rapproche les paroisses et leurs fidèles grâce au numérique."
    >
      <section>
        <h2>Pourquoi Churchy existe</h2>
        <p>
          Préparer une messe demande du temps, et les informations de la paroisse sont souvent
          dispersées : feuilles imprimées, panneaux, messages. Churchy les réunit en un seul
          endroit, simple à publier pour la paroisse et simple à consulter pour les fidèles.
        </p>
      </section>
      <section>
        <h2>Notre mission</h2>
        <p>
          Permettre à chaque paroisse de publier ses messes, ses feuilles de célébration, ses
          annonces et ses activités, et à chaque fidèle de les retrouver avant de venir.
        </p>
      </section>
      <p>
        Une question ?{' '}
        <Link href="/contact" className="font-medium text-churchy-500 underline">
          Écrivez-nous
        </Link>
        .
      </p>
    </ProsePage>
  );
}
