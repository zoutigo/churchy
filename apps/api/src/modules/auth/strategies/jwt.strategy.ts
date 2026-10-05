import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { env } from '../../../config/env';
import { PrismaService } from '../../../prisma/prisma.service';
import { COOKIES } from '../auth-cookies';
import { USER_AUTH_INCLUDE } from '../auth-user';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      // Cookie httpOnly (navigateur) en priorité ; en-tête Bearer pour les clients non navigateur.
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.[COOKIES.ACCESS] ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: env.JWT_SECRET,
    });
  }

  async validate(payload: { sub: string; email?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: USER_AUTH_INCLUDE,
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
