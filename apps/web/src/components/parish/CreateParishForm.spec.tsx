import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateParishForm } from './CreateParishForm';

const create = vi.fn();
vi.mock('@/lib/api/parishes.api', () => ({
  parishesApi: { create: (...a: unknown[]) => create(...a) },
}));

const field = (name: string) =>
  screen.getByLabelText(new RegExp(`^${name}(\\s*\\(optionnel\\))?$`));

describe('CreateParishForm — localisation', () => {
  beforeEach(() => {
    create.mockReset();
    create.mockResolvedValue({ id: 'p1' });
  });

  it('propose le Cameroun par défaut, avec la liste des pays', () => {
    render(<CreateParishForm />);
    expect(field('Pays')).toHaveValue('Cameroun');
    expect(screen.getByRole('option', { name: 'France' })).toBeInTheDocument();
  });

  it('enchaîne région → ville → quartier, chaque liste dépendant de la précédente', async () => {
    const user = userEvent.setup();
    render(<CreateParishForm />);

    expect(field('Ville')).toBeDisabled();
    await user.selectOptions(field('Région'), 'Centre');
    expect(field('Ville')).toBeEnabled();
    expect(screen.getByRole('option', { name: 'Yaoundé' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Douala' })).not.toBeInTheDocument();

    await user.selectOptions(field('Ville'), 'Yaoundé');
    expect(screen.getByRole('option', { name: 'Bastos' })).toBeInTheDocument();

    // Changer de région remet la ville et le quartier à zéro.
    await user.selectOptions(field('Quartier'), 'Bastos');
    await user.selectOptions(field('Région'), 'Littoral');
    expect(field('Ville')).toHaveValue('');
    expect(screen.queryByRole('option', { name: 'Bastos' })).not.toBeInTheDocument();
  });

  it('envoie pays, région, ville, quartier et complément d’adresse', async () => {
    const user = userEvent.setup();
    render(<CreateParishForm />);
    await user.type(field('Nom de la paroisse'), 'Saint Joseph');
    await user.selectOptions(field('Région'), 'Centre');
    await user.selectOptions(field('Ville'), 'Yaoundé');
    await user.selectOptions(field('Quartier'), 'Mvog-Ada');
    await user.type(screen.getByLabelText(/Complément d’adresse/), 'En face de la poste centrale');
    await user.click(screen.getByRole('button', { name: 'Créer la paroisse' }));

    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0]).toMatchObject({
      name: 'Saint Joseph',
      country: 'Cameroun',
      region: 'Centre',
      city: 'Yaoundé',
      district: 'Mvog-Ada',
      addressComplement: 'En face de la poste centrale',
    });
  });

  it('permet de saisir un quartier absent de la liste', async () => {
    const user = userEvent.setup();
    render(<CreateParishForm />);
    await user.type(field('Nom de la paroisse'), 'Saint Joseph');
    await user.selectOptions(field('Région'), 'Centre');
    await user.selectOptions(field('Ville'), 'Yaoundé');
    expect(screen.queryByLabelText('Nom du quartier')).not.toBeInTheDocument();
    await user.selectOptions(field('Quartier'), 'Autre quartier…');
    await user.type(field('Nom du quartier'), 'Nkol-Eton');
    await user.click(screen.getByRole('button', { name: 'Créer la paroisse' }));

    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0]).toMatchObject({ city: 'Yaoundé', district: 'Nkol-Eton' });
  });

  it('permet de saisir une ville absente de la liste, puis son quartier à la main', async () => {
    const user = userEvent.setup();
    render(<CreateParishForm />);
    await user.type(field('Nom de la paroisse'), 'Saint Joseph');
    await user.selectOptions(field('Région'), 'Centre');
    await user.selectOptions(field('Ville'), 'Autre ville…');
    await user.type(field('Nom de la ville'), 'Minkama');
    // Ville inconnue : pas de liste de quartiers, saisie libre.
    await user.type(field('Quartier'), 'Centre');
    await user.click(screen.getByRole('button', { name: 'Créer la paroisse' }));

    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0]).toMatchObject({
      region: 'Centre',
      city: 'Minkama',
      district: 'Centre',
    });
  });

  it('refuse la création tant que la ville n’est pas choisie', async () => {
    const user = userEvent.setup();
    render(<CreateParishForm />);
    await user.type(field('Nom de la paroisse'), 'Saint Joseph');
    await user.selectOptions(field('Région'), 'Centre');
    await user.click(screen.getByRole('button', { name: 'Créer la paroisse' }));
    expect(await screen.findByText('Ville requise')).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('hors Cameroun, région, ville et quartier sont en saisie libre', async () => {
    const user = userEvent.setup();
    render(<CreateParishForm />);
    await user.type(field('Nom de la paroisse'), 'Saint Pierre');
    await user.selectOptions(field('Pays'), 'France');
    expect(field('Région').tagName).toBe('INPUT');
    expect(field('Ville').tagName).toBe('INPUT');
    await user.type(field('Région'), 'Auvergne-Rhône-Alpes');
    await user.type(field('Ville'), 'Lyon');
    await user.click(screen.getByRole('button', { name: 'Créer la paroisse' }));

    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0]).toMatchObject({
      country: 'France',
      region: 'Auvergne-Rhône-Alpes',
      city: 'Lyon',
    });
  });

  it('repasser au Cameroun après un autre pays vide la localisation précédente', async () => {
    const user = userEvent.setup();
    render(<CreateParishForm />);
    await user.selectOptions(field('Pays'), 'France');
    await user.type(field('Ville'), 'Lyon');
    await user.selectOptions(field('Pays'), 'Cameroun');
    expect(field('Région')).toHaveValue('');
    expect(field('Ville')).toHaveValue('');
  });

  it('téléphone et email sont facultatifs ; renseignés, ils sont envoyés (téléphone au format international)', async () => {
    const user = userEvent.setup();
    render(<CreateParishForm />);
    const phone = screen.getByLabelText(/^Téléphone/);
    expect(phone).toHaveAttribute('placeholder', '6 77 12 34 56');
    await user.type(field('Nom de la paroisse'), 'Saint Joseph');
    await user.selectOptions(field('Région'), 'Centre');
    await user.selectOptions(field('Ville'), 'Yaoundé');
    await user.type(phone, '677123456');
    await user.type(screen.getByLabelText(/^Email de la paroisse/), 'contact@paroisse.cm');
    await user.click(screen.getByRole('button', { name: 'Créer la paroisse' }));

    await waitFor(() => expect(create).toHaveBeenCalled());
    expect(create.mock.calls[0][0]).toMatchObject({
      phone: '+237 6 77 12 34 56',
      email: 'contact@paroisse.cm',
    });
  });

  it('un numéro incomplet empêche la création', async () => {
    const user = userEvent.setup();
    render(<CreateParishForm />);
    await user.type(field('Nom de la paroisse'), 'Saint Joseph');
    await user.selectOptions(field('Région'), 'Centre');
    await user.selectOptions(field('Ville'), 'Yaoundé');
    await user.type(screen.getByLabelText(/^Téléphone/), '6771');
    await user.click(screen.getByRole('button', { name: 'Créer la paroisse' }));
    expect(await screen.findByText('Numéro incomplet')).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });
});
