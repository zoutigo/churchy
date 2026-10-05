import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setTestLocale } from '../../../vitest.setup';
import { PinInput } from './pin-input';

function Harness({ onValue }: { onValue?: (v: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <PinInput
      aria-label="PIN"
      value={value}
      onChange={(v) => {
        setValue(v);
        onValue?.(v);
      }}
    />
  );
}

describe('PinInput', () => {
  it('est masqué par défaut, avec un clavier numérique', () => {
    render(<Harness />);
    const input = screen.getByLabelText('PIN');
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveAttribute('inputmode', 'numeric');
  });

  it('écarte tout ce qui n’est pas un chiffre', async () => {
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    await userEvent.type(screen.getByLabelText('PIN'), '4a8-2 9x1');
    expect(screen.getByLabelText('PIN')).toHaveValue('48291');
    expect(onValue).toHaveBeenLastCalledWith('48291');
  });

  it('ne dépasse pas 6 chiffres, même au collage', async () => {
    render(<Harness />);
    const input = screen.getByLabelText('PIN');
    await userEvent.click(input);
    await userEvent.paste('48291577');
    expect(input).toHaveValue('482915');
  });

  it('un collage avec des séparateurs est nettoyé', async () => {
    render(<Harness />);
    const input = screen.getByLabelText('PIN');
    await userEvent.click(input);
    await userEvent.paste('482 915');
    expect(input).toHaveValue('482915');
  });

  it('affiche et masque le PIN à la demande', async () => {
    render(<Harness />);
    const input = screen.getByLabelText('PIN');
    await userEvent.type(input, '482915');
    await userEvent.click(screen.getByRole('button', { name: 'Afficher le PIN' }));
    expect(input).toHaveAttribute('type', 'text');
    await userEvent.click(screen.getByRole('button', { name: 'Masquer le PIN' }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('boutons en anglais', () => {
    setTestLocale('en');
    render(<Harness />);
    expect(screen.getByRole('button', { name: 'Show PIN' })).toBeInTheDocument();
  });
});
