import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { Toaster } from '@/components/ui/toaster';
import { notify } from './notify';

describe('notify + Toaster', () => {
  it('affiche un toast de succès avec son titre et sa description', async () => {
    render(<Toaster />);
    act(() => {
      notify.success('Paroisse créée', '« Saint Joseph » est prête.');
    });
    expect(await screen.findByText('Paroisse créée')).toBeInTheDocument();
    expect(screen.getByText('« Saint Joseph » est prête.')).toBeInTheDocument();
  });

  it('affiche un toast d’erreur distinct (variante destructive)', async () => {
    render(<Toaster />);
    act(() => {
      notify.error('Création impossible', 'Serveur indisponible');
    });
    const title = await screen.findByText('Création impossible');
    expect(screen.getByText('Serveur indisponible')).toBeInTheDocument();
    expect(title.closest('li')).toHaveClass('destructive');
  });

  it('le succès est visuellement différent de l’erreur et de la variante par défaut', async () => {
    render(<Toaster />);
    act(() => {
      notify.success('OK ici');
    });
    const li = (await screen.findByText('OK ici')).closest('li');
    expect(li).toHaveClass('bg-churchy-50');
    expect(li).not.toHaveClass('destructive');
  });
});
