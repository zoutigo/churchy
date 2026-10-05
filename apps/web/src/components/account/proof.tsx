'use client';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { ERR, type AuthMethods } from '@churchy/shared';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { PasswordInput } from '@/components/ui/password-input';
import { PinInput } from '@/components/ui/pin-input';

/** Preuve demandée avant une modification sensible : le mot de passe actuel, sinon le PIN actuel, sinon rien. */
export type ProofKind = 'password' | 'pin' | null;

export const proofKindOf = (methods: AuthMethods): ProofKind =>
  methods.password ? 'password' : methods.pin ? 'pin' : null;

/** Champs Zod de la preuve, à fusionner dans le schéma du formulaire. */
export function proofShape(kind: ProofKind): z.ZodRawShape {
  if (kind === 'password') return { currentPassword: z.string().min(1, ERR.passwordRequired) };
  if (kind === 'pin') return { currentPin: z.string().min(1, ERR.pinRequired) };
  return {};
}

export const emptyProof = (kind: ProofKind): Record<string, string> =>
  kind === 'password' ? { currentPassword: '' } : kind === 'pin' ? { currentPin: '' } : {};

/** Champ de preuve (à placer dans un `<Form>`). */
export function ProofField({ kind }: { kind: ProofKind }) {
  const t = useTranslations('security.proof');
  if (!kind) return null;
  return kind === 'password' ? (
    <FormField
      name="currentPassword"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('password')}</FormLabel>
          <FormControl>
            <PasswordInput autoComplete="current-password" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  ) : (
    <FormField
      name="currentPin"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('pin')}</FormLabel>
          <FormControl>
            <PinInput
              name={field.name}
              ref={field.ref}
              onBlur={field.onBlur}
              value={field.value}
              onChange={field.onChange}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
