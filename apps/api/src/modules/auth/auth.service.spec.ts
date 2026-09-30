import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const dto = { email: 'a@b.fr', password: 'password123', firstName: 'Jean', lastName: 'Dupont' };
  let prisma: { user: { findUnique: jest.Mock; create: jest.Mock } };
  let jwt: { sign: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    prisma = { user: { findUnique: jest.fn(), create: jest.fn() } };
    jwt = { sign: jest.fn().mockReturnValue('signed.jwt') };
    service = new AuthService(prisma as any, jwt as any);
  });

  describe('register', () => {
    it('refuse un email déjà utilisé', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      await expect(service.register(dto)).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('hache le mot de passe, crée l’utilisateur et renvoie un jeton sans le hash', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation(async ({ data }: any) => ({ id: 'u1', ...data }));

      const res = await service.register(dto);

      const created = prisma.user.create.mock.calls[0][0].data;
      expect(created.passwordHash).not.toBe(dto.password);
      expect(await bcrypt.compare(dto.password, created.passwordHash)).toBe(true);
      expect(res.tokens.accessToken).toBe('signed.jwt');
      expect(jwt.sign).toHaveBeenCalledWith({ sub: 'u1', email: dto.email });
      expect(JSON.stringify(res)).not.toContain('passwordHash');
    });
  });

  describe('login', () => {
    it('refuse un utilisateur inconnu', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login({ email: dto.email, password: 'x' })).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('refuse un mauvais mot de passe', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: dto.email,
        passwordHash: await bcrypt.hash('autre', 4),
      });
      await expect(
        service.login({ email: dto.email, password: 'password123' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('renvoie un jeton pour des identifiants valides', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: dto.email,
        firstName: 'Jean',
        lastName: 'Dupont',
        passwordHash: await bcrypt.hash(dto.password, 4),
      });
      const res = await service.login({ email: dto.email, password: dto.password });
      expect(res.tokens.accessToken).toBe('signed.jwt');
      expect(res.user.id).toBe('u1');
    });
  });
});
