import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { env } from '../../config/env';
import { GoogleIdTokenVerifier } from './google-token.verifier';

const verifyIdToken = jest.fn();
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({ verifyIdToken })),
}));

jest.mock('../../config/env', () => ({ env: {} as { GOOGLE_CLIENT_ID?: string } }));

const loadVerifier = (clientId: string | undefined) => {
  env.GOOGLE_CLIENT_ID = clientId;
  return new GoogleIdTokenVerifier();
};

describe('GoogleIdTokenVerifier', () => {
  beforeEach(() => verifyIdToken.mockReset());

  it('n’est pas configuré sans GOOGLE_CLIENT_ID, et refuse alors de vérifier', async () => {
    const verifier = loadVerifier(undefined);
    expect(verifier.isConfigured()).toBe(false);
    await expect(verifier.verify('token')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it('vérifie le jeton pour NOTRE identifiant client (audience)', async () => {
    verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'g-123',
        email: 'Jean@Gmail.com',
        email_verified: true,
        given_name: 'Jean',
        family_name: 'Dupont',
      }),
    });
    const verifier = loadVerifier('client-id.apps.googleusercontent.com');
    expect(verifier.isConfigured()).toBe(true);

    const profile = await verifier.verify('id.token');

    expect(verifyIdToken).toHaveBeenCalledWith({
      idToken: 'id.token',
      audience: 'client-id.apps.googleusercontent.com',
    });
    expect(profile).toEqual({
      sub: 'g-123',
      email: 'jean@gmail.com',
      emailVerified: true,
      firstName: 'Jean',
      lastName: 'Dupont',
    });
  });

  it('un email non vérifié par Google est signalé comme tel', async () => {
    verifyIdToken.mockResolvedValue({
      getPayload: () => ({ sub: 'g-1', email: 'a@b.fr', email_verified: false }),
    });
    const profile = await loadVerifier('cid').verify('t');
    expect(profile.emailVerified).toBe(false);
  });

  it.each([
    [
      'signature, audience ou expiration invalide',
      () => Promise.reject(new Error('Wrong recipient')),
    ],
    ['jeton sans contenu', () => Promise.resolve({ getPayload: () => undefined })],
    ['jeton sans email', () => Promise.resolve({ getPayload: () => ({ sub: 'x' }) })],
    ['jeton sans identifiant', () => Promise.resolve({ getPayload: () => ({ email: 'a@b.fr' }) })],
  ])('rejette : %s', async (_label, impl) => {
    verifyIdToken.mockImplementation(impl);
    await expect(loadVerifier('cid').verify('t')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('ne divulgue pas la cause de l’échec', async () => {
    verifyIdToken.mockRejectedValue(new Error('secret interne de la librairie'));
    const err = (await loadVerifier('cid')
      .verify('t')
      .catch((e: Error) => e)) as Error;
    expect(err.message).toBe('googleTokenInvalid');
  });
});
