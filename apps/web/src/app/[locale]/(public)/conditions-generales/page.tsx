import type { Metadata } from 'next';
import { ProsePage } from '@/components/public/ProsePage';

export const metadata: Metadata = { title: 'Conditions générales — Churchy' };

export default function Page() {
  return (
    <ProsePage title="Conditions générales d’utilisation" provisional>
      <section>
        <h2>Objet</h2>
        <p>
          Les présentes conditions encadrent l’utilisation du site Churchy, qui permet aux paroisses
          de publier leurs célébrations, annonces et activités, et aux visiteurs de les consulter.
        </p>
      </section>
      <section>
        <h2>Comptes</h2>
        <p>
          Un compte est nécessaire pour préparer et publier des célébrations. Vous êtes responsable
          de la confidentialité de votre mot de passe.
        </p>
      </section>
      <section>
        <h2>Contenus publiés</h2>
        <p>
          Les paroisses sont responsables des contenus qu’elles publient (textes, images,
          informations pratiques) et des droits qui y sont attachés.
        </p>
      </section>
      <section>
        <h2>Responsabilité</h2>
        <p>[À compléter : limitation de responsabilité, disponibilité du service, résiliation.]</p>
      </section>
    </ProsePage>
  );
}
