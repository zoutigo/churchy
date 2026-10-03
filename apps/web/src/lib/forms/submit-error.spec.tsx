import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { ApiError } from '@/lib/api/client';
import { errorMessage, handleSubmitError } from './submit-error';

const error = vi.fn();
vi.mock('@/lib/notify', () => ({
  notify: { error: (...a: unknown[]) => error(...a), success: vi.fn() },
}));

const errs = (form: ReturnType<typeof setup>) => form.control._formState.errors;

function setup() {
  return renderHook(() => useForm({ defaultValues: { title: '', body: '' } })).result.current;
}

describe('handleSubmitError', () => {
  beforeEach(() => {
    error.mockReset();
  });

  it('place les erreurs Zod de l’API sous les champs concernés, plus un toast', () => {
    const form = setup();
    handleSubmitError(
      form,
      new ApiError('Titre requis', 400, { title: ['Titre requis'], body: ['Contenu requis'] }),
      'Création impossible',
    );
    expect(errs(form).title?.message).toBe('Titre requis');
    expect(errs(form).body?.message).toBe('Contenu requis');
    expect(errs(form).root).toBeUndefined();
    expect(error).toHaveBeenCalledWith('Création impossible', expect.stringContaining('champs'));
  });

  it('un champ inconnu du formulaire retombe sur le message général (jamais perdu)', () => {
    const form = setup();
    handleSubmitError(
      form,
      new ApiError('Champ inconnu invalide', 400, { inconnu: ['Champ inconnu invalide'] }),
      'Création impossible',
    );
    expect(errs(form).root?.message).toBe('Champ inconnu invalide');
  });

  it('une erreur sans champ (403, 404, 500) devient le message général, plus un toast', () => {
    const form = setup();
    handleSubmitError(form, new ApiError('Accès refusé', 403), 'Modification impossible');
    expect(errs(form).root?.message).toBe('Accès refusé');
    expect(error).toHaveBeenCalledWith('Modification impossible', 'Accès refusé');
  });

  it('une erreur inattendue (non ApiError) utilise le texte de repli', () => {
    const form = setup();
    handleSubmitError(form, 'boom', 'Création impossible');
    expect(errs(form).root?.message).toBe('Création impossible');
  });

  it('errorMessage : message de l’erreur sinon repli', () => {
    expect(errorMessage(new Error('x'), 'repli')).toBe('x');
    expect(errorMessage(new Error(''), 'repli')).toBe('repli');
    expect(errorMessage(null, 'repli')).toBe('repli');
  });
});
