'use client';
import { useParams } from 'next/navigation';
import { NotFoundPage } from '@/components/errors/NotFoundPage';

export default function ParishPageNotFound() {
  const { parishId } = useParams<{ parishId: string }>();
  return (
    <NotFoundPage
      size="inline"
      message="Cette page n’existe pas ou n’est plus disponible."
      primary={{ href: `/paroisses/${parishId}`, label: 'Retour à la paroisse' }}
      secondary={{ href: '/paroisses', label: 'Rechercher une paroisse' }}
    />
  );
}
