import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { PrismaService } from '../../prisma/prisma.service';
import type { AuthSecurityService } from './auth-security.service';
import type { AuthService } from './auth.service';
import type { UserWithAuth } from './auth-user';
import { GoogleAuthService } from './google-auth.service';
import type { GoogleProfile, GoogleTokenVerifier } from './google-token.verifier';

type Fn = jest.Mock;

const profile = (over: Partial<GoogleProfile> = {}): GoogleProfile => ({
  sub: 'g-1',
  email: 'jean@gmail.com',
  emailVerified: true,
  firstName: 'Jean',
  lastName: 'Dupont',
  ...over,
});

const dbUser = (over: Record<string, unknown> = {}) => ({
  id: 'u1',
  email: 'jean@gmail.com',
  emailVerifiedAt: new Date(),
  firstName: 'Jean',
  lastName: 'Dupont',
  role: 'USER',
  locale: 'fr',
  passwordHash: null,
  phoneCredential: null,
  identities: [],
  ...over,
});

describe('GoogleAuthService', () => {
  let prisma: {
    userAuthIdentity: { findUnique: Fn; create: Fn; deleteMany: Fn };
    user: { findUnique: Fn; findUniqueOrThrow: Fn; create: Fn; update: Fn };
    userPhoneCredential: { deleteMany: Fn };
    refreshToken: { updateMany: Fn };
    authToken: { updateMany: Fn };
    $transaction: Fn;
  };
  let auth: { issueSession: Fn };
  let security: { assertNotBlocked: Fn; recordFailure: Fn; recordSuccess: Fn; audit: Fn };
  let verifier: { isConfigured: Fn; verify: Fn };
  let service: GoogleAuthService;

  beforeEach(() => {
    prisma = {
      userAuthIdentity: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        findUniqueOrThrow: jest.fn().mockResolvedValue(dbUser()),
        create: jest.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) =>
          dbUser({
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            locale: data.locale,
            identities: [{ provider: 'GOOGLE' }],
          }),
        ),
        update: jest.fn(),
      },
      userPhoneCredential: { deleteMany: jest.fn() },
      refreshToken: { updateMany: jest.fn() },
      authToken: { updateMany: jest.fn() },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    auth = {
      issueSession: jest.fn().mockResolvedValue({ accessToken: 'jwt', refreshToken: 'rt' }),
    };
    security = {
      assertNotBlocked: jest.fn().mockResolvedValue(undefined),
      recordFailure: jest.fn().mockResolvedValue(undefined),
      recordSuccess: jest.fn().mockResolvedValue(undefined),
      audit: jest.fn().mockResolvedValue(undefined),
    };
    verifier = {
      isConfigured: jest.fn().mockReturnValue(true),
      verify: jest.fn().mockResolvedValue(profile()),
    };
    service = new GoogleAuthService(
      prisma as unknown as PrismaService,
      auth as unknown as AuthService,
      security as unknown as AuthSecurityService,
      verifier as unknown as GoogleTokenVerifier,
    );
  });

  describe('login', () => {
    it('refuse quand Google n’est pas configuré, sans vérifier de jeton', async () => {
      verifier.isConfigured.mockReturnValue(false);
      await expect(service.login({ idToken: 't' })).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(verifier.verify).not.toHaveBeenCalled();
    });

    it('refuse un email que Google n’a pas vérifié', async () => {
      verifier.verify.mockResolvedValue(profile({ emailVerified: false }));
      await expect(service.login({ idToken: 't' })).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('connecte le compte déjà lié, trouvé par l’identifiant Google (pas par l’email)', async () => {
      prisma.userAuthIdentity.findUnique.mockResolvedValue({
        user: dbUser({ email: 'ancien@mail.fr' }),
      });
      const out = await service.login({ idToken: 't' });
      expect(out.status).toBe('ok');
      expect(prisma.userAuthIdentity.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { provider_providerAccountId: { provider: 'GOOGLE', providerAccountId: 'g-1' } },
        }),
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('crée un compte confirmé, sans mot de passe, dans la langue demandée', async () => {
      const out = await service.login({ idToken: 't', locale: 'en' });
      expect(out.status).toBe('ok');
      const data = prisma.user.create.mock.calls[0][0].data;
      expect(data.email).toBe('jean@gmail.com');
      expect(data.emailVerifiedAt).toBeInstanceOf(Date);
      expect(data.passwordHash).toBeUndefined();
      expect(data.locale).toBe('en');
      expect(data.identities.create).toEqual(
        expect.objectContaining({ provider: 'GOOGLE', providerAccountId: 'g-1' }),
      );
    });

    it('invente un prénom et un nom si Google n’en donne pas', async () => {
      verifier.verify.mockResolvedValue(profile({ firstName: undefined, lastName: undefined }));
      await service.login({ idToken: 't' });
      const data = prisma.user.create.mock.calls[0][0].data;
      expect(data.firstName).toBe('jean');
      expect(data.lastName).toBe('-');
    });

    it('ne fusionne JAMAIS en silence avec un compte email confirmé : demande le mot de passe', async () => {
      prisma.user.findUnique.mockResolvedValue(
        dbUser({ passwordHash: 'h', emailVerifiedAt: new Date() }),
      );
      const out = await service.login({ idToken: 't' });
      expect(out).toEqual({ status: 'link_required', email: 'jean@gmail.com' });
      expect(prisma.userAuthIdentity.create).not.toHaveBeenCalled();
      expect(auth.issueSession).not.toHaveBeenCalled();
    });

    it('email du compte jamais confirmé : Google prouve la propriété, on reprend le compte', async () => {
      prisma.user.findUnique.mockResolvedValue(
        dbUser({ passwordHash: 'pirate', emailVerifiedAt: null }),
      );
      const out = await service.login({ idToken: 't' });
      expect(out.status).toBe('ok');
      // Les identifiants posés par l'ancien « propriétaire » disparaissent et ses sessions sont coupées.
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { passwordHash: null, emailVerifiedAt: expect.any(Date) },
      });
      expect(prisma.userPhoneCredential.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
      });
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'u1', revokedAt: null } }),
      );
      expect(prisma.authToken.updateMany).toHaveBeenCalled();
      expect(prisma.userAuthIdentity.create).toHaveBeenCalled();
      expect(security.audit).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'ACCOUNT_TAKEOVER_CLEARED' }),
      );
    });

    it('collision à la création (course) : conflit, pas d’erreur 500', async () => {
      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }),
      );
      await expect(service.login({ idToken: 't' })).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('linkWithPassword', () => {
    const dto = { idToken: 't', password: 'password123' };

    it('lie Google quand le mot de passe est bon', async () => {
      prisma.user.findUnique.mockResolvedValue(
        dbUser({ passwordHash: await bcrypt.hash('password123', 4) }),
      );
      const result = await service.linkWithPassword(dto);
      expect(result.session.accessToken).toBe('jwt');
      expect(prisma.userAuthIdentity.create).toHaveBeenCalled();
      expect(security.recordSuccess).toHaveBeenCalledWith('PASSWORD_LOGIN', 'jean@gmail.com');
    });

    it('refuse un mauvais mot de passe, le compte comme échec et ne lie rien', async () => {
      prisma.user.findUnique.mockResolvedValue(
        dbUser({ passwordHash: await bcrypt.hash('autre', 4) }),
      );
      await expect(service.linkWithPassword(dto)).rejects.toThrow('invalidCredentials');
      expect(security.recordFailure).toHaveBeenCalledWith('PASSWORD_LOGIN', 'jean@gmail.com');
      expect(prisma.userAuthIdentity.create).not.toHaveBeenCalled();
    });

    it('un compte sans mot de passe ne peut pas être lié ainsi : connexion préalable demandée', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser({ passwordHash: null }));
      await expect(service.linkWithPassword(dto)).rejects.toThrow('googleLinkLoginFirst');
      expect(prisma.userAuthIdentity.create).not.toHaveBeenCalled();
    });

    it('refuse si un Google est déjà lié', async () => {
      prisma.user.findUnique.mockResolvedValue(
        dbUser({ passwordHash: 'h', identities: [{ provider: 'GOOGLE' }] }),
      );
      await expect(service.linkWithPassword(dto)).rejects.toBeInstanceOf(ConflictException);
    });

    it('404 si aucun compte n’a cet email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.linkWithPassword(dto)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('verrouillé après trop d’échecs : refus avant toute vérification', async () => {
      security.assertNotBlocked.mockRejectedValue(new Error('tooManyAttempts'));
      await expect(service.linkWithPassword(dto)).rejects.toThrow('tooManyAttempts');
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('ce compte Google appartient déjà à un autre compte Churchy : conflit explicite', async () => {
      prisma.user.findUnique.mockResolvedValue(
        dbUser({ passwordHash: await bcrypt.hash('password123', 4) }),
      );
      prisma.userAuthIdentity.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }),
      );
      await expect(service.linkWithPassword(dto)).rejects.toThrow('googleLinkedElsewhere');
    });
  });

  describe('linkToAccount (depuis Sécurité)', () => {
    it('lie et confirme l’email du compte si c’est celui de Google', async () => {
      const user = dbUser({ emailVerifiedAt: null }) as unknown as UserWithAuth;
      await service.linkToAccount(user, 't');
      expect(prisma.userAuthIdentity.create).toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { emailVerifiedAt: expect.any(Date) },
      });
    });

    it('ne confirme pas un email différent de celui de Google', async () => {
      const user = dbUser({
        email: 'autre@mail.fr',
        emailVerifiedAt: null,
      }) as unknown as UserWithAuth;
      await service.linkToAccount(user, 't');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('refuse si Google est déjà lié', async () => {
      const user = dbUser({ identities: [{ provider: 'GOOGLE' }] }) as unknown as UserWithAuth;
      await expect(service.linkToAccount(user, 't')).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('providers', () => {
    it('expose l’identifiant client seulement si Google est configuré', () => {
      verifier.isConfigured.mockReturnValue(false);
      expect(service.providers()).toEqual({ google: null });
    });
  });
});
