'use client';
import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';
import {
  maskNationalPhone,
  nationalPhoneOf,
  phoneFormatOf,
  phonePlaceholder,
  toStoredPhone,
} from '@churchy/shared';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';

/**
 * Téléphone de la paroisse, au format de son pays : l'indicatif est affiché devant le champ, la saisie est
 * masquée (« 6 77 12 34 56 ») et le placeholder donne un exemple. La valeur du formulaire est le numéro
 * international (« +237 6 77 12 34 56 »), directement utilisable dans un lien `tel:`.
 */
export function PhoneField({ optionalHint = false }: { optionalHint?: boolean }) {
  const t = useTranslations('phoneField');
  const tc = useTranslations('common');
  const { watch } = useFormContext<{ country?: string; phone?: string | null }>();
  const country = watch('country') ?? '';
  const format = phoneFormatOf(country);

  return (
    <FormField
      name="phone"
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {t('label')}{' '}
            {optionalHint && (
              <span className="text-muted-foreground text-xs">{tc('optional')}</span>
            )}
          </FormLabel>
          <div className="flex">
            {format && (
              <span
                data-testid="phone-dial"
                className="inline-flex items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm text-muted-foreground"
              >
                {format.dial}
              </span>
            )}
            <FormControl>
              <Input
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                className={format ? 'rounded-l-none' : undefined}
                placeholder={phonePlaceholder(country)}
                name={field.name}
                ref={field.ref}
                onBlur={field.onBlur}
                value={format ? nationalPhoneOf(country, field.value) : (field.value ?? '')}
                onChange={(e) => {
                  const masked = maskNationalPhone(country, e.target.value);
                  field.onChange(format ? toStoredPhone(country, masked) : masked);
                }}
              />
            </FormControl>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
