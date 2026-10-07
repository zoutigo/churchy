import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { PrismaService } from '../../prisma/prisma.service';
import type { AuthSecurityService } from './auth-security.service';
import type { AuthService } from './auth.service';
import { PhoneAuthService } from './phone-auth.service';
import { hashPin, verifyPin } from './pin-hash';

type Fn = jest.Mock;
const PHONE = '+237677123456';
const PIN = '482915';

const credential = async (over: Record<string, unknown> = {}) => ({
  id: 'c1',
  userId: 'u1',
  phoneE164: PHONE,
  pinHash: await hashPin(PIN),
  verifiedAt: null,
  user: dbUser(),
  ...over,
});

const dbUser = (over: Record<string, unknown> = {}) => ({
  id: 'u1',
  email: null,
  emailVerifiedAt: null,
  firstName: 'Jean',
  lastName: 'Dupont',
  role: 'USER',
  locale: 'fr',
  passwordHash: null,
  phoneCredential: { phoneE164: PHONE },
  identities: [],
  ...over,
});

describe('PhoneAuthService', () => {
  let prisma: {
    user: { create: Fn };
    userPhoneCredential: { findUnique: Fn; update: Fn };
    authToken: { updateMany: Fn };
    refreshToken: { updateMany: Fn };
    $transaction: Fn;
  };
  let auth: {
    issueSession: Fn;
    createLinkToken: Fn;
    findUsableAuthToken: Fn;
    enqueueSafely: Fn;
  };
  let security: { assertNotBlocked: Fn; recordFailure: Fn; recordSuccess: Fn; audit: Fn };
  let service: PhoneAuthService;

  beforeEach(() => {
    prisma = {
      user: { create: jest.fn() },
      userPhoneCredential: { findUnique: jest.fn(), update: jest.fn() },
      authToken: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      refreshToken: { updateMany: jest.fn() },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    auth = {
      issueSession: jest.fn().mockResolvedValue({ accessToken: 'jwt', refreshToken: 'rt' }),
      createLinkToken: jest.fn().mockResolvedValue({
        url: 'http://x/reset-pin?token=t',
        expiresAt: '2026-10-01T10:00:00.000Z',
      }),
      findUsableAuthToken: jest.fn().mockResolvedValue({ id: 't1', userId: 'u1' }),
      enqueueSafely: jest.fn().mockResolvedValue(undefined),
    };
    security = {
      assertNotBlocked: jest.fn().mockResolvedValue(undefined),
      recordFailure: jest.fn().mockResolvedValue(undefined),
      recordSuccess: jest.fn().mockResolvedValue(undefined),
      audit: jest.fn().mockResolvedValue(undefined),
    };
    service = new PhoneAuthService(
      prisma as unknown as PrismaService,
      auth as unknown as AuthService,
      security as unknown as AuthSecurityService,
    );
  });

  describe('register', () => {
    const dto = { phone: PHONE, pin: PIN, firstName: 'Jean', lastName: 'Dupont' };

    it('refuse un numéro déjà utilisé sans rien créer', async () => {
      prisma.userPhoneCredential.findUnique.mockResolvedValue(await credential());
      await expect(service.register(dto)).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('crée un compte sans email ni mot de passe, PIN haché, numéro non vérifié', async () => {
      prisma.userPhoneCredential.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) =>
        dbUser({ firstName: data.firstName, locale: data.locale }),
      );

      const { user } = await service.register({ ...dto, locale: 'en' });

      const data = prisma.user.create.mock.calls[0][0].data;
      expect(data.email).toBeUndefined();
      expect(data.passwordHash).toBeUndefined();
      expect(data.locale).toBe('en');
      expect(data.phoneCredential.create.phoneE164).toBe(PHONE);
      expect(data.phoneCredential.create.pinHash).not.toBe(PIN);
      expect(await verifyPin(PIN, data.phoneCredential.create.pinHash)).toBe(true);
      expect(data.phoneCredential.create.verifiedAt).toBeUndefined();
      expect(user.email).toBeNull();
      expect(user.phone).toBe(PHONE);
      expect(JSON.stringify(user)).not.toContain('pinHash');
      expect(auth.issueSession).toHaveBeenCalled();
    });

    it('journalise le numéro masqué, jamais en clair', async () => {
      prisma.userPhoneCredential.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(dbUser());
      await service.register(dto);
      const audit = security.audit.mock.calls[0][0];
      expect(audit.event).toBe('REGISTER');
      expect(audit.principal).not.toContain('677123');
    });

    it('convertit une collision de la base (inscriptions simultanées) en conflit', async () => {
      prisma.userPhoneCredential.findUnique.mockResolvedValue(null);
      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }),
      );
      await expect(service.register(dto)).rejects.toBeInstanceOf(ConflictException);
    });

    it('laisse remonter une autre erreur de la base', async () => {
      prisma.userPhoneCredential.findUnique.mockResolvedValue(null);
      prisma.user.create.mockRejectedValue(new Error('boom'));
      await expect(service.register(dto)).rejects.toThrow('boom');
    });
  });

  describe('login', () => {
    it('ouvre une session avec le bon PIN, même si le numéro n’est pas vérifié', async () => {
      prisma.userPhoneCredential.findUnique.mockResolvedValue(
        await credential({ verifiedAt: null }),
      );
      const { user } = await service.login({ phone: PHONE, pin: PIN });
      expect(user.id).toBe('u1');
      expect(security.recordSuccess).toHaveBeenCalledWith('PHONE_LOGIN', PHONE);
      expect(security.audit).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'LOGIN_PHONE', status: 'SUCCESS' }),
      );
    });

    it('refait le haché d’un PIN d’avant le poivre après une connexion réussie, jamais après un échec', async () => {
      const legacy = await bcrypt.hash(PIN, 4);
      prisma.userPhoneCredential.findUnique.mockResolvedValue(
        await credential({ pinHash: legacy }),
      );
      await expect(service.login({ phone: PHONE, pin: '000001' })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(prisma.userPhoneCredential.update).not.toHaveBeenCalled();

      await service.login({ phone: PHONE, pin: PIN });
      const update = prisma.userPhoneCredential.update.mock.calls[0][0];
      expect(update.where).toEqual({ id: 'c1' });
      expect(update.data.pinHash).toMatch(/^p1\$/);
      expect(await verifyPin(PIN, update.data.pinHash)).toBe(true);
    });

    it('ne touche pas au haché d’un PIN déjà poivré', async () => {
      prisma.userPhoneCredential.findUnique.mockResolvedValue(await credential());
      await service.login({ phone: PHONE, pin: PIN });
      expect(prisma.userPhoneCredential.update).not.toHaveBeenCalled();
    });

    it('refuse un mauvais PIN, le compte et le journalise', async () => {
      prisma.userPhoneCredential.findUnique.mockResolvedValue(await credential());
      await expect(service.login({ phone: PHONE, pin: '000001' })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(security.recordFailure).toHaveBeenCalledWith('PHONE_LOGIN', PHONE);
      expect(security.recordSuccess).not.toHaveBeenCalled();
      expect(auth.issueSession).not.toHaveBeenCalled();
    });

    it('un numéro inconnu reçoit la même erreur, et un échec est compté', async () => {
      prisma.userPhoneCredential.findUnique.mockResolvedValue(null);
      await expect(service.login({ phone: PHONE, pin: PIN })).rejects.toThrow('invalidCredentials');
      expect(security.recordFailure).toHaveBeenCalledWith('PHONE_LOGIN', PHONE);
    });

    it('refuse avant toute vérification quand le numéro est verrouillé', async () => {
      security.assertNotBlocked.mockRejectedValue(new Error('tooManyAttempts'));
      await expect(service.login({ phone: PHONE, pin: PIN })).rejects.toThrow('tooManyAttempts');
      expect(prisma.userPhoneCredential.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('requestPinReset', () => {
    it('envoie le lien à l’email vérifié du compte', async () => {
      prisma.userPhoneCredential.findUnique.mockResolvedValue(
        await credential({
          user: dbUser({ email: 'jean@paroisse.fr', emailVerifiedAt: new Date(), locale: 'en' }),
        }),
      );
      await service.requestPinReset(PHONE);
      expect(auth.createLinkToken).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'u1' }),
        'PIN_RESET',
        'reset-pin',
        60 * 60 * 1000,
      );
      expect(auth.enqueueSafely).toHaveBeenCalledWith(
        'pinResetRequested',
        expect.objectContaining({ email: 'jean@paroisse.fr', locale: 'en' }),
      );
    });

    it.each([
      ['numéro inconnu', null],
      ['compte sans email', { user: dbUser() }],
      ['email jamais confirmé', { user: dbUser({ email: 'a@b.fr', emailVerifiedAt: null }) }],
    ])('n’envoie rien et ne le révèle pas : %s', async (_label, row) => {
      prisma.userPhoneCredential.findUnique.mockResolvedValue(row ? await credential(row) : null);
      await expect(service.requestPinReset(PHONE)).resolves.toBeUndefined();
      expect(auth.createLinkToken).not.toHaveBeenCalled();
      expect(auth.enqueueSafely).not.toHaveBeenCalled();
    });

    it('limite le nombre de demandes par numéro (anti-inondation de la boîte mail)', async () => {
      prisma.userPhoneCredential.findUnique.mockResolvedValue(null);
      await service.requestPinReset(PHONE);
      expect(security.recordFailure).toHaveBeenCalledWith('ACCOUNT_PROOF', `pin-reset:${PHONE}`);
      security.assertNotBlocked.mockRejectedValue(new Error('tooManyAttempts'));
      await expect(service.requestPinReset(PHONE)).rejects.toThrow('tooManyAttempts');
    });
  });

  describe('resetPin', () => {
    it('change le PIN, déconnecte toutes les sessions et consomme le jeton', async () => {
      prisma.userPhoneCredential.findUnique.mockResolvedValue(await credential());
      await service.resetPin('token', '739104');

      expect(auth.findUsableAuthToken).toHaveBeenCalledWith('token', 'PIN_RESET');
      expect(prisma.authToken.updateMany).toHaveBeenCalledWith({
        where: { id: 't1', usedAt: null },
        data: { usedAt: expect.any(Date) },
      });
      expect(prisma.$transaction).toHaveBeenCalled();
      const update = prisma.userPhoneCredential.update.mock.calls[0][0];
      expect(await verifyPin('739104', update.data.pinHash)).toBe(true);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      // Le verrou posé par des essais ratés est levé : la personne peut se reconnecter tout de suite.
      expect(security.recordSuccess).toHaveBeenCalledWith('PHONE_LOGIN', PHONE);
    });

    it('un jeton déjà consommé par une requête simultanée est refusé', async () => {
      prisma.userPhoneCredential.findUnique.mockResolvedValue(await credential());
      prisma.authToken.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.resetPin('token', '739104')).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.userPhoneCredential.update).not.toHaveBeenCalled();
    });

    it('refuse si le compte n’a pas de PIN', async () => {
      prisma.userPhoneCredential.findUnique.mockResolvedValue(null);
      await expect(service.resetPin('token', '739104')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuse un jeton invalide (l’erreur de la vérification remonte)', async () => {
      auth.findUsableAuthToken.mockRejectedValue(new BadRequestException('linkInvalidOrExpired'));
      await expect(service.resetPin('mauvais', '739104')).rejects.toThrow('linkInvalidOrExpired');
    });
  });

  describe('issuePinResetLink (administrateur de la plateforme)', () => {
    it('fabrique un lien de 24 h et journalise qui l’a demandé', async () => {
      prisma.userPhoneCredential.findUnique.mockResolvedValue(await credential());
      const link = await service.issuePinResetLink('admin1', PHONE);
      expect(auth.createLinkToken).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'u1' }),
        'PIN_RESET',
        'reset-pin',
        24 * 60 * 60 * 1000,
      );
      expect(link).toEqual({
        url: 'http://x/reset-pin?token=t',
        expiresAt: '2026-10-01T10:00:00.000Z',
        firstName: 'Jean',
        lastName: 'Dupont',
      });
      expect(security.audit).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'PIN_RESET_ISSUED_BY_ADMIN',
          userId: 'u1',
          reasonCode: 'admin:admin1',
        }),
      );
    });

    it('404 si aucun compte n’a ce numéro', async () => {
      prisma.userPhoneCredential.findUnique.mockResolvedValue(null);
      await expect(service.issuePinResetLink('admin1', PHONE)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(auth.createLinkToken).not.toHaveBeenCalled();
    });
  });
});
