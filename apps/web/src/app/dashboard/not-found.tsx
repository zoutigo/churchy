import { NotFoundPage } from '@/components/errors/NotFoundPage';

export default function DashboardNotFound() {
  return (
    <NotFoundPage
      size="inline"
      title="Page introuvable"
      message="Cette page n’existe pas, ou vous n’y avez pas accès. Retrouvez vos paroisses depuis le tableau de bord."
      primary={{ href: '/dashboard', label: 'Tableau de bord' }}
      secondary={{ href: '/dashboard/parishes', label: 'Mes paroisses' }}
    />
  );
}
