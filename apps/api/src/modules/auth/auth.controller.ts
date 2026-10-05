import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import {
  addEmailSchema,
  changePinSchema,
  forgotPasswordSchema,
  forgotPinSchema,
  googleAuthSchema,
  googleLinkSchema,
  linkGoogleSchema,
  loginPhoneSchema,
  loginSchema,
  registerPhoneSchema,
  registerSchema,
  resetPasswordSchema,
  resetPinSchema,
  setPasswordSchema,
  setPhonePinSchema,
  unlinkGoogleSchema,
  updateLocaleSchema,
  verifyEmailSchema,
  type AddEmailDto,
  type AuthProvidersDto,
  type AuthResponse,
  type AuthUserDto,
  type ChangePinDto,
  type ForgotPasswordDto,
  type ForgotPinDto,
  type GoogleAuthDto,
  type GoogleAuthResponse,
  type GoogleLinkDto,
  type LinkGoogleDto,
  type LoginDto,
  type LoginPhoneDto,
  type RegisterDto,
  type RegisterPhoneDto,
  type ResetPasswordDto,
  type ResetPinDto,
  type SetPasswordDto,
  type SetPhonePinDto,
  type UnlinkGoogleDto,
  type UpdateLocaleDto,
  type VerifyEmailDto,
} from '@churchy/shared';
import { env } from '../../config/env';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { clearAuthCookies, COOKIES, setAuthCookies } from './auth-cookies';
import { AccountService } from './account.service';
import type { RequestContext } from './auth-security.service';
import { AuthService, toAuthUserDto, type AuthResult } from './auth.service';
import { GoogleAuthService } from './google-auth.service';
import { PhoneAuthService } from './phone-auth.service';

/** Origine de la requête, pour le journal d'audit. */
const contextOf = (req: Request): RequestContext => ({
  ip: req.ip,
  userAgent: req.headers['user-agent'],
});

/** Limite stricte (par minute et par IP) sur les routes qu'on peut attaquer par force brute. */
const STRICT = { default: { limit: env.AUTH_THROTTLE_LIMIT, ttl: 60_000 } };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private phoneAuth: PhoneAuthService,
    private googleAuth: GoogleAuthService,
    private account: AccountService,
  ) {}

  @Post('register')
  @Throttle(STRICT)
  async register(
    @Body(new ZodValidationPipe(registerSchema)) dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    return this.respondWithSession(res, await this.authService.register(dto, contextOf(req)));
  }

  @Post('login')
  @Throttle(STRICT)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    return this.respondWithSession(res, await this.authService.login(dto, contextOf(req)));
  }

  // --- téléphone + PIN ---------------------------------------------------------------------

  @Post('register/phone')
  @Throttle(STRICT)
  async registerPhone(
    @Body(new ZodValidationPipe(registerPhoneSchema)) dto: RegisterPhoneDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    return this.respondWithSession(res, await this.phoneAuth.register(dto, contextOf(req)));
  }

  @Post('login/phone')
  @Throttle(STRICT)
  async loginPhone(
    @Body(new ZodValidationPipe(loginPhoneSchema)) dto: LoginPhoneDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    return this.respondWithSession(res, await this.phoneAuth.login(dto, contextOf(req)));
  }

  @Post('forgot-pin')
  @HttpCode(200)
  @Throttle(STRICT)
  async forgotPin(
    @Body(new ZodValidationPipe(forgotPinSchema)) dto: ForgotPinDto,
    @Req() req: Request,
  ) {
    await this.phoneAuth.requestPinReset(dto.phone, contextOf(req));
    // Même réponse que le numéro existe ou non, qu'il y ait un email ou non.
    return { ok: true };
  }

  @Post('reset-pin')
  @HttpCode(200)
  @Throttle(STRICT)
  async resetPin(
    @Body(new ZodValidationPipe(resetPinSchema)) dto: ResetPinDto,
    @Req() req: Request,
  ) {
    await this.phoneAuth.resetPin(dto.token, dto.pin, contextOf(req));
    return { ok: true };
  }

  // --- Google ------------------------------------------------------------------------------

  /** Fournisseurs activés : le web n'affiche le bouton Google que si l'API est configurée pour. */
  @Get('providers')
  providers(): AuthProvidersDto {
    return this.googleAuth.providers();
  }

  @Post('google')
  @HttpCode(200)
  @Throttle(STRICT)
  async google(
    @Body(new ZodValidationPipe(googleAuthSchema)) dto: GoogleAuthDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<GoogleAuthResponse> {
    const outcome = await this.googleAuth.login(dto, contextOf(req));
    if (outcome.status === 'link_required') return outcome;
    return { status: 'ok', ...this.respondWithSession(res, outcome.result) };
  }

  /** Confirme la liaison de Google à un compte email existant avec son mot de passe. */
  @Post('google/link')
  @HttpCode(200)
  @Throttle(STRICT)
  async googleLink(
    @Body(new ZodValidationPipe(googleLinkSchema)) dto: GoogleLinkDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    return this.respondWithSession(
      res,
      await this.googleAuth.linkWithPassword(dto, contextOf(req)),
    );
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

  /** Change la langue préférée du compte (interface et emails). */
  @Patch('me/locale')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  updateLocale(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(updateLocaleSchema)) dto: UpdateLocaleDto,
  ): Promise<AuthUserDto> {
    return this.authService.updateLocale(user.id, dto.locale);
  }

  // --- sécurité du compte (session ouverte) ------------------------------------------------

  @Put('me/email')
  @Throttle(STRICT)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  addEmail(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(addEmailSchema)) dto: AddEmailDto,
    @Req() req: Request,
  ): Promise<AuthUserDto> {
    return this.account.addEmail(user, dto, contextOf(req));
  }

  @Put('me/password')
  @Throttle(STRICT)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async setPassword(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(setPasswordSchema)) dto: SetPasswordDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    return this.respondWithSession(res, await this.account.setPassword(user, dto, contextOf(req)));
  }

  @Put('me/phone-pin')
  @Throttle(STRICT)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async setPhonePin(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(setPhonePinSchema)) dto: SetPhonePinDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    return this.respondWithSession(res, await this.account.setPhonePin(user, dto, contextOf(req)));
  }

  @Patch('me/pin')
  @Throttle(STRICT)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async changePin(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(changePinSchema)) dto: ChangePinDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    return this.respondWithSession(res, await this.account.changePin(user, dto, contextOf(req)));
  }

  @Put('me/google')
  @Throttle(STRICT)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  linkGoogle(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(linkGoogleSchema)) dto: LinkGoogleDto,
    @Req() req: Request,
  ): Promise<AuthUserDto> {
    return this.account.linkGoogle(user, dto, contextOf(req));
  }

  /** `POST` plutôt que `DELETE` : la preuve (mot de passe ou PIN) voyage dans le corps. */
  @Post('me/google/unlink')
  @HttpCode(200)
  @Throttle(STRICT)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  unlinkGoogle(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(unlinkGoogleSchema)) dto: UnlinkGoogleDto,
    @Req() req: Request,
  ): Promise<AuthUserDto> {
    return this.account.unlinkGoogle(user, dto, contextOf(req));
  }

  private respondWithSession(res: Response, { user, session }: AuthResult): AuthResponse {
    setAuthCookies(res, session);
    return { user };
  }
}
