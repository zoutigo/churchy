import { PublicShell } from '@/components/layout/PublicShell';
import { NotFoundPage } from '@/components/errors/NotFoundPage';

export default function NotFound() {
  return (
    <PublicShell>
      <NotFoundPage secondary={{ href: '/paroisses', label: 'Trouver une paroisse' }} />
    </PublicShell>
  );
}
