import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { PrismaService } from '../../prisma/prisma.service';
import { AccountService } from './account.service';
import type { AuthSecurityService } from './auth-security.service';
import type { AuthService } from './auth.service';
import type { GoogleAuthService } from './google-auth.service';
import type { UserWithAuth } from './auth-user';
import type { PhoneAuthService } from './phone-auth.service';

type Fn = jest.Mock;

const user = (over: Record<string, unknown> = {}): UserWithAuth =>
  ({
    id: 'u1',
    email: 'jean@paroisse.fr',
    emailVerifiedAt: new Date(),
    firstName: 'Jean',
    lastName: 'Dupont',
    role: 'USER',
    locale: 'fr',
    passwordHash: null,
    phoneCredential: null,
    identities: [],
    ...over,
  }) as unknown as UserWithAuth;

describe('AccountService', () => {
  let prisma: {
    user: { update: Fn; findUniqueOrThrow: Fn };
    userPhoneCredential: { create: Fn; update: Fn };
    userAuthIdentity: { deleteMany: Fn };
    refreshToken: { updateMany: Fn };
  };
  let auth: { issueSession: Fn; sendEmailVerification: Fn };
  let phone: { hashPin: Fn; verifyPin: Fn };
  let google: { linkToAccount: Fn };
  let security: { assertNotBlocked: Fn; recordFailure: Fn; recordSuccess: Fn; audit: Fn };
  let service: AccountService;
  let current: ReturnType<typeof user>;

  beforeEach(() => {
    current = user();
    prisma = {
      user: {
        update: jest.fn(),
        findUniqueOrThrow: jest.fn().mockImplementation(async () => current),
      },
      userPhoneCredential: { create: jest.fn(), update: jest.fn() },
      userAuthIdentity: { deleteMany: jest.fn() },
      refreshToken: { updateMany: jest.fn() },
    };
    auth = {
      issueSession: jest.fn().mockResolvedValue({ accessToken: 'new-jwt', refreshToken: 'new-rt' }),
      sendEmailVerification: jest.fn().mockResolvedValue(undefined),
    };
    phone = {
      hashPin: jest.fn().mockResolvedValue('pin-hash'),
      verifyPin: jest.fn().mockImplementation(async (pin: string) => pin === '482915'),
    };
    google = { linkToAccount: jest.fn().mockResolvedValue(undefined) };
    security = {
      assertNotBlocked: jest.fn().mockResolvedValue(undefined),
      recordFailure: jest.fn().mockResolvedValue(undefined),
      recordSuccess: jest.fn().mockResolvedValue(undefined),
      audit: jest.fn().mockResolvedValue(undefined),
    };
    service = new AccountService(
      prisma as unknown as PrismaService,
      auth as unknown as AuthService,
      phone as unknown as PhoneAuthService,
      google as unknown as GoogleAuthService,
      security as unknown as AuthSecurityService,
    );
  });

  describe('preuve avant modification sensible', () => {
    it('compte avec mot de passe : le mot de passe actuel est exigé', async () => {
      const u = user({ passwordHash: await bcrypt.hash('password123', 4) });
      await expect(service.setPassword(u, { password: 'nouveau-mdp-1' })).rejects.toThrow(
        'currentSecretRequired',
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('un mauvais mot de passe actuel est compté comme échec et refusé', async () => {
      const u = user({ passwordHash: await bcrypt.hash('password123', 4) });
      await expect(
        service.setPassword(u, { password: 'nouveau-mdp-1', currentPassword: 'faux' }),
      ).rejects.toThrow('currentSecretInvalid');
      expect(security.recordFailure).toHaveBeenCalledWith('ACCOUNT_PROOF', 'proof:u1');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('compte téléphone seul : le PIN actuel sert de preuve', async () => {
      const u = user({ phoneCredential: { id: 'c1', phoneE164: '+237677123456', pinHash: 'h' } });
      await expect(service.setPassword(u, { password: 'nouveau-mdp-1' })).rejects.toThrow(
        'currentSecretRequired',
      );
      await expect(
        service.setPassword(u, { password: 'nouveau-mdp-1', currentPin: '000001' }),
      ).rejects.toThrow('currentSecretInvalid');
    });

    it('compte uniquement Google : aucune preuve à fournir', async () => {
      const u = user({ identities: [{ provider: 'GOOGLE' }] });
      await expect(service.setPassword(u, { password: 'nouveau-mdp-1' })).resolves.toBeDefined();
    });

    it('verrouillé après trop d’essais : refus avant de vérifier quoi que ce soit', async () => {
      security.assertNotBlocked.mockRejectedValue(new Error('tooManyAttempts'));
      const u = user({ passwordHash: await bcrypt.hash('password123', 4) });
      await expect(
        service.setPassword(u, { password: 'nouveau-mdp-1', currentPassword: 'password123' }),
      ).rejects.toThrow('tooManyAttempts');
    });
  });

  describe('setPassword', () => {
    it('crée le mot de passe (haché), coupe les anciennes sessions et en ouvre une neuve', async () => {
      const u = user({ identities: [{ provider: 'GOOGLE' }] });
      const result = await service.setPassword(u, { password: 'nouveau-mdp-1' });
      const hash = prisma.user.update.mock.calls[0][0].data.passwordHash;
      expect(hash).not.toBe('nouveau-mdp-1');
      expect(await bcrypt.compare('nouveau-mdp-1', hash)).toBe(true);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(result.session.accessToken).toBe('new-jwt');
      expect(security.audit).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'PASSWORD_SET' }),
      );
    });

    it('sans email, un mot de passe ne servirait à rien : on demande d’abord l’email', async () => {
      const u = user({ email: null, phoneCredential: { id: 'c1', pinHash: 'h' } });
      await expect(
        service.setPassword(u, { password: 'nouveau-mdp-1', currentPin: '482915' }),
      ).rejects.toThrow('emailRequired');
    });
  });

  describe('addEmail', () => {
    it('refuse si le compte a déjà un email', async () => {
      await expect(service.addEmail(user(), { email: 'autre@mail.fr' })).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('ajoute l’email non confirmé et envoie le lien de confirmation', async () => {
      const u = user({ email: null, phoneCredential: { id: 'c1', pinHash: 'h' } });
      current = user({ email: 'jean@paroisse.fr', emailVerifiedAt: null });
      const dto = await service.addEmail(u, { email: 'jean@paroisse.fr', currentPin: '482915' });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { email: 'jean@paroisse.fr', emailVerifiedAt: null },
      });
      expect(auth.sendEmailVerification).toHaveBeenCalled();
      expect(dto.emailVerified).toBe(false);
    });

    it('email déjà pris par un autre compte : conflit', async () => {
      const u = user({ email: null, identities: [{ provider: 'GOOGLE' }] });
      prisma.user.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }),
      );
      await expect(service.addEmail(u, { email: 'pris@mail.fr' })).rejects.toThrow(
        'emailAlreadyUsed',
      );
    });
  });

  describe('setPhonePin', () => {
    const dto = { phone: '+237677123456', pin: '739104' };

    it('refuse si le compte a déjà un PIN', async () => {
      const u = user({ phoneCredential: { id: 'c1' } });
      await expect(service.setPhonePin(u, dto)).rejects.toBeInstanceOf(ConflictException);
    });

    it('crée le PIN haché, non vérifié, après la preuve par mot de passe', async () => {
      const u = user({ passwordHash: await bcrypt.hash('password123', 4) });
      await service.setPhonePin(u, { ...dto, currentPassword: 'password123' });
      expect(prisma.userPhoneCredential.create).toHaveBeenCalledWith({
        data: { userId: 'u1', phoneE164: '+237677123456', pinHash: 'pin-hash' },
      });
      expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
    });

    it('sans preuve, un compte avec mot de passe ne peut pas ajouter de PIN', async () => {
      const u = user({ passwordHash: await bcrypt.hash('password123', 4) });
      await expect(service.setPhonePin(u, dto)).rejects.toThrow('currentSecretRequired');
      expect(prisma.userPhoneCredential.create).not.toHaveBeenCalled();
    });

    it('numéro déjà pris : conflit', async () => {
      const u = user({ identities: [{ provider: 'GOOGLE' }] });
      prisma.userPhoneCredential.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }),
      );
      await expect(service.setPhonePin(u, dto)).rejects.toThrow('phoneAlreadyUsed');
    });
  });

  describe('changePin', () => {
    const withPin = () =>
      user({ phoneCredential: { id: 'c1', phoneE164: '+237677123456', pinHash: 'h' } });

    it('refuse si aucun PIN n’est défini', async () => {
      await expect(
        service.changePin(user(), { currentPin: '482915', pin: '739104' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('change le PIN avec le PIN actuel, lève le verrou et ouvre une session neuve', async () => {
      const result = await service.changePin(withPin(), { currentPin: '482915', pin: '739104' });
      expect(prisma.userPhoneCredential.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { pinHash: 'pin-hash' },
      });
      expect(security.recordSuccess).toHaveBeenCalledWith('PHONE_LOGIN', '+237677123456');
      expect(result.session.accessToken).toBe('new-jwt');
    });

    it('le mot de passe ne remplace pas le PIN actuel', async () => {
      const u = withPin();
      u.passwordHash = await bcrypt.hash('password123', 4);
      await expect(service.changePin(u, { currentPin: '000001', pin: '739104' })).rejects.toThrow(
        'currentSecretInvalid',
      );
      expect(prisma.userPhoneCredential.update).not.toHaveBeenCalled();
    });
  });

  describe('Google', () => {
    it('lie Google après la preuve et renvoie le compte à jour', async () => {
      const u = user({ passwordHash: await bcrypt.hash('password123', 4) });
      await service.linkGoogle(u, { idToken: 't', currentPassword: 'password123' });
      expect(google.linkToAccount).toHaveBeenCalledWith(u, 't', undefined);
    });

    it('sans la preuve, ne contacte pas Google', async () => {
      const u = user({ passwordHash: await bcrypt.hash('password123', 4) });
      await expect(service.linkGoogle(u, { idToken: 't' })).rejects.toThrow(
        'currentSecretRequired',
      );
      expect(google.linkToAccount).not.toHaveBeenCalled();
    });

    it('délie Google quand un autre moyen de connexion existe', async () => {
      const u = user({
        passwordHash: await bcrypt.hash('password123', 4),
        identities: [{ provider: 'GOOGLE' }],
      });
      await service.unlinkGoogle(u, { currentPassword: 'password123' });
      expect(prisma.userAuthIdentity.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'u1', provider: 'GOOGLE' },
      });
    });

    it('refuse de délier Google quand c’est le dernier moyen de connexion', async () => {
      const u = user({ identities: [{ provider: 'GOOGLE' }] });
      await expect(service.unlinkGoogle(u, {})).rejects.toThrow('lastLoginMethod');
      expect(prisma.userAuthIdentity.deleteMany).not.toHaveBeenCalled();
    });

    it('refuse de délier quand rien n’est lié', async () => {
      await expect(service.unlinkGoogle(user({ passwordHash: 'h' }), {})).rejects.toThrow(
        'googleNotLinked',
      );
    });
  });
});
