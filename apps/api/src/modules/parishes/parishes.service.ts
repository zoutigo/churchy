import { Injectable, NotFoundException } from '@nestjs/common';
import slugify from 'slugify';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateParishDto } from '@churchy/shared';

@Injectable()
export class ParishesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateParishDto, userId: string) {
    const slug = slugify(dto.name, { lower: true, strict: true });
    const parish = await this.prisma.parish.create({
      data: { ...dto, slug },
    });
    await this.prisma.parishMember.create({
      data: { userId, parishId: parish.id, role: 'PARISH_ADMIN' },
    });
    return parish;
  }

  async findById(id: string) {
    const parish = await this.prisma.parish.findUnique({ where: { id } });
    if (!parish) throw new NotFoundException('Paroisse introuvable');
    return parish;
  }

  async findBySlug(slug: string) {
    const parish = await this.prisma.parish.findUnique({ where: { slug } });
    if (!parish) throw new NotFoundException('Paroisse introuvable');
    return parish;
  }

  async findAll(query?: string) {
    return this.prisma.parish.findMany({
      where: query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { city: { contains: query, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { name: 'asc' },
    });
  }

  async findByUser(userId: string) {
    const memberships = await this.prisma.parishMember.findMany({
      where: { userId },
      include: { parish: true },
    });
    return memberships.map((m) => ({ ...m.parish, role: m.role }));
  }
}
