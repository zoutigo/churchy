import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CelebrationStatus, ContentType, type Content, type SheetView } from '@churchy/shared';
import { ApiError } from '@/lib/api/client';
import { SheetPanel } from './SheetPanel';
import { SheetCreator } from './SheetCreator';

const api = vi.hoisted(() => ({
  createSheet: vi.fn(),
  changeTemplate: vi.fn(),
  addStep: vi.fn(),
  updateStep: vi.fn(),
  removeStep: vi.fn(),
  reorderSteps: vi.fn(),
  publishSheet: vi.fn(),
  unpublishSheet: vi.fn(),
}));
vi.mock('@/lib/api/celebrations.api', () => ({ celebrationsApi: api }));
const success = vi.fn();
const error = vi.fn();
vi.mock('@/lib/notify', () => ({
  notify: {
    success: (...a: unknown[]) => success(...a),
    error: (...a: unknown[]) => error(...a),
  },
}));

const step = (id: string, over: Partial<SheetView['steps'][number]> = {}) => ({
  id,
  key: id,
  title: `Étape ${id}`,
  order: 1,
  templateStepId: `ts-${id}`,
  contentId: null,
  customText: null,
  content: null,
  ...over,
});
const sheet = (over: Partial<SheetView> = {}): SheetView => ({
  id: 'sh1',
  occurrenceId: 'o1',
  templateId: 't1',
  status: CelebrationStatus.DRAFT,
  publishedAt: null,
  steps: [step('a'), step('b'), step('c', { templateStepId: null })],
  ...over,
});
const templates = [
  { id: 't1', name: 'Messe complète', steps: [{}, {}, {}] },
  { id: 't2', name: 'Messe courte', steps: [{}] },
] as never[];
const contents = [
  { id: 'k1', title: 'Peuple de Dieu', type: ContentType.SONG },
  { id: 'k2', title: 'Isaïe 55', type: ContentType.READING },
] as Content[];

beforeEach(() => {
  for (const fn of [...Object.values(api), success, error]) fn.mockReset();
});

const setup = (props: Partial<React.ComponentProps<typeof SheetPanel>> = {}) => {
  const onChange = vi.fn();
  const user = userEvent.setup();
  render(
    <SheetPanel
      sheet={sheet()}
      templates={templates}
      contents={contents}
      readOnly={false}
      onChange={onChange}
      {...props}
    />,
  );
  return { user, onChange };
};

