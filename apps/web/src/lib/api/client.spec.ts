import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './client';

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('api client', () => {
  const fetchMock = vi.fn();

  beforeEach(() => vi.stubGlobal('fetch', fetchMock));
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('envoie le jeton en Authorization: Bearer quand il existe', async () => {
    localStorage.setItem('churchy_token', 'tok');
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));

    await api.get('/parishes/my');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/parishes\/my$/);
    expect(init.headers.Authorization).toBe('Bearer tok');
  });

  it('n’envoie pas d’Authorization sans jeton', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await api.get('/public/parishes');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  it('sérialise le corps en JSON pour POST', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    await api.post('/auth/login', { email: 'a@b.fr' });
    const init = fetchMock.mock.calls[0][1];
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"email":"a@b.fr"}');
  });

  describe('erreurs — format réel de HttpExceptionFilter (message est un objet)', () => {
    it('extrait le message d’une erreur Nest (401)', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(
          {
            statusCode: 401,
            message: { message: 'Identifiants invalides', error: 'Unauthorized', statusCode: 401 },
          },
          401,
        ),
      );
      await expect(api.post('/auth/login', {})).rejects.toThrow('Identifiants invalides');
    });

    it('extrait le premier message d’une erreur de validation Zod (400)', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(
          {
            statusCode: 400,
            message: { formErrors: [], fieldErrors: { name: ['Nom requis (min 2 caractères)'] } },
          },
          400,
        ),
      );
      await expect(api.post('/parishes', {})).rejects.toThrow('Nom requis (min 2 caractères)');
    });

    it('accepte aussi un message simple (chaîne)', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ statusCode: 500, message: 'Internal server error' }, 500),
      );
      await expect(api.get('/x')).rejects.toThrow('Internal server error');
    });

    it('retombe sur « Erreur réseau » si la réponse n’est pas du JSON', async () => {
      fetchMock.mockResolvedValue(new Response('<html>', { status: 502 }));
      await expect(api.get('/x')).rejects.toThrow('Erreur réseau');
    });
  });
});
