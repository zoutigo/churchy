import { Injectable, NotFoundException } from '@nestjs/common';
import slugify from 'slugify';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateParishDto, UpdateParishDto } from '@churchy/shared';

@Injectable()
export class ParishesService {
  constructor(private prisma: PrismaService) {}

  /** Slug unique : deux paroisses de même nom (dans des villes différentes) ne doivent pas entrer en collision. */
  private async uniqueSlug(name: string): Promise<string> {
    const base = slugify(name, { lower: true, strict: true }) || 'paroisse';
    const taken = await this.prisma.parish.findUnique({ where: { slug: base } });
    return taken ? `${base}-${randomBytes(3).toString('hex')}` : base;
  }

  async create(dto: CreateParishDto, userId: string) {
    const slug = await this.uniqueSlug(dto.name);
    const parish = await this.prisma.parish.create({
      data: { ...dto, slug },
    });
    await this.prisma.parishMember.create({
      data: { userId, parishId: parish.id, role: 'PARISH_ADMIN' },
    });
    return parish;
  }

  async update(id: string, dto: UpdateParishDto) {
    await this.findById(id);
    return this.prisma.parish.update({ where: { id }, data: dto });
  }

  async findById(id: string) {
    const parish = await this.prisma.parish.findUnique({ where: { id } });
    if (!parish) throw new NotFoundException('Paroisse introuvable');
    return parish;
  }

  async findByUser(userId: string) {
    const memberships = await this.prisma.parishMember.findMany({
      where: { userId },
      include: { parish: true },
    });
    return memberships.map((m) => ({ ...m.parish, role: m.role }));
  }
}
