import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { adminPinResetSchema, type AdminPinResetDto, type PinResetLinkDto } from '@churchy/shared';
import { env } from '../../config/env';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PlatformPermissionGuard } from '../../common/guards/platform-permission.guard';
import { RequirePlatformPermission } from '../../common/decorators/platform-permission.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { PhoneAuthService } from './phone-auth.service';

/** Outils des administrateurs de la plateforme (rôle du compte, pas rôle de paroisse). */
@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/auth')
@UseGuards(JwtAuthGuard, PlatformPermissionGuard)
@RequirePlatformPermission('platform.pin-reset')
export class AdminAuthController {
  constructor(private phoneAuth: PhoneAuthService) {}

  /**
   * Remet un lien de réinitialisation de PIN pour un compte qui ne peut pas le faire seul (pas d'email, pas de
   * SMS). L'administrateur le transmet à la personne après avoir vérifié son identité par ses propres moyens.
   */
  @Post('pin-reset-link')
  @HttpCode(200)
  @Throttle({ default: { limit: env.AUTH_THROTTLE_LIMIT, ttl: 60_000 } })
  pinResetLink(
    @CurrentUser() admin: AuthUser,
    @Body(new ZodValidationPipe(adminPinResetSchema)) dto: AdminPinResetDto,
    @Req() req: Request,
  ): Promise<PinResetLinkDto> {
    return this.phoneAuth.issuePinResetLink(admin.id, dto.phone, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
