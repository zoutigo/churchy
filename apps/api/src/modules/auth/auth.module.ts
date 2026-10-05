import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { env } from '../../config/env';
import { NotificationsModule } from '../notifications/notifications.module';
import { AccountService } from './account.service';
import { AdminAuthController } from './admin-auth.controller';
import { AuthSecurityService } from './auth-security.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleAuthService } from './google-auth.service';
import { GoogleIdTokenVerifier, GoogleTokenVerifier } from './google-token.verifier';
import { PhoneAuthService } from './phone-auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    NotificationsModule,
    JwtModule.register({
      secret: env.JWT_SECRET,
      signOptions: { expiresIn: env.ACCESS_TOKEN_TTL_SECONDS },
    }),
  ],
  controllers: [AuthController, AdminAuthController],
  providers: [
    AuthService,
    AuthSecurityService,
    PhoneAuthService,
    GoogleAuthService,
    AccountService,
    { provide: GoogleTokenVerifier, useClass: GoogleIdTokenVerifier },
    JwtStrategy,
  ],
})
export class AuthModule {}
