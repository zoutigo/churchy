import { Injectable, Logger } from '@nestjs/common';

/** Fournisseur d'envoi de SMS : une implémentation par opérateur (Orange, MTN…), choisie par `SMS_PROVIDER`. */
export interface SmsProvider {
  send(to: string, body: string): Promise<void>;
}

export const SMS_PROVIDER = 'SMS_PROVIDER';

/** Pas d'opérateur pour l'instant : le SMS est seulement journalisé (jamais son texte, il peut contenir un code). */
export class LogSmsProvider implements SmsProvider {
  private readonly logger = new Logger('SmsProvider(log)');

  async send(to: string, body: string): Promise<void> {
    this.logger.log(`SMS non envoyé (aucun fournisseur) à ${to} — ${body.length} caractères`);
  }
}

/** Choisit le fournisseur d'après `SMS_PROVIDER` (« log » par défaut). Un nom inconnu empêche le démarrage. */
export function createSmsProvider(env: NodeJS.ProcessEnv = process.env): SmsProvider {
  const name = (env.SMS_PROVIDER ?? 'log').trim().toLowerCase();
  if (name === 'log') return new LogSmsProvider();
  throw new Error(`SMS_PROVIDER inconnu : « ${name} » (valeurs gérées : log)`);
}

@Injectable()
export class SmsService {
  constructor(private readonly provider: SmsProvider) {}

  send(to: string, body: string): Promise<void> {
    return this.provider.send(to, body);
  }
}
