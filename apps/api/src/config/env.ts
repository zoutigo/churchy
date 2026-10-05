import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    /** Secret de signature des jetons d'accès : obligatoire, aucune valeur de secours. */
    JWT_SECRET: z.string({ required_error: 'JWT_SECRET est obligatoire' }).min(16),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
    /** Origine du site web : CORS (avec cookies) et liens envoyés par email. */
    FRONTEND_URL: z.string().url().default('http://localhost:3200'),
    /** Nombre de requêtes par minute et par IP, sur les routes d'authentification sensibles. */
    AUTH_THROTTLE_LIMIT: z.coerce.number().int().positive().default(10),
    /** Nombre de requêtes par minute et par IP, sur le reste de l'API. */
    THROTTLE_LIMIT: z.coerce.number().int().positive().default(120),
    /**
     * Nombre de reverse proxies devant l'API (0 = aucun, connexion directe). Si > 0, l'IP du client
     * est lue dans X-Forwarded-For : sans cela, la limitation par IP voit l'IP du proxy pour tout le monde.
     */
    /** ID client OAuth Google (public). Absent : la connexion Google est désactivée (et son bouton masqué). */
    GOOGLE_CLIENT_ID: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? v : undefined)),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && /change-me|fallback|secret$/i.test(env.JWT_SECRET)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message: 'JWT_SECRET ressemble à une valeur d’exemple : générez un secret aléatoire',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Configuration invalide :\n${details}`);
  }
  return parsed.data;
}

// Évalué à l'import : l'application refuse de démarrer si la configuration est invalide.
export const env = loadEnv();