describe('SheetPanel', () => {
  it('affiche le modèle d’origine, le statut et les étapes (les libres sont signalées)', () => {
    setup();
    expect(screen.getByTestId('sheet-template-name')).toHaveTextContent('Modèle : Messe complète');
    expect(screen.getByTestId('sheet-status')).toHaveTextContent('Brouillon');
    expect(screen.getAllByTestId('sheet-step')).toHaveLength(3);
    expect(screen.getByText('Étape libre')).toBeInTheDocument();
  });

  it('feuille à la volée : le dit explicitement', () => {
    setup({ sheet: sheet({ templateId: null }) });
    expect(screen.getByTestId('sheet-template-name')).toHaveTextContent(
      'Feuille construite à la volée',
    );
  });

  it('feuille vide : invite à ajouter des étapes', () => {
    setup({ sheet: sheet({ steps: [] }) });
    expect(screen.getByText(/La feuille est vide/)).toBeInTheDocument();
  });

  it('lie un contenu de la bibliothèque à une étape, regroupé par type, avec toast', async () => {
    api.updateStep.mockResolvedValue(sheet());
    const { user, onChange } = setup();
    const select = screen.getAllByLabelText('Contenu de la bibliothèque')[0];
    expect(within(select).getByRole('group', { name: 'Chant' })).toBeInTheDocument();
    expect(within(select).getByRole('group', { name: 'Lecture' })).toBeInTheDocument();
    await user.selectOptions(select, 'k1');
    await waitFor(() =>
      expect(api.updateStep).toHaveBeenCalledWith('sh1', 'a', { contentId: 'k1' }),
    );
    expect(success).toHaveBeenCalledWith('Étape enregistrée');
    expect(onChange).toHaveBeenCalled();
  });

  it('enregistre le texte libre à la sortie du champ, seulement s’il a changé', async () => {
    api.updateStep.mockResolvedValue(sheet());
    const { user } = setup();
    const text = screen.getAllByLabelText('Texte libre ou précision')[1];
    await user.click(text);
    await user.tab(); // aucun changement : pas d'appel
    expect(api.updateStep).not.toHaveBeenCalled();
    await user.type(text, '2 couplets');
    await user.tab();
    await waitFor(() =>
      expect(api.updateStep).toHaveBeenCalledWith('sh1', 'b', { customText: '2 couplets' }),
    );
  });

  it('réordonne : monter / descendre envoie l’ordre complet ; bornes désactivées', async () => {
    api.reorderSteps.mockResolvedValue(sheet());
    const { user } = setup();
    expect(screen.getByRole('button', { name: 'Monter l’étape Étape a' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Descendre l’étape Étape c' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Descendre l’étape Étape a' }));
    await waitFor(() =>
      expect(api.reorderSteps).toHaveBeenCalledWith('sh1', { stepIds: ['b', 'a', 'c'] }),
    );
    expect(success).toHaveBeenCalledWith('Ordre enregistré');
  });

  it('retire une étape en deux temps', async () => {
    api.removeStep.mockResolvedValue(sheet());
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Supprimer l’étape Étape b' }));
    expect(api.removeStep).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole('button', { name: 'Confirmer la suppression de l’étape Étape b' }),
    );
    await waitFor(() => expect(api.removeStep).toHaveBeenCalledWith('sh1', 'b'));
    expect(success).toHaveBeenCalledWith('Étape retirée');
  });

  it('ajoute une étape à la volée ; le titre vide est refusé', async () => {
    api.addStep.mockResolvedValue(sheet());
    const { user } = setup();
    const add = screen.getByRole('button', { name: 'Ajouter une étape' });
    expect(add).toBeDisabled();
    await user.type(screen.getByLabelText('Titre de la nouvelle étape'), 'Chant à Marie');
    await user.click(add);
    await waitFor(() =>
      expect(api.addStep).toHaveBeenCalledWith('sh1', { title: 'Chant à Marie' }),
    );
    expect(screen.getByLabelText('Titre de la nouvelle étape')).toHaveValue('');
    expect(success).toHaveBeenCalledWith('Étape ajoutée');
  });

  it('publie puis dépublie, avec toast', async () => {
    api.publishSheet.mockResolvedValue(sheet({ status: CelebrationStatus.PUBLISHED }));
    const { user, onChange } = setup();
    await user.click(screen.getByRole('button', { name: 'Publier la feuille' }));
    await waitFor(() => expect(api.publishSheet).toHaveBeenCalledWith('sh1'));
    expect(success).toHaveBeenCalledWith('Feuille publiée');
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ status: CelebrationStatus.PUBLISHED }),
    );
  });

  it('feuille publiée : propose « Dépublier »', async () => {
    api.unpublishSheet.mockResolvedValue(sheet());
    const { user } = setup({ sheet: sheet({ status: CelebrationStatus.PUBLISHED }) });
    expect(screen.getByTestId('sheet-status')).toHaveTextContent('Publiée');
    await user.click(screen.getByRole('button', { name: 'Dépublier' }));
    await waitFor(() => expect(api.unpublishSheet).toHaveBeenCalledWith('sh1'));
    expect(success).toHaveBeenCalledWith('Feuille dépubliée');
  });

  it('erreur de l’API (ex. date passée) : toast d’erreur, pas de toast de succès, feuille inchangée', async () => {
    api.publishSheet.mockRejectedValue(
      new ApiError('Cette date est passée : elle ne peut plus être modifiée', 409),
    );
    const { user, onChange } = setup();
    await user.click(screen.getByRole('button', { name: 'Publier la feuille' }));
    await waitFor(() =>
      expect(error).toHaveBeenCalledWith(
        'Erreur lors de la publication',
        'Cette date est passée : elle ne peut plus être modifiée',
      ),
    );
    expect(success).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('date passée ou annulée (lecture seule) : aucune action de modification n’est proposée', () => {
    setup({ readOnly: true });
    expect(screen.queryByRole('button', { name: 'Publier la feuille' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Changer de modèle' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('add-step-form')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Monter l’étape/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Supprimer l’étape/ })).not.toBeInTheDocument();
    for (const f of screen.getAllByLabelText('Texte libre ou précision')) expect(f).toBeDisabled();
    for (const f of screen.getAllByLabelText('Contenu de la bibliothèque'))
      expect(f).toBeDisabled();
  });
});

describe('changement de modèle', () => {
  const report = {
    kept: [{ key: 'a', title: 'Étape a' }],
    added: [{ key: 'x', title: 'Envoi' }],
    removed: [{ key: 'b', title: 'Étape b' }],
    keptAsFree: [{ key: 'c', title: 'Gloria' }],
  };

  it('montre un aperçu avant d’appliquer, puis applique et prévient', async () => {
    api.changeTemplate.mockImplementation(async (_id: string, dto: { dryRun?: boolean }) => ({
      applied: !dto.dryRun,
      report,
      sheet: sheet({ templateId: 't2' }),
    }));
    const { user, onChange } = setup();
    await user.click(screen.getByRole('button', { name: 'Changer de modèle' }));
    const dialog = await screen.findByTestId('template-change-dialog');
    await user.selectOptions(within(dialog).getByLabelText('Nouveau modèle'), 't2');

    const preview = within(dialog).getByTestId('template-change-report');
    await waitFor(() => expect(preview).toHaveTextContent('Conservées (1)'));
    expect(preview).toHaveTextContent('Ajoutées (vides) (1)');
    expect(preview).toHaveTextContent('Gardées comme étapes libres (1)');
    expect(preview).toHaveTextContent('Retirées (vides) (1)');
    expect(api.changeTemplate).toHaveBeenLastCalledWith('sh1', { templateId: 't2', dryRun: true });
    expect(onChange).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: 'Changer de modèle' }));
    await waitFor(() =>
      expect(api.changeTemplate).toHaveBeenLastCalledWith('sh1', { templateId: 't2' }),
    );
    expect(success).toHaveBeenCalledWith('Modèle changé', 'Le contenu déjà placé a été conservé');
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ templateId: 't2' }));
  });

  it('« Aucun — à la volée » détache la feuille ; le modèle actuel ne propose rien à appliquer', async () => {
    api.changeTemplate.mockResolvedValue({ applied: false, report, sheet: sheet() });
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Changer de modèle' }));
    const dialog = await screen.findByTestId('template-change-dialog');
    await waitFor(() =>
      expect(within(dialog).getByTestId('template-change-report')).toHaveTextContent(
        'C’est le modèle actuel',
      ),
    );
    expect(within(dialog).getByRole('button', { name: 'Changer de modèle' })).toBeDisabled();

    await user.selectOptions(within(dialog).getByLabelText('Nouveau modèle'), '__blank__');
    await waitFor(() =>
      expect(api.changeTemplate).toHaveBeenLastCalledWith('sh1', {
        templateId: null,
        dryRun: true,
      }),
    );
  });

  it('erreur de l’aperçu : message dans la fenêtre, rien n’est applicable', async () => {
    api.changeTemplate.mockRejectedValue(new ApiError('Modèle introuvable', 404));
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Changer de modèle' }));
    const dialog = await screen.findByTestId('template-change-dialog');
    expect(await within(dialog).findByText('Modèle introuvable')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Changer de modèle' })).toBeDisabled();
  });
});

