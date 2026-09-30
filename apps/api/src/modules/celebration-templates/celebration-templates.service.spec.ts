import { ConflictException } from '@nestjs/common';
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
