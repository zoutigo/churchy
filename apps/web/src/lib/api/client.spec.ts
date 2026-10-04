import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SESSION_EXPIRED_EVENT } from '@/lib/auth/session';
import { api, ApiError } from './client';

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const urlOf = (call: unknown[]) => String(call[0]);

describe('api client', () => {
  const fetchMock = vi.fn();

  beforeEach(() => vi.stubGlobal('fetch', fetchMock));
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  describe('requêtes', () => {
    it('joint les cookies (credentials: include) et n’envoie jamais de jeton dans un en-tête', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
      localStorage.setItem('churchy_token', 'ancien-jeton-localstorage');

      await api.get('/parishes/my');

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toMatch(/\/parishes\/my$/);
      expect(init.credentials).toBe('include');
      expect(init.headers.Authorization).toBeUndefined();
    });

    it('transmet la langue de la page à l’API (Accept-Language), et rien si elle est inconnue', async () => {
      fetchMock.mockImplementation(async () => jsonResponse({}));
      document.documentElement.lang = 'en';
      await api.get('/public/parishes');
      expect(fetchMock.mock.calls[0][1].headers['Accept-Language']).toBe('en');

      document.documentElement.lang = '';
      await api.get('/public/parishes');
      expect(fetchMock.mock.calls[1][1].headers['Accept-Language']).toBeUndefined();
    });

    it('traduit les codes d’erreur de l’API dans la langue de la page (message et erreurs de champ)', async () => {
      const body = {
        statusCode: 400,
        message: { formErrors: [], fieldErrors: { email: ['emailInvalid'] } },
      };
      fetchMock.mockImplementation(async () => jsonResponse(body, 400));
      document.documentElement.lang = 'en';
      const en = await api.post<never>('/x', {}).catch((e: unknown) => e as ApiError);
      expect(en.message).toBe('Invalid email address');
      expect(en.fieldErrors).toEqual({ email: ['Invalid email address'] });

      document.documentElement.lang = 'fr';
      const fr = await api.post<never>('/x', {}).catch((e: unknown) => e as ApiError);
      expect(fr.message).toBe('Email invalide');
      expect(fr.fieldErrors).toEqual({ email: ['Email invalide'] });

      fetchMock.mockImplementation(async () => jsonResponse({ message: 'parishNotFound' }, 404));
      document.documentElement.lang = 'en';
      expect((await api.get<never>('/x').catch((e: unknown) => e as ApiError)).message).toBe(
        'Parish not found',
      );
      document.documentElement.lang = '';
    });

    it('le message « serveur injoignable » suit la langue de la page', async () => {
      fetchMock.mockRejectedValue(new TypeError('fetch failed'));
      document.documentElement.lang = 'en';
      await expect(api.get('/x')).rejects.toThrow('Unable to reach the server');
      document.documentElement.lang = '';
    });

    it('non-régression : côté serveur (pages publiques), jamais de cache Next sur les requêtes', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}));
      const win = globalThis.window;
      // @ts-expect-error simule le rendu serveur (pas de window)
      delete globalThis.window;
      try {
        await api.get('/public/parishes/p1/announcements');
      } finally {
        globalThis.window = win;
      }
      expect(fetchMock.mock.calls[0][1].cache).toBe('no-store');
    });

    it('côté serveur, utilise API_INTERNAL_URL si défini ; le navigateur garde l’URL publique', async () => {
      fetchMock.mockImplementation(async () => jsonResponse({}));
      vi.stubEnv('API_INTERNAL_URL', 'http://api:3201/api');
      try {
        await api.get('/parishes/my');
        expect(urlOf(fetchMock.mock.calls[0])).not.toContain('api:3201');

        const win = globalThis.window;
        // @ts-expect-error simule le rendu serveur (pas de window)
        delete globalThis.window;
        try {
          await api.get('/public/parishes');
        } finally {
          globalThis.window = win;
        }
        expect(urlOf(fetchMock.mock.calls[1])).toBe('http://api:3201/api/public/parishes');
      } finally {
        vi.unstubAllEnvs();
      }
    });

    it('côté navigateur, ne force pas de politique de cache', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}));
      await api.get('/parishes/my');
      expect(fetchMock.mock.calls[0][1].cache).toBeUndefined();
    });

    it('sérialise le corps en JSON pour POST, sans corps si aucun n’est fourni', async () => {
      fetchMock.mockImplementation(async () => jsonResponse({}));
      await api.post('/auth/login', { email: 'a@b.fr' });
      expect(fetchMock.mock.calls[0][1].method).toBe('POST');
      expect(fetchMock.mock.calls[0][1].body).toBe('{"email":"a@b.fr"}');

      await api.post('/auth/logout');
      expect(fetchMock.mock.calls[1][1].body).toBeUndefined();
    });
  });

  describe('renouvellement automatique de la session', () => {
    it('sur 401, rafraîchit la session puis rejoue la requête une fois', async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ message: 'Unauthorized' }, 401)) // requête initiale
        .mockResolvedValueOnce(jsonResponse({ user: {} }, 200)) // /auth/refresh
        .mockResolvedValueOnce(jsonResponse([{ id: 'p1' }], 200)); // requête rejouée

      await expect(api.get('/parishes/my')).resolves.toEqual([{ id: 'p1' }]);

      expect(fetchMock.mock.calls.map(urlOf)).toEqual([
        expect.stringMatching(/\/parishes\/my$/),
        expect.stringMatching(/\/auth\/refresh$/),
        expect.stringMatching(/\/parishes\/my$/),
      ]);
      expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'POST', credentials: 'include' });
    });

    it('si le refresh échoue : émet l’événement de session expirée et lève l’erreur 401', async () => {
      const onExpired = vi.fn();
      window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ message: 'Unauthorized' }, 401))
        .mockResolvedValueOnce(jsonResponse({ message: 'Session expirée' }, 401));

      await expect(api.get('/parishes/my')).rejects.toMatchObject({ status: 401 });

      expect(onExpired).toHaveBeenCalledTimes(1);
      window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
    });

    it('ne boucle pas : un 401 sur la requête rejouée est une erreur, sans second refresh', async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ message: 'Unauthorized' }, 401))
        .mockResolvedValueOnce(jsonResponse({}, 200)) // refresh ok
        .mockResolvedValueOnce(jsonResponse({ message: 'Unauthorized' }, 401)); // toujours 401

      await expect(api.get('/parishes/my')).rejects.toBeInstanceOf(ApiError);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('partage un seul refresh entre plusieurs requêtes simultanées en 401', async () => {
      let refreshCalls = 0;
      fetchMock.mockImplementation(async (url: string) => {
        if (url.endsWith('/auth/refresh')) {
          refreshCalls++;
          await new Promise((r) => setTimeout(r, 20));
          return jsonResponse({}, 200);
        }
        // Premier passage : 401 ; une fois rafraîchi : 200.
        return refreshCalls === 0
          ? jsonResponse({ message: 'Unauthorized' }, 401)
          : jsonResponse({ ok: true }, 200);
      });

      await Promise.all([api.get('/a'), api.get('/b'), api.get('/c')]);

      expect(refreshCalls).toBe(1);
    });

    it.each([
      '/auth/login',
      '/auth/register',
      '/auth/forgot-password',
      '/auth/reset-password',
      '/auth/verify-email',
    ])('ne tente pas de refresh sur un 401 de %s (réponse normale)', async (path) => {
      fetchMock.mockResolvedValue(
        jsonResponse({ message: { message: 'Identifiants invalides' } }, 401),
      );
      await expect(api.post(path, {})).rejects.toThrow('Identifiants invalides');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('erreurs — format réel de HttpExceptionFilter (message est un objet)', () => {
    it('extrait le message d’une erreur Nest et expose le code HTTP', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(
          {
            statusCode: 409,
            message: { message: 'Email déjà utilisé', error: 'Conflict', statusCode: 409 },
          },
          409,
        ),
      );
      const error = (await api.post('/auth/register', {}).catch((e: unknown) => e)) as ApiError;
      expect(error).toBeInstanceOf(ApiError);
      expect(error.message).toBe('Email déjà utilisé');
      expect(error.status).toBe(409);
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

    it('retombe sur « Erreur inconnue » si la réponse n’est pas du JSON', async () => {
      fetchMock.mockResolvedValue(new Response('<html>', { status: 502 }));
      await expect(api.get('/x')).rejects.toThrow('Erreur inconnue');
    });
  });

  describe('erreurs', () => {
    it('erreur de validation Zod de l’API : message lisible ET erreurs par champ', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(
          {
            statusCode: 400,
            message: {
              formErrors: [],
              fieldErrors: { title: ['Titre requis'], body: ['Contenu requis'], ok: [] },
            },
          },
          400,
        ),
      );
      const err = await api.post<never>('/x', {}).catch((e: unknown) => e as ApiError);
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(400);
      expect(err.message).toBe('Titre requis');
      expect(err.fieldErrors).toEqual({ title: ['Titre requis'], body: ['Contenu requis'] });
    });

    it('erreur HttpException (403) : message du serveur, pas d’erreurs par champ', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(
          { statusCode: 403, message: 'Seul le créateur peut modifier ce contenu' },
          403,
        ),
      );
      const err = await api.patch<never>('/contents/1', {}).catch((e: unknown) => e as ApiError);
      expect(err.message).toBe('Seul le créateur peut modifier ce contenu');
      expect(err.fieldErrors).toEqual({});
    });

    it('erreur 500 sans JSON : message par défaut', async () => {
      fetchMock.mockResolvedValue(new Response('<html>oups</html>', { status: 500 }));
      const err = await api.get<never>('/x').catch((e: unknown) => e as ApiError);
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(500);
      expect(err.message).toBe('Erreur inconnue');
    });

    it('serveur injoignable : ApiError explicite (status 0), pas une TypeError brute', async () => {
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
      const err = await api.get<never>('/x').catch((e: unknown) => e as ApiError);
      expect(err).toBeInstanceOf(ApiError);
      expect(err.status).toBe(0);
      expect(err.message).toMatch(/joindre le serveur/);
    });

    it('non-régression : une suppression réussie sans corps ne lève pas d’erreur', async () => {
      fetchMock.mockResolvedValue(new Response('', { status: 200 }));
      await expect(api.delete('/contents/1')).resolves.toBeUndefined();
    });
  });
});
