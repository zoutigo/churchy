import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CelebrationTemplatesService } from './celebration-templates.service';

describe('CelebrationTemplatesService.removeStep', () => {
  let prisma: {
    celebrationStep: { count: jest.Mock };
    celebrationTemplateStep: { delete: jest.Mock };
  };
  let service: CelebrationTemplatesService;

  beforeEach(() => {
    prisma = {
      celebrationStep: { count: jest.fn() },
      celebrationTemplateStep: { delete: jest.fn().mockResolvedValue({}) },
    };
    service = new CelebrationTemplatesService(prisma as unknown as PrismaService);
  });

  it('refuse (409) de supprimer une étape utilisée par des célébrations', async () => {
    prisma.celebrationStep.count.mockResolvedValue(2);
    await expect(service.removeStep('s1')).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.celebrationTemplateStep.delete).not.toHaveBeenCalled();
  });

  it('supprime une étape inutilisée', async () => {
    prisma.celebrationStep.count.mockResolvedValue(0);
    await service.removeStep('s1');
    expect(prisma.celebrationTemplateStep.delete).toHaveBeenCalledWith({ where: { id: 's1' } });
  });
});

describe('CelebrationTemplatesService.update / remove', () => {
  const template = {
    id: 't1',
    steps: [
      { id: 'a', key: 'entree', title: 'Entrée', order: 1 },
      { id: 'b', key: 'psaume', title: 'Psaume', order: 2 },
    ],
  };
  let tx: {
    celebrationTemplate: { update: jest.Mock };
    celebrationTemplateStep: { deleteMany: jest.Mock; update: jest.Mock; create: jest.Mock };
    $executeRaw: jest.Mock;
  };
  let prisma: {
    celebrationTemplate: { findUnique: jest.Mock; delete: jest.Mock };
    $transaction: jest.Mock;
  };
  let service: CelebrationTemplatesService;

  beforeEach(() => {
    tx = {
      celebrationTemplate: { update: jest.fn() },
      celebrationTemplateStep: {
        deleteMany: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      $executeRaw: jest.fn(),
    };
    prisma = {
      celebrationTemplate: {
        findUnique: jest.fn().mockResolvedValue(template),
        delete: jest.fn(),
      },
      $transaction: jest.fn((fn: (t: typeof tx) => Promise<void>) => fn(tx)),
    };
    service = new CelebrationTemplatesService(prisma as unknown as PrismaService);
  });

  it('renomme sans toucher aux étapes quand `steps` est absent', async () => {
    await service.update('t1', { name: 'Nouveau nom' });
    expect(tx.celebrationTemplate.update).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: { name: 'Nouveau nom' },
    });
    expect(tx.celebrationTemplateStep.deleteMany).not.toHaveBeenCalled();
  });

  it('garde la clé des étapes existantes, crée les nouvelles, retire les absentes, réordonne', async () => {
    await service.update('t1', {
      steps: [{ title: 'Chant final' }, { id: 'a', title: 'Chant d’entrée' }],
    });
    expect(tx.celebrationTemplateStep.deleteMany).toHaveBeenCalledWith({
      where: { templateId: 't1', id: { notIn: ['a'] } },
    });
    // l'étape existante garde son id (donc sa clé) : seuls titre et ordre changent
    expect(tx.celebrationTemplateStep.update).toHaveBeenCalledWith({
      where: { id: 'a' },
      data: { title: 'Chant d’entrée', order: 2 },
    });
    expect(tx.celebrationTemplateStep.create).toHaveBeenCalledWith({
      data: {
        templateId: 't1',
        title: 'Chant final',
        key: 'chant-final',
        order: 1,
        isRequired: true,
      },
    });
  });

  it('refuse une étape qui n’appartient pas au modèle (400)', async () => {
    await expect(
      service.update('t1', { steps: [{ id: 'zzz', title: 'X' }] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('refuse deux fois la même étape (400)', async () => {
    await expect(
      service.update('t1', {
        steps: [
          { id: 'a', title: 'A' },
          { id: 'a', title: 'B' },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('404 sur un modèle inconnu, pour la modification comme la suppression', async () => {
    prisma.celebrationTemplate.findUnique.mockResolvedValue(null);
    await expect(service.update('x', { name: 'A' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove('x')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.celebrationTemplate.delete).not.toHaveBeenCalled();
  });

  it('supprime le modèle', async () => {
    await service.remove('t1');
    expect(prisma.celebrationTemplate.delete).toHaveBeenCalledWith({ where: { id: 't1' } });
  });
});
