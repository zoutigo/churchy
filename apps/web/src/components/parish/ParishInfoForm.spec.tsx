import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Parish } from '@churchy/shared';
import { ParishInfoForm } from './ParishInfoForm';

const update = vi.fn();
vi.mock('@/lib/api/parishes.api', () => ({
  parishesApi: { update: (...a: unknown[]) => update(...a) },
}));

const parish = {
  id: 'p1',
  name: 'Saint-Pierre',
  slug: 'saint-pierre',
  city: 'Lyon',
  country: 'France',
  address: '1 rue Neuve',
  phone: null,
  createdAt: new Date(),
  updatedAt: new Date(),
} as Parish;

describe('ParishInfoForm', () => {
  beforeEach(() => {
    update.mockReset();
  });

  it('préremplit avec les informations actuelles', () => {
    render(<ParishInfoForm parish={parish} />);
    expect(screen.getByLabelText('Adresse')).toHaveValue('1 rue Neuve');
    expect(screen.getByLabelText('Téléphone')).toHaveValue('');
  });

  it('enregistre les modifications ; un champ vidé est envoyé comme effacé (null)', async () => {
    update.mockResolvedValue({ ...parish, address: null, phone: '+33 4 12 34 56 78' });
    const onSaved = vi.fn();
    const user = userEvent.setup();
    render(<ParishInfoForm parish={parish} onSaved={onSaved} />);
    await user.clear(screen.getByLabelText('Adresse'));
    await user.type(screen.getByLabelText('Téléphone'), '0412345678');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const [id, dto] = update.mock.calls[0];
    expect(id).toBe('p1');
    expect(dto.address).toBeNull();
    expect(dto.phone).toBe('+33 4 12 34 56 78');
  });

  it('guide la saisie du téléphone : indicatif, exemple du pays et masque', async () => {
    const user = userEvent.setup();
    render(
      <ParishInfoForm
        parish={{ ...parish, country: 'Cameroun', region: 'Centre', city: 'Yaoundé' }}
      />,
    );
    const phone = screen.getByLabelText('Téléphone');
    expect(screen.getByTestId('phone-dial')).toHaveTextContent('+237');
    expect(phone).toHaveAttribute('placeholder', '6 77 12 34 56');
    await user.type(phone, '677123456');
    expect(phone).toHaveValue('6 77 12 34 56');
  });

  it('refuse un numéro incomplet pour le pays', async () => {
    const user = userEvent.setup();
    render(<ParishInfoForm parish={parish} />);
    await user.type(screen.getByLabelText('Téléphone'), '0412');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByText('Numéro incomplet')).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
  });

  it('pays sans format connu : saisie libre au format international', () => {
    render(<ParishInfoForm parish={{ ...parish, country: 'Portugal' }} />);
    expect(screen.queryByTestId('phone-dial')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Téléphone').getAttribute('placeholder')).toMatch(/^\+/);
  });

  it('modifie le quartier et le complément d’adresse ; une ville hors liste reste éditable', async () => {
    update.mockResolvedValue(parish);
    const user = userEvent.setup();
    render(
      <ParishInfoForm
        parish={{ ...parish, country: 'Cameroun', region: 'Centre', city: 'Minkama' }}
      />,
    );
    // Minkama n'est pas dans la liste : la ville s'affiche en saisie manuelle.
    expect(screen.getByLabelText('Ville', { exact: true })).toHaveValue('__other__');
    expect(screen.getByLabelText('Nom de la ville')).toHaveValue('Minkama');

    await user.type(screen.getByLabelText('Quartier', { exact: false }), 'Centre');
    await user.type(screen.getByLabelText(/Complément d’adresse/), 'Derrière le marché');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0][1]).toMatchObject({
      region: 'Centre',
      city: 'Minkama',
      district: 'Centre',
      addressComplement: 'Derrière le marché',
    });
  });

  it('refuse un site web qui n’est pas en http(s)', async () => {
    const user = userEvent.setup();
    render(<ParishInfoForm parish={parish} />);
    await user.type(screen.getByLabelText('Site web'), 'javascript:alert(1)');
    expect(await screen.findByText('Adresse web invalide (http ou https)')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(update).not.toHaveBeenCalled();
  });
});
