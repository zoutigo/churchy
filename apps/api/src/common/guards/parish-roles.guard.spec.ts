import { ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ParishDuty, ParishStatus } from '@churchy/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { PARISH_PERMISSION_KEY, PARISH_SCOPE_KEY } from '../decorators/roles.decorator';
import { ParishRolesGuard } from './parish-roles.guard';

type Fn = jest.Mock;

const admin = { status: ParishStatus.PARISH_ADMIN, duties: [] };
const preparer = { status: ParishStatus.PARISHIONER, duties: [ParishDuty.PREPARER] };
const reader = { status: ParishStatus.PARISHIONER, duties: [ParishDuty.READER] };
const parishioner = { status: ParishStatus.PARISHIONER, duties: [] };
const faithful = { status: ParishStatus.FAITHFUL, duties: [] };

describe('ParishRolesGuard', () => {
  let prisma: {
    parishMember: { findUnique: Fn };
    celebration: { findUnique: Fn };
    celebrationOccurrence: { findUnique: Fn };
    preparationSheet: { findUnique: Fn };
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
      celebrationOccurrence: { findUnique: jest.fn() },
      preparationSheet: { findUnique: jest.fn() },
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
    metadata[PARISH_PERMISSION_KEY] = 'parish.manage';
    await expect(
      guard.canActivate(ctx({ id: 'u1', role: 'SUPER_ADMIN' }, { parishId: 'p1' })),
    ).resolves.toBe(true);
    expect(prisma.parishMember.findUnique).not.toHaveBeenCalled();
  });

  it('autorise un membre avec le bon rôle (paroisse dans l’URL)', async () => {
    metadata[PARISH_PERMISSION_KEY] = 'parish.celebrations.write';
    prisma.parishMember.findUnique.mockResolvedValue(preparer);
    await expect(
      guard.canActivate(ctx({ id: 'u1', role: 'USER' }, { parishId: 'p1' })),
    ).resolves.toBe(true);
    expect(prisma.parishMember.findUnique).toHaveBeenCalledWith({
      where: { userId_parishId: { userId: 'u1', parishId: 'p1' } },
    });
  });

  it('refuse un non-membre', async () => {
    metadata[PARISH_PERMISSION_KEY] = 'parish.manage';
    prisma.parishMember.findUnique.mockResolvedValue(null);
    await expect(
      guard.canActivate(ctx({ id: 'u1', role: 'USER' }, { parishId: 'p1' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuse un membre dont les permissions sont insuffisantes (un fidèle n’écrit pas)', async () => {
    metadata[PARISH_PERMISSION_KEY] = 'parish.celebrations.write';
    prisma.parishMember.findUnique.mockResolvedValue(faithful);
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
    [
      'occurrence',
      'celebrationOccurrence',
      { id: 'o1' },
      (p: typeof prisma) => p.celebrationOccurrence.findUnique,
    ],
  ])(
    'retrouve la paroisse via la ressource (%s) et non via un identifiant fourni par le client',
    async (kind, _model, params, finder) => {
      metadata[PARISH_PERMISSION_KEY] = 'parish.manage';
      metadata[PARISH_SCOPE_KEY] = { kind };
      finder(prisma).mockResolvedValue({ parishId: 'parish-of-resource' });
      prisma.parishMember.findUnique.mockResolvedValue(admin);

      await guard.canActivate(ctx({ id: 'u1', role: 'USER' }, params));

      expect(prisma.parishMember.findUnique).toHaveBeenCalledWith({
        where: { userId_parishId: { userId: 'u1', parishId: 'parish-of-resource' } },
      });
    },
  );

  it('retrouve la paroisse d’une étape de modèle via son modèle', async () => {
    metadata[PARISH_PERMISSION_KEY] = 'parish.manage';
    metadata[PARISH_SCOPE_KEY] = { kind: 'templateStep', param: 'stepId' };
    prisma.celebrationTemplateStep.findUnique.mockResolvedValue({ template: { parishId: 'p9' } });
    prisma.parishMember.findUnique.mockResolvedValue(admin);

    await guard.canActivate(ctx({ id: 'u1', role: 'USER' }, { stepId: 's1' }));

    expect(prisma.parishMember.findUnique).toHaveBeenCalledWith({
      where: { userId_parishId: { userId: 'u1', parishId: 'p9' } },
    });
  });

  it('retrouve la paroisse d’une feuille via sa date', async () => {
    metadata[PARISH_PERMISSION_KEY] = 'parish.manage';
    metadata[PARISH_SCOPE_KEY] = { kind: 'sheet' };
    prisma.preparationSheet.findUnique.mockResolvedValue({ occurrence: { parishId: 'p7' } });
    prisma.parishMember.findUnique.mockResolvedValue(admin);

    await guard.canActivate(ctx({ id: 'u1', role: 'USER' }, { id: 'sh1' }));

    expect(prisma.parishMember.findUnique).toHaveBeenCalledWith({
      where: { userId_parishId: { userId: 'u1', parishId: 'p7' } },
    });
  });

  it('répond 404 si la date ou la feuille n’existe pas', async () => {
    metadata[PARISH_PERMISSION_KEY] = 'parish.manage';
    prisma.celebrationOccurrence.findUnique.mockResolvedValue(null);
    prisma.preparationSheet.findUnique.mockResolvedValue(null);
    for (const kind of ['occurrence', 'sheet']) {
      metadata[PARISH_SCOPE_KEY] = { kind };
      await expect(
        guard.canActivate(ctx({ id: 'u1', role: 'USER' }, { id: 'nope' })),
      ).rejects.toBeInstanceOf(NotFoundException);
    }
  });

  it.each([
    ['parish.view', faithful, true],
    ['parish.view.members', faithful, false],
    ['parish.view.members', parishioner, true],
    ['parish.internal.read', parishioner, false],
    ['parish.internal.read', reader, true],
    ['parish.celebrations.write', reader, false],
    ['parish.celebrations.write', preparer, true],
    ['parish.announcements.write', preparer, false],
    ['parish.manage', preparer, false],
    ['parish.manage', admin, true],
    // Un fidèle ne reçoit jamais de responsabilité, même si une ligne en base en portait une.
    [
      'parish.celebrations.write',
      { status: ParishStatus.FAITHFUL, duties: [ParishDuty.PREPARER] },
      false,
    ],
  ])('permission %s pour %j : %s', async (perm, member, allowed) => {
    metadata[PARISH_PERMISSION_KEY] = perm;
    prisma.parishMember.findUnique.mockResolvedValue(member);
    const result = guard.canActivate(ctx({ id: 'u1', role: 'USER' }, { parishId: 'p1' }));
    if (allowed) await expect(result).resolves.toBe(true);
    else await expect(result).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('expose le statut et les responsabilités du membre à la requête (pour masquer la note interne)', async () => {
    metadata[PARISH_PERMISSION_KEY] = 'parish.view';
    prisma.parishMember.findUnique.mockResolvedValue(faithful);
    const request: { user: unknown; params: unknown; parishRole?: unknown } = {
      user: { id: 'u1', role: 'USER' },
      params: { parishId: 'p1' },
    };
    const context = {
      getHandler: () => 'handler',
      getClass: () => 'class',
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    await guard.canActivate(context);
    expect(request.parishRole).toEqual(faithful);

    const root = { user: { id: 'u2', role: 'SUPER_ADMIN' }, params: {}, parishRole: undefined };
    await guard.canActivate({
      getHandler: () => 'handler',
      getClass: () => 'class',
      switchToHttp: () => ({ getRequest: () => root }),
    } as unknown as ExecutionContext);
    expect(root.parishRole).toBe('SUPER_ADMIN');
  });

  it('répond 404 si la ressource n’existe pas', async () => {
    metadata[PARISH_PERMISSION_KEY] = 'parish.manage';
    metadata[PARISH_SCOPE_KEY] = { kind: 'celebration' };
    prisma.celebration.findUnique.mockResolvedValue(null);
    await expect(
      guard.canActivate(ctx({ id: 'u1', role: 'USER' }, { id: 'nope' })),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  describe('ADMIN et MODERATOR de plateforme (lecture seule)', () => {
    const request = (user: unknown, method: string) => {
      const req = { user, params: { parishId: 'p1' }, method, parishRole: undefined as unknown };
      const context = {
        getHandler: () => 'handler',
        getClass: () => 'class',
        switchToHttp: () => ({ getRequest: () => req }),
      } as unknown as ExecutionContext;
      return { req, context };
    };

    beforeEach(() => {
      metadata[PARISH_PERMISSION_KEY] = 'parish.celebrations.write';
      prisma.parishMember.findUnique.mockResolvedValue(null);
    });

    it.each(['ADMIN', 'MODERATOR'])(
      "%s lit une paroisse dont il n'est pas membre",
      async (role) => {
        const { req, context } = request({ id: 'u1', role }, 'GET');
        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(req.parishRole).toBe('PLATFORM_STAFF');
      },
    );

    it.each(['POST', 'PATCH', 'PUT', 'DELETE'])(
      "%s : refusé, jamais d'écriture",
      async (method) => {
        const { context } = request({ id: 'u1', role: 'ADMIN' }, method);
        await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
      },
    );

    it('un compte ordinaire non membre reste refusé en lecture', async () => {
      const { context } = request({ id: 'u1', role: 'USER' }, 'GET');
      await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("un ADMIN de plateforme qui est aussi admin de la paroisse garde l'écriture", async () => {
      prisma.parishMember.findUnique.mockResolvedValue(admin);
      const { req, context } = request({ id: 'u1', role: 'ADMIN' }, 'PATCH');
      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(req.parishRole).toEqual(admin);
    });
  });
});
