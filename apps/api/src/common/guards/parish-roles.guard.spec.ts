import { ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ParishRole } from '@churchy/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { PARISH_ROLES_KEY, PARISH_SCOPE_KEY } from '../decorators/roles.decorator';
import { ParishRolesGuard } from './parish-roles.guard';

type Fn = jest.Mock;

describe('ParishRolesGuard', () => {
  let prisma: {
    parishMember: { findUnique: Fn };
    celebration: { findUnique: Fn };
    celebrationTemplate: { findUnique: Fn };
    celebrationTemplateStep: { findUnique: Fn };
    content: { findUnique: Fn };
  };
  let metadata: Record<string, unknown>;
  let guard: ParishRolesGuard;

  const ctx = (user: unknown, params: Record<string, string>) =>
    ({
      getHandler: () => 'handler',
      getClass: () => 'class',
      switchToHttp: () => ({ getRequest: () => ({ user, params }) }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    prisma = {
      parishMember: { findUnique: jest.fn() },
      celebration: { findUnique: jest.fn() },
      celebrationTemplate: { findUnique: jest.fn() },
      celebrationTemplateStep: { findUnique: jest.fn() },
      content: { findUnique: jest.fn() },
    };
    metadata = {};
    const reflector = { getAllAndOverride: (key: string) => metadata[key] } as unknown as Reflector;
    guard = new ParishRolesGuard(reflector, prisma as unknown as PrismaService);
  });

  it('laisse passer une route sans rôle requis', async () => {
    await expect(guard.canActivate(ctx({ id: 'u1' }, {}))).resolves.toBe(true);
  });

  it('laisse passer un SUPER_ADMIN', async () => {
    metadata[PARISH_ROLES_KEY] = [ParishRole.PARISH_ADMIN];
    await expect(
      guard.canActivate(ctx({ id: 'u1', role: 'SUPER_ADMIN' }, { parishId: 'p1' })),
    ).resolves.toBe(true);
    expect(prisma.parishMember.findUnique).not.toHaveBeenCalled();
  });

  it('autorise un membre avec le bon rôle (paroisse dans l’URL)', async () => {
    metadata[PARISH_ROLES_KEY] = [ParishRole.PARISH_ADMIN, ParishRole.PREPARER];
    prisma.parishMember.findUnique.mockResolvedValue({ role: ParishRole.PREPARER });
    await expect(
      guard.canActivate(ctx({ id: 'u1', role: 'USER' }, { parishId: 'p1' })),
    ).resolves.toBe(true);
    expect(prisma.parishMember.findUnique).toHaveBeenCalledWith({
      where: { userId_parishId: { userId: 'u1', parishId: 'p1' } },
    });
  });

  it('refuse un non-membre', async () => {
    metadata[PARISH_ROLES_KEY] = [ParishRole.PARISH_ADMIN];
    prisma.parishMember.findUnique.mockResolvedValue(null);
    await expect(
      guard.canActivate(ctx({ id: 'u1', role: 'USER' }, { parishId: 'p1' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuse un membre dont le rôle est insuffisant', async () => {
    metadata[PARISH_ROLES_KEY] = [ParishRole.PARISH_ADMIN, ParishRole.PREPARER];
    prisma.parishMember.findUnique.mockResolvedValue({ role: ParishRole.VIEWER });
    await expect(
      guard.canActivate(ctx({ id: 'u1', role: 'USER' }, { parishId: 'p1' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it.each([
    ['celebration', 'celebration', { id: 'c1' }, (p: typeof prisma) => p.celebration.findUnique],
    [
      'template',
      'celebrationTemplate',
      { id: 't1' },
      (p: typeof prisma) => p.celebrationTemplate.findUnique,
    ],
    ['content', 'content', { id: 'k1' }, (p: typeof prisma) => p.content.findUnique],
  ])(
    'retrouve la paroisse via la ressource (%s) et non via un identifiant fourni par le client',
    async (kind, _model, params, finder) => {
      metadata[PARISH_ROLES_KEY] = [ParishRole.PARISH_ADMIN];
      metadata[PARISH_SCOPE_KEY] = { kind };
      finder(prisma).mockResolvedValue({ parishId: 'parish-of-resource' });
      prisma.parishMember.findUnique.mockResolvedValue({ role: ParishRole.PARISH_ADMIN });

      await guard.canActivate(ctx({ id: 'u1', role: 'USER' }, params));

      expect(prisma.parishMember.findUnique).toHaveBeenCalledWith({
        where: { userId_parishId: { userId: 'u1', parishId: 'parish-of-resource' } },
      });
    },
  );

  it('retrouve la paroisse d’une étape de modèle via son modèle', async () => {
    metadata[PARISH_ROLES_KEY] = [ParishRole.PARISH_ADMIN];
    metadata[PARISH_SCOPE_KEY] = { kind: 'templateStep', param: 'stepId' };
    prisma.celebrationTemplateStep.findUnique.mockResolvedValue({ template: { parishId: 'p9' } });
    prisma.parishMember.findUnique.mockResolvedValue({ role: ParishRole.PARISH_ADMIN });

    await guard.canActivate(ctx({ id: 'u1', role: 'USER' }, { stepId: 's1' }));

    expect(prisma.parishMember.findUnique).toHaveBeenCalledWith({
      where: { userId_parishId: { userId: 'u1', parishId: 'p9' } },
    });
  });

  it('répond 404 si la ressource n’existe pas', async () => {
    metadata[PARISH_ROLES_KEY] = [ParishRole.PARISH_ADMIN];
    metadata[PARISH_SCOPE_KEY] = { kind: 'celebration' };
    prisma.celebration.findUnique.mockResolvedValue(null);
    await expect(
      guard.canActivate(ctx({ id: 'u1', role: 'USER' }, { id: 'nope' })),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
