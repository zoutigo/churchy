import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { setTestLocale } from '../../../vitest.setup';
import { Form } from '@/components/ui/form';
import { PhoneNumberField } from './PhoneNumberField';

function Harness({ onValue }: { onValue: (v: string) => void }) {
  const form = useForm({ defaultValues: { phone: '' } });
  onValue(form.watch('phone'));
  return (
    <Form {...form}>
      <form>
        <PhoneNumberField />
      </form>
    </Form>
  );
}

const setup = () => {
  const seen = vi.fn();
  render(<Harness onValue={seen} />);
  return { seen, last: () => seen.mock.calls.at(-1)?.[0] };
};

describe('PhoneNumberField', () => {
  it('Cameroun par défaut : indicatif affiché et exemple de numéro', () => {
    setup();
    expect(screen.getByTestId('phone-dial')).toHaveTextContent('+237');
    expect(screen.getByLabelText('Pays')).toHaveValue('Cameroun');
    expect(screen.getByLabelText('Numéro de téléphone')).toHaveAttribute(
      'placeholder',
      '6 77 12 34 56',
    );
  });

  it('masque la saisie et enregistre le numéro international', async () => {
    const { last } = setup();
    await userEvent.type(screen.getByLabelText('Numéro de téléphone'), '677123456');
    expect(screen.getByLabelText('Numéro de téléphone')).toHaveValue('6 77 12 34 56');
    expect(last()).toBe('+237 6 77 12 34 56');
  });

  it('ignore les lettres et ce qui dépasse la longueur du pays', async () => {
    const { last } = setup();
    await userEvent.type(screen.getByLabelText('Numéro de téléphone'), '6a77-12.34 56789');
    expect(last()).toBe('+237 6 77 12 34 56');
  });

  it('retire le « 0 » de tête à la française quand le pays le veut', async () => {
    const { last } = setup();
    await userEvent.selectOptions(screen.getByLabelText('Pays'), 'France');
    await userEvent.type(screen.getByLabelText('Numéro de téléphone'), '0612345678');
    expect(last()).toBe('+33 6 12 34 56 78');
  });

  it('changer de pays change l’indicatif et vide le numéro (il ne serait plus valable)', async () => {
    const { last } = setup();
    await userEvent.type(screen.getByLabelText('Numéro de téléphone'), '677123456');
    await userEvent.selectOptions(screen.getByLabelText('Pays'), 'France');
    expect(screen.getByTestId('phone-dial')).toHaveTextContent('+33');
    expect(screen.getByLabelText('Numéro de téléphone')).toHaveValue('');
    expect(last()).toBe('');
  });

  it('accepte un numéro collé avec son indicatif', async () => {
    const { last } = setup();
    const input = screen.getByLabelText('Numéro de téléphone');
    await userEvent.click(input);
    await userEvent.paste('+237 677 12 34 56');
    expect(last()).toBe('+237 6 77 12 34 56');
  });

  it('noms de pays traduits en anglais', () => {
    setTestLocale('en');
    setup();
    expect(screen.getByRole('option', { name: 'Cameroon (+237)' })).toBeInTheDocument();
    expect(screen.getByLabelText('Phone number')).toBeInTheDocument();
    expect(screen.getByLabelText('Country')).toBeInTheDocument();
  });
});
