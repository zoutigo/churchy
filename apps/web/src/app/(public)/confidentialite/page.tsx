import type { Metadata } from 'next';
import { ProsePage } from '@/components/public/ProsePage';

export const metadata: Metadata = { title: 'Confidentialité — Churchy' };

export default function Page() {
  return (
    <ProsePage title="Politique de confidentialité" provisional>
      <section>
        <h2>Données collectées</h2>
        <p>
          Pour un compte : nom, prénom, adresse email et mot de passe (stocké sous forme chiffrée).
          Pour le formulaire de contact : nom, email et message.
        </p>
      </section>
      <section>
        <h2>Utilisation</h2>
        <p>
          Ces données servent uniquement à fournir le service (connexion, emails de vérification et
          de réinitialisation, réponse à vos messages).
        </p>
      </section>
      <section>
        <h2>Cookies</h2>
        <p>
          Churchy utilise uniquement des cookies nécessaires à la session de connexion. Aucun cookie
          publicitaire n’est utilisé.
        </p>
      </section>
      <section>
        <h2>Vos droits</h2>
        <p>
          Vous pouvez demander l’accès, la rectification ou la suppression de vos données via la
          page Contact. [À compléter : responsable du traitement, durée de conservation.]
        </p>
      </section>
    </ProsePage>
  );
}