describe('SheetCreator', () => {
  const defaultTemplate = { id: 't1', name: 'Messe complète' };

  it('propose le modèle par défaut en premier et crée la feuille avec lui', async () => {
    api.createSheet.mockResolvedValue(sheet());
    const onCreated = vi.fn();
    const user = userEvent.setup();
    render(
      <SheetCreator
        occurrenceId="o1"
        templates={templates}
        defaultTemplate={defaultTemplate}
        onCreated={onCreated}
      />,
    );
    const select = screen.getByLabelText('Modèle');
    expect(select).toHaveValue('t1');
    expect(
      screen.getByRole('option', { name: 'Modèle par défaut — Messe complète' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Créer la feuille' }));
    await waitFor(() => expect(api.createSheet).toHaveBeenCalledWith('o1', { templateId: 't1' }));
    expect(onCreated).toHaveBeenCalled();
    expect(success).toHaveBeenCalledWith('Feuille créée', undefined);
  });

  it('à la volée : envoie templateId null', async () => {
    api.createSheet.mockResolvedValue(sheet({ templateId: null, steps: [] }));
    const user = userEvent.setup();
    render(
      <SheetCreator
        occurrenceId="o1"
        templates={templates}
        defaultTemplate={null}
        onCreated={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Modèle')).toHaveValue('__blank__');
    await user.click(screen.getByRole('button', { name: 'Créer la feuille' }));
    await waitFor(() => expect(api.createSheet).toHaveBeenCalledWith('o1', { templateId: null }));
  });

  it('choisit un autre modèle de la paroisse', async () => {
    api.createSheet.mockResolvedValue(sheet());
    const user = userEvent.setup();
    render(
      <SheetCreator
        occurrenceId="o1"
        templates={templates}
        defaultTemplate={defaultTemplate}
        onCreated={vi.fn()}
      />,
    );
    await user.selectOptions(screen.getByLabelText('Modèle'), 't2');
    await user.click(screen.getByRole('button', { name: 'Créer la feuille' }));
    await waitFor(() => expect(api.createSheet).toHaveBeenCalledWith('o1', { templateId: 't2' }));
  });

  it('erreur : message + toast, rien n’est créé', async () => {
    api.createSheet.mockRejectedValue(new ApiError('Cette date est annulée', 409));
    const onCreated = vi.fn();
    const user = userEvent.setup();
    render(
      <SheetCreator
        occurrenceId="o1"
        templates={templates}
        defaultTemplate={null}
        onCreated={onCreated}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Créer la feuille' }));
    expect(await screen.findByText('Cette date est annulée')).toBeInTheDocument();
    expect(error).toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
  });
});
