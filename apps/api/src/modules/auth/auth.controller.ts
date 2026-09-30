import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  type AuthResponse,
  type AuthUserDto,
  type ForgotPasswordDto,
  type LoginDto,
  type RegisterDto,
  type ResetPasswordDto,
  type VerifyEmailDto,
} from '@churchy/shared';
import { env } from '../../config/env';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { clearAuthCookies, COOKIES, setAuthCookies } from './auth-cookies';
import { AuthService, toAuthUserDto, type AuthResult } from './auth.service';

/** Limite stricte (par minute et par IP) sur les routes qu'on peut attaquer par force brute. */
const STRICT = { default: { limit: env.AUTH_THROTTLE_LIMIT, ttl: 60_000 } };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @Throttle(STRICT)
  async register(
    @Body(new ZodValidationPipe(registerSchema)) dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    return this.respondWithSession(res, await this.authService.register(dto));
  }

  @Post('login')
  @Throttle(STRICT)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    return this.respondWithSession(res, await this.authService.login(dto));
  }

  /** Renouvelle la session à partir du cookie de refresh (rotation du jeton). */
  @Post('refresh')
  @HttpCode(200)
  @Throttle(STRICT)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    try {
      return this.respondWithSession(
        res,
        await this.authService.refresh(req.cookies?.[COOKIES.REFRESH]),
      );
    } catch (err) {
      clearAuthCookies(res);
      throw err;
    }
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.cookies?.[COOKIES.REFRESH]);
    clearAuthCookies(res);
    return { ok: true };
  }

  @Post('forgot-password')
  @HttpCode(200)
  @Throttle(STRICT)
  async forgotPassword(@Body(new ZodValidationPipe(forgotPasswordSchema)) dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    // Même réponse que l'email existe ou non.
    return {
      message: 'Si un compte existe pour cet email, un lien de réinitialisation a été envoyé.',
    };
  }

  @Post('reset-password')
  @HttpCode(200)
  @Throttle(STRICT)
  async resetPassword(@Body(new ZodValidationPipe(resetPasswordSchema)) dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.password);
    return { ok: true };
  }

  @Post('verify-email')
  @HttpCode(200)
  @Throttle(STRICT)
  async verifyEmail(@Body(new ZodValidationPipe(verifyEmailSchema)) dto: VerifyEmailDto) {
    await this.authService.verifyEmail(dto.token);
    return { ok: true };
  }

  @Post('resend-verification')
  @HttpCode(200)
  @Throttle(STRICT)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async resendVerification(@CurrentUser() user: AuthUser) {
    await this.authService.resendEmailVerification(user);
    return { ok: true };
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser): AuthUserDto {
    return toAuthUserDto(user);
  }

  private respondWithSession(res: Response, { user, session }: AuthResult): AuthResponse {
    setAuthCookies(res, session);
    return { user };
  }
}
