import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { ERR } from '@churchy/shared';
import { env } from '../../config/env';

/** Ce que Google certifie sur la personne, une fois le jeton vérifié. */
export interface GoogleProfile {
  /** Identifiant stable du compte Google (`sub`) : la seule clé fiable (l'email peut changer). */
  sub: string;
  email: string;
  emailVerified: boolean;
  firstName?: string;
  lastName?: string;
}

/**
 * Vérifie un jeton d'identité Google. Classe abstraite = jeton d'injection : les tests la remplacent, le
 * reste de l'application ne connaît pas `google-auth-library`.
 */
export abstract class GoogleTokenVerifier {
  /** Faux si `GOOGLE_CLIENT_ID` n'est pas configuré. */
  abstract isConfigured(): boolean;
  abstract verify(idToken: string): Promise<GoogleProfile>;
}

@Injectable()
export class GoogleIdTokenVerifier extends GoogleTokenVerifier {
  private client?: OAuth2Client;

  isConfigured(): boolean {
    return Boolean(env.GOOGLE_CLIENT_ID);
  }

  async verify(idToken: string): Promise<GoogleProfile> {
    const audience = env.GOOGLE_CLIENT_ID;
    if (!audience) throw new ServiceUnavailableException(ERR.googleNotConfigured);
    this.client ??= new OAuth2Client(audience);

    try {
      // Vérifie la signature (clés publiques de Google), l'expiration, l'émetteur et l'audience.
      const ticket = await this.client.verifyIdToken({ idToken, audience });
      const payload = ticket.getPayload();
      if (!payload?.sub || !payload.email) throw new Error('Jeton sans identité');
      return {
        sub: payload.sub,
        email: payload.email.toLowerCase(),
        emailVerified: payload.email_verified === true,
        firstName: payload.given_name,
        lastName: payload.family_name,
      };
    } catch {
      throw new UnauthorizedException(ERR.googleTokenInvalid);
    }
  }
}
