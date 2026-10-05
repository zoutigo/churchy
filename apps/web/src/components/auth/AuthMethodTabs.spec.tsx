import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setTestLocale } from '../../../vitest.setup';
import { AuthMethodTabs } from './AuthMethodTabs';

describe('AuthMethodTabs', () => {
  it('indique le mode choisi', () => {
    render(<AuthMethodTabs value="phone" onChange={() => undefined} />);
    expect(screen.getByRole('tab', { name: 'Téléphone' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Email' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tablist', { name: 'Mode de connexion' })).toBeInTheDocument();
  });

  it('prévient du changement de mode', async () => {
    const onChange = vi.fn();
    render(<AuthMethodTabs value="email" onChange={onChange} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Téléphone' }));
    expect(onChange).toHaveBeenCalledWith('phone');
  });

  it('ne soumet jamais le formulaire qui le contient', async () => {
    const submit = vi.fn((e) => e.preventDefault());
    render(
      <form onSubmit={submit}>
        <AuthMethodTabs value="email" onChange={() => undefined} />
      </form>,
    );
    await userEvent.click(screen.getByRole('tab', { name: 'Téléphone' }));
    expect(submit).not.toHaveBeenCalled();
  });

  it('en anglais', () => {
    setTestLocale('en');
    render(<AuthMethodTabs value="email" onChange={() => undefined} />);
    expect(screen.getByRole('tab', { name: 'Phone' })).toBeInTheDocument();
    expect(screen.getByRole('tablist', { name: 'Sign-in method' })).toBeInTheDocument();
  });
});
