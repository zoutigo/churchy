import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { env } from './config/env';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

/** Configuration HTTP partagée entre main.ts et les tests fonctionnels. */
export function configureApp(app: INestApplication) {
  // Les textes riches embarquent des images en base64 : limite au-delà des 100 ko par défaut.
  (app as NestExpressApplication).useBodyParser('json', { limit: '2mb' });
  app.setGlobalPrefix('api');
  // Derrière nginx, l'IP du client (limitation de débit) vient de X-Forwarded-For. 0 = ne fait confiance à rien.
  app.getHttpAdapter().getInstance().set('trust proxy', env.TRUST_PROXY_HOPS);
  app.use(
    helmet({
      // L'API ne sert que du JSON (et l'UI Swagger, qui a besoin de scripts inline).
      contentSecurityPolicy: false,
      // Le site web (autre origine) lit les réponses de l'API via CORS.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(cookieParser());
  // Les cookies de session exigent une origine explicite : jamais '*' avec credentials.
  app.enableCors({ origin: env.FRONTEND_URL, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
}
