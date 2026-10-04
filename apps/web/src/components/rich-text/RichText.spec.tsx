import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RichContent } from './RichContent';
import { RichTextEditor } from './RichTextEditor';

describe('RichContent', () => {
  it('affiche le HTML de l’éditeur', () => {
    const { container } = render(<RichContent html="<h2>Titre</h2><p><strong>gras</strong></p>" />);
    expect(container.querySelector('h2')?.textContent).toBe('Titre');
    expect(container.querySelector('strong')?.textContent).toBe('gras');
  });

  it('affiche un ancien texte brut sans l’interpréter', () => {
    const { container } = render(<RichContent html={'a <b>x</b>\nligne'} />);
    expect(container.querySelector('b')).toBeNull();
    expect(container.textContent).toBe('a <b>x</b>\nligne');
    expect(container.firstElementChild).toHaveClass('whitespace-pre-wrap');
  });
});

function Harness({
  onChange,
  allowImages,
}: {
  onChange?: (v: string) => void;
  allowImages?: boolean;
}) {
  const [v, setV] = useState('');
  return (
    <>
      <RichTextEditor
        aria-label="Contenu"
        value={v}
        allowImages={allowImages}
        onChange={(h) => {
          setV(h);
          onChange?.(h);
        }}
      />
      <button type="button" onClick={() => setV('')}>
        reset
      </button>
    </>
  );
}

describe('RichTextEditor', () => {
  it('émet du HTML mis en forme (gras, liste, titre)', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChange={onChange} />);
    const box = await screen.findByRole('textbox', { name: 'Contenu' });

    await user.click(screen.getByRole('button', { name: 'Gras' }));
    await user.click(box);
    await user.keyboard('Salut');
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<p><strong>Salut</strong></p>'));
    expect(screen.getByRole('button', { name: 'Gras' })).toHaveAttribute('aria-pressed', 'true');

    await user.selectOptions(screen.getByLabelText('Style du paragraphe'), 'h2');
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith('<h2><strong>Salut</strong></h2>'),
    );
  });

  it('se resynchronise quand la valeur est réinitialisée de l’extérieur', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const box = await screen.findByRole('textbox', { name: 'Contenu' });
    await user.click(box);
    await user.keyboard('texte');
    expect(box).toHaveTextContent('texte');
    await user.click(screen.getByRole('button', { name: 'reset' }));
    await waitFor(() => expect(box).not.toHaveTextContent('texte'));
  });

  it('propose le bouton image seulement quand les images sont autorisées', async () => {
    const { unmount } = render(<Harness />);
    await screen.findByRole('textbox', { name: 'Contenu' });
    expect(screen.queryByRole('button', { name: 'Insérer une image' })).toBeNull();
    unmount();
    render(<Harness allowImages />);
    expect(await screen.findByRole('button', { name: 'Insérer une image' })).toBeInTheDocument();
  });

  it('affiche le panneau de lien et applique une adresse', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness onChange={onChange} />);
    const box = await screen.findByRole('textbox', { name: 'Contenu' });
    await user.click(box);
    await user.keyboard('site');
    await user.keyboard('{Control>}a{/Control}');
    await user.click(screen.getByRole('button', { name: 'Lien' }));
    await user.type(screen.getByLabelText('Adresse du lien'), 'exemple.fr');
    await user.click(screen.getByRole('button', { name: 'Appliquer' }));
    await waitFor(() => expect(onChange.mock.lastCall?.[0]).toContain('href="https://exemple.fr"'));
  });

  it('refuse un format d’image non pris en charge', async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<Harness allowImages />);
    await screen.findByRole('textbox', { name: 'Contenu' });
    await user.upload(
      screen.getByTestId('rich-text-image-input'),
      new File(['<svg/>'], 'a.svg', { type: 'image/svg+xml' }),
    );
    // Les fichiers non pris en charge sont ignorés sans casser l'éditeur.
    expect(screen.getByRole('textbox', { name: 'Contenu' })).toBeInTheDocument();
  });
});
