import { NotFoundPage } from '@/components/errors/NotFoundPage';

export default function ParishNotFound() {
  return (
    <NotFoundPage
      title="Paroisse introuvable"
      message="Cette paroisse n’existe pas ou n’est plus disponible. Essayez une recherche par nom ou par ville."
      primary={{ href: '/paroisses', label: 'Rechercher une paroisse' }}
      secondary={{ href: '/', label: 'Retour à l’accueil' }}
    />
  );
}
