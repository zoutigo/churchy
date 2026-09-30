import { createHash, randomBytes } from 'node:crypto';

/** Jeton opaque aléatoire, à transmettre tel quel à l'utilisateur. */
export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Seul le hash est stocké en base : une fuite de la base ne donne pas de jeton utilisable. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
