import { createHmac } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { env } from '../../config/env';

const BCRYPT_ROUNDS = 10;
/** Préfixe des hachés poivrés ; un haché sans préfixe est un bcrypt « nu » d'avant le poivre. */
const PEPPERED_PREFIX = 'p1$';

/** HMAC-SHA256 du PIN avec le poivre (base64, 44 car. : bien sous la limite de 72 octets de bcrypt). */
const pepperPin = (pin: string, pepper: string) =>
  createHmac('sha256', pepper).update(pin).digest('base64');

/** Haché d'un PIN : poivré si `PIN_PEPPER` est défini (toujours en production), bcrypt nu sinon (dev/test). */
export async function hashPin(
  pin: string,
  pepper: string | null = env.PIN_PEPPER ?? null,
): Promise<string> {
  if (!pepper) return bcrypt.hash(pin, BCRYPT_ROUNDS);
  return PEPPERED_PREFIX + (await bcrypt.hash(pepperPin(pin, pepper), BCRYPT_ROUNDS));
}

/** Un haché poivré sans poivre configuré ne peut jamais correspondre (jamais de repli sur le PIN nu). */
export async function verifyPin(
  pin: string,
  hash: string,
  pepper: string | null = env.PIN_PEPPER ?? null,
): Promise<boolean> {
  if (hash.startsWith(PEPPERED_PREFIX)) {
    if (!pepper) return false;
    return bcrypt.compare(pepperPin(pin, pepper), hash.slice(PEPPERED_PREFIX.length));
  }
  return bcrypt.compare(pin, hash);
}

/** Vrai pour un haché d'avant le poivre, à refaire dès que le PIN est connu (connexion réussie). */
export const pinHashNeedsUpgrade = (
  hash: string,
  pepper: string | null = env.PIN_PEPPER ?? null,
): boolean => Boolean(pepper) && !hash.startsWith(PEPPERED_PREFIX);
