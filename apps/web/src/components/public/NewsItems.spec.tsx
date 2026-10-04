import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActivityItem } from './ActivityItem';
import { AnnouncementItem } from './AnnouncementItem';
import { EmptyState } from './EmptyState';

describe('AnnouncementItem', () => {
  const announcement = {
    id: 'a1',
    title: 'Changement d’horaire',
    summary: 'La messe est avancée',
    body: 'Dès dimanche, 9 h.\nMerci.',
    imageUrl: null,
    publishedAt: '2026-09-30T12:00:00.000Z',
  };

  it('affiche titre, résumé, contenu', () => {
    render(<AnnouncementItem announcement={announcement} />);
    expect(screen.getByRole('heading', { name: 'Changement d’horaire' })).toBeInTheDocument();
    expect(screen.getByText('La messe est avancée')).toBeInTheDocument();
    expect(screen.getByText(/Dès dimanche, 9 h\./)).toBeInTheDocument();
  });

  it('n’interprète pas le HTML du contenu (pas d’injection)', () => {
    const { container } = render(
      <AnnouncementItem
        announcement={{ ...announcement, body: '<script>alert(1)</script><b>gras</b>' }}
      />,
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
    expect(screen.getByText(/<script>alert\(1\)<\/script>/)).toBeInTheDocument();
  });

  it('affiche l’image seulement si elle existe', () => {
    const { container, rerender } = render(<AnnouncementItem announcement={announcement} />);
    expect(container.querySelector('img')).toBeNull();
    rerender(
      <AnnouncementItem announcement={{ ...announcement, imageUrl: 'https://x.fr/a.jpg' }} />,
    );
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://x.fr/a.jpg');
  });
});

describe('ActivityItem', () => {
  const activity = {
    id: 'x1',
    title: 'Groupe de jeunes',
    description: 'Rencontre mensuelle',
    startsAt: '2026-11-01T12:00:00.000Z',
    location: 'Salle paroissiale',
    imageUrl: null,
  };

  it('affiche titre, description, lieu et un horodatage machine', () => {
    const { container } = render(<ActivityItem activity={activity} />);
    expect(screen.getByRole('heading', { name: 'Groupe de jeunes' })).toBeInTheDocument();
    expect(screen.getByText('Rencontre mensuelle')).toBeInTheDocument();
    expect(screen.getByText('Salle paroissiale')).toBeInTheDocument();
    expect(container.querySelector('time')).toHaveAttribute('datetime', activity.startsAt);
  });

  it('sans lieu, n’affiche pas de ligne de lieu', () => {
    render(<ActivityItem activity={{ ...activity, location: null }} />);
    expect(screen.queryByText('Salle paroissiale')).not.toBeInTheDocument();
  });
});

describe('EmptyState', () => {
  it('explique et propose une action', () => {
    render(
      <EmptyState
        title="Aucune paroisse"
        hint="Essayez une autre ville."
        action={{ href: '/paroisses', label: 'Voir toutes les paroisses' }}
      />,
    );
    expect(screen.getByText('Aucune paroisse')).toBeInTheDocument();
    expect(screen.getByText('Essayez une autre ville.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir toutes les paroisses' })).toHaveAttribute(
      'href',
      '/fr/paroisses',
    );
  });
});
