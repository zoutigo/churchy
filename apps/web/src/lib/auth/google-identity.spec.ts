import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadGoogleIdentity, resetGoogleIdentityForTests } from './google-identity';

describe('loadGoogleIdentity', () => {
  beforeEach(() => {
    resetGoogleIdentityForTests();
    delete window.google;
    document.head.querySelectorAll('script[src*="accounts.google.com"]').forEach((s) => s.remove());
  });
  afterEach(() => {
    delete window.google;
  });

  const scripts = () =>
    document.head.querySelectorAll('script[src="https://accounts.google.com/gsi/client"]');

  it('réutilise Google s’il est déjà chargé, sans injecter de script', async () => {
    const google = { accounts: { id: {} } } as never;
    window.google = google;
    await expect(loadGoogleIdentity()).resolves.toBe(google);
    expect(scripts()).toHaveLength(0);
  });

  it('injecte le script officiel une seule fois, même appelé deux fois', async () => {
    const first = loadGoogleIdentity();
    const second = loadGoogleIdentity();
    expect(scripts()).toHaveLength(1);
    const google = { accounts: { id: {} } } as never;
    window.google = google;
    (scripts()[0] as HTMLScriptElement).onload?.(new Event('load'));
    await expect(first).resolves.toBe(google);
    await expect(second).resolves.toBe(google);
  });

  it('échoue si le script se charge sans exposer Google', async () => {
    const promise = loadGoogleIdentity();
    (scripts()[0] as HTMLScriptElement).onload?.(new Event('load'));
    await expect(promise).rejects.toThrow('Google indisponible');
  });

  it('échoue si le script est bloqué, et permet de réessayer', async () => {
    const promise = loadGoogleIdentity();
    (scripts()[0] as HTMLScriptElement).onerror?.(new Event('error'));
    await expect(promise).rejects.toThrow('Google indisponible');

    const retry = loadGoogleIdentity();
    expect(scripts()).toHaveLength(2);
    window.google = { accounts: { id: {} } } as never;
    (scripts()[1] as HTMLScriptElement).onload?.(new Event('load'));
    await expect(retry).resolves.toBeDefined();
  });
});
