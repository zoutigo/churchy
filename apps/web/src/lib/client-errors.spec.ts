import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  handlePageError,
  isChunkLoadError,
  reloadOnceForStaleBuild,
  reportClientError,
} from './client-errors';

describe('isChunkLoadError', () => {
  it.each([
    ['Chrome', 'Loading chunk 1897 failed.'],
    ['Safari', 'Importing a module script failed.'],
    ['Firefox', 'error loading dynamically imported module: https://x/y.js'],
    ['Chrome import()', 'Failed to fetch dynamically imported module: https://x/y.js'],
    ['HTML à la place du JS', "Unexpected token '<'"],
  ])('reconnaît le message %s', (_, message) => {
    expect(isChunkLoadError(new Error(message))).toBe(true);
  });

  it('reconnaît le nom ChunkLoadError et ignore les autres erreurs', () => {
    const e = new Error('x');
    e.name = 'ChunkLoadError';
    expect(isChunkLoadError(e)).toBe(true);
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });
});

describe('rechargement et signalement', () => {
  const reload = vi.fn();
  const fetchMock = vi.fn().mockResolvedValue({ ok: true });

  beforeEach(() => {
    window.sessionStorage.clear();
    reload.mockReset();
    fetchMock.mockClear();
    vi.stubGlobal('fetch', fetchMock);
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, pathname: '/fr', reload },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('recharge une seule fois, pas deux de suite (pas de boucle)', () => {
    expect(reloadOnceForStaleBuild()).toBe(true);
    expect(reloadOnceForStaleBuild()).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('ne recharge pas si le stockage est indisponible (risque de boucle)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(reloadOnceForStaleBuild()).toBe(false);
    expect(reload).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('fichier périmé : recharge sans signaler ; au second échec : signale', () => {
    const stale = new Error('Loading chunk 5 failed.');
    expect(handlePageError(stale, 'global')).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(handlePageError(stale, 'global')).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('signale une erreur ordinaire à l’API, une seule fois par message', () => {
    const err = new Error('boom-unique');
    reportClientError(err, 'segment');
    reportClientError(err, 'segment');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/client-errors$/);
    expect(JSON.parse(init.body)).toMatchObject({
      message: 'boom-unique',
      source: 'segment',
      path: '/fr',
    });
  });

  it('ne lève jamais d’exception même si fetch échoue', () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    expect(() => reportClientError(new Error('autre-erreur'), 'global')).not.toThrow();
  });
});
