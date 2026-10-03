import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CelebrationType, type CelebrationListItem } from '@churchy/shared';
import { EndingSoonDialog } from './EndingSoonDialog';

const item = (id: string, over: Partial<CelebrationListItem> = {}): CelebrationListItem => ({
  id,
  title: `Série ${id}`,
  type: CelebrationType.SUNDAY_MASS,
  location: null,
  announced: true,
  archivedAt: null,
  defaultTemplate: null,
  occurrenceCount: 4,
  upcomingCount: 1,
  nextOccurrence: null,
  lastOccurrenceAt: '2026-10-20T09:00:00.000Z',
  endingSoon: true,
  ...over,
});

beforeEach(() => window.sessionStorage.clear());

describe('EndingSoonDialog', () => {
  it('ne s’affiche pas quand aucune série ne se termine bientôt', () => {
    render(
      <EndingSoonDialog
        parishId="p1"
        timezone="Europe/Paris"
        celebrations={[item('a', { endingSoon: false })]}
      />,
    );
    expect(screen.queryByTestId('ending-soon-dialog')).not.toBeInTheDocument();
  });

  it('liste les séries concernées avec un lien pour prolonger', () => {
    render(
      <EndingSoonDialog
        parishId="p1"
        timezone="Europe/Paris"
        celebrations={[item('a'), item('b'), item('c', { endingSoon: false })]}
      />,
    );
    const dialog = screen.getByTestId('ending-soon-dialog');
    expect(dialog).toHaveTextContent('2 séries se terminent bientôt');
    expect(dialog).toHaveTextContent('Série a');
    expect(dialog).toHaveTextContent('Série b');
    expect(dialog).not.toHaveTextContent('Série c');
    expect(dialog).toHaveTextContent('Dernière date : mardi 20 octobre 2026');
    expect(screen.getAllByRole('link', { name: 'Prolonger la série' })[0]).toHaveAttribute(
      'href',
      '/dashboard/parishes/p1/celebrations/a?prolonger=1',
    );
  });

  it('singulier pour une seule série', () => {
    render(<EndingSoonDialog parishId="p1" timezone="UTC" celebrations={[item('a')]} />);
    expect(screen.getByText('Une série se termine bientôt')).toBeInTheDocument();
  });

  it('« Plus tard » ferme la fenêtre et elle ne revient pas dans la session', async () => {
    const user = userEvent.setup();
    const props = { parishId: 'p1', timezone: 'UTC', celebrations: [item('a')] };
    const { unmount } = render(<EndingSoonDialog {...props} />);
    await user.click(screen.getByRole('button', { name: 'Plus tard' }));
    expect(screen.queryByTestId('ending-soon-dialog')).not.toBeInTheDocument();
    unmount();

    render(<EndingSoonDialog {...props} />);
    expect(screen.queryByTestId('ending-soon-dialog')).not.toBeInTheDocument();
  });

  it('réapparaît si une autre série vient à se terminer (état différent)', async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <EndingSoonDialog parishId="p1" timezone="UTC" celebrations={[item('a')]} />,
    );
    await user.click(screen.getByRole('button', { name: 'Plus tard' }));
    unmount();

    render(<EndingSoonDialog parishId="p1" timezone="UTC" celebrations={[item('a'), item('b')]} />);
    expect(screen.getByTestId('ending-soon-dialog')).toBeInTheDocument();
  });

  it('le rappel est propre à chaque paroisse', async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <EndingSoonDialog parishId="p1" timezone="UTC" celebrations={[item('a')]} />,
    );
    await user.click(screen.getByRole('button', { name: 'Plus tard' }));
    unmount();
    render(<EndingSoonDialog parishId="p2" timezone="UTC" celebrations={[item('a')]} />);
    expect(screen.getByTestId('ending-soon-dialog')).toBeInTheDocument();
  });
});
