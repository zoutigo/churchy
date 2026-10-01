import type { Metadata } from 'next';
import { ProsePage } from '@/components/public/ProsePage';

export const metadata: Metadata = { title: 'Mentions légales — Churchy' };

export default function Page() {
  return (
    <ProsePage title="Mentions légales" provisional>
      <section>
        <h2>Éditeur du site</h2>
        <p>
          [À compléter : dénomination, forme juridique, adresse, numéro d’immatriculation, directeur
          de la publication.]
        </p>
      </section>
      <section>
        <h2>Hébergeur</h2>
        <p>[À compléter : nom et adresse de l’hébergeur.]</p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>Pour toute question, utilisez la page Contact du site.</p>
      </section>
    </ProsePage>
  );
}
