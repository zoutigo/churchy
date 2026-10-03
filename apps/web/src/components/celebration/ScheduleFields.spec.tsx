import { useState } from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { emptyDraft, type ScheduleDraft } from '@/lib/schedule-draft';
import { ScheduleFields } from './ScheduleFields';

function Harness({ initial = emptyDraft() }: { initial?: ScheduleDraft }) {
  const [value, setValue] = useState<ScheduleDraft>(initial);
  return <ScheduleFields value={value} onChange={setValue} timezone="Europe/Paris" />;
}

describe('ScheduleFields', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-03T12:00:00.000Z') });
  });
  afterEach(() => vi.useRealTimers());

  const user = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

  it('propose d’abord une date, avec l’heure habituelle, et le fuseau de la paroisse', () => {
    render(<Harness />);
    expect(screen.getByLabelText('Date')).toHaveValue('');
    expect(screen.getByLabelText('Heure')).toHaveValue('10:00');
    expect(screen.getByText(/Europe\/Paris/)).toBeInTheDocument();
    expect(screen.getByTestId('schedule-preview')).toBeEmptyDOMElement();
  });

  it('borne les champs date : pas avant aujourd’hui, pas après un an', () => {
    render(<Harness />);
    const date = screen.getByLabelText('Date');
    expect(date).toHaveAttribute('min', '2026-10-03');
    expect(date).toHaveAttribute('max', '2027-10-03');
  });

  it('ajoute et retire des dates, et compte celles qui seront créées', async () => {
    const u = user();
    render(<Harness />);
    await u.click(screen.getByRole('button', { name: 'Ajouter une date' }));
    await u.type(screen.getByLabelText('Date 1'), '2026-10-10');
    await u.type(screen.getByLabelText('Date 2'), '2026-10-17');
    expect(screen.getByTestId('schedule-preview')).toHaveTextContent('2 dates seront créées');

    await u.click(screen.getByRole('button', { name: 'Retirer la date 2' }));
    expect(screen.getByTestId('schedule-preview')).toHaveTextContent('1 date sera créée');
    expect(screen.queryByRole('button', { name: /Retirer la date/ })).not.toBeInTheDocument();
  });

  it('une date passée est refusée tout de suite, avec le message de l’API', async () => {
    const u = user();
    render(<Harness />);
    await u.type(screen.getByLabelText('Date'), '2026-09-01');
    expect(screen.getByRole('alert')).toHaveTextContent('Impossible de programmer une date passée');
  });

  it('récurrence : jours, début, fin et heure ; aperçu des dates', async () => {
    const u = user();
    render(<Harness />);
    await u.click(screen.getByRole('button', { name: 'Chaque semaine' }));

    // Dimanche est coché par défaut ; on ajoute le mercredi.
    expect(screen.getByRole('button', { name: 'dimanche' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'mercredi' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await u.click(screen.getByRole('button', { name: 'mercredi' }));
    expect(screen.getByRole('button', { name: 'mercredi' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await u.type(screen.getByLabelText('Début'), '2026-10-04'); // dimanche
    await u.type(screen.getByLabelText('Fin'), '2026-10-14'); // mercredi
    // dim. 4, mer. 7, dim. 11, mer. 14
    expect(screen.getByTestId('schedule-preview')).toHaveTextContent('4 dates seront créées');
    expect(screen.getByTestId('schedule-preview')).toHaveTextContent(
      'dimanche 4 octobre 2026 à 10:00',
    );
  });

  it('récurrence : décocher tous les jours est signalé', async () => {
    const u = user();
    render(<Harness />);
    await u.click(screen.getByRole('button', { name: 'Chaque semaine' }));
    await u.type(screen.getByLabelText('Début'), '2026-10-04');
    await u.type(screen.getByLabelText('Fin'), '2026-10-30');
    await u.click(screen.getByRole('button', { name: 'dimanche' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Choisissez au moins un jour');
  });

  it('plus de six dates : l’aperçu se limite et indique le reste', async () => {
    const u = user();
    render(<Harness />);
    await u.click(screen.getByRole('button', { name: 'Chaque semaine' }));
    await u.type(screen.getByLabelText('Début'), '2026-10-04');
    await u.type(screen.getByLabelText('Fin'), '2026-12-27');
    expect(screen.getByTestId('schedule-preview')).toHaveTextContent('13 dates seront créées');
    expect(screen.getByTestId('schedule-preview')).toHaveTextContent('… et 7 autres');
  });

  it('changer de mode repart d’un brouillon vide', async () => {
    const u = user();
    render(<Harness />);
    await u.type(screen.getByLabelText('Date'), '2026-10-10');
    await u.click(screen.getByRole('button', { name: 'Chaque semaine' }));
    await u.click(screen.getByRole('button', { name: 'Une ou plusieurs dates' }));
    expect(screen.getByLabelText('Date')).toHaveValue('');
  });
});
