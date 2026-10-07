import { z } from 'zod';

/**
 * Erreur survenue dans le navigateur d'un visiteur (page d'erreur affichée). Aucune donnée personnelle :
 * message, pile, adresse de la page (sans paramètres) et navigateur. Tailles bornées (route publique).
 */
export const clientErrorSchema = z.object({
  message: z.string().max(500),
  stack: z.string().max(4000).optional(),
  digest: z.string().max(100).optional(),
  /** Page où l'erreur s'est produite (chemin seulement). */
  path: z.string().max(300).optional(),
  /** Quelle page d'erreur l'a interceptée : `global` (layout racine) ou `segment`. */
  source: z.enum(['global', 'segment']),
  userAgent: z.string().max(300).optional(),
});
export type ClientErrorDto = z.infer<typeof clientErrorSchema>;
