'use client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import {
  PHONE_FORMATS,
  countryLabel,
  maskNationalPhone,
  nationalPhoneOf,
  phonePlaceholder,
  toStoredPhone,
} from '@churchy/shared';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { useAppLocale } from '@/i18n/locale';

const COUNTRIES = Object.keys(PHONE_FORMATS);
export const DEFAULT_PHONE_COUNTRY = 'Cameroun';

interface Props {
  /** Nom du champ dans le formulaire (valeur : numéro international, « +237 6 77 12 34 56 »). */
  name?: string;
  label?: string;
}

/**
 * Numéro de téléphone d'un compte : pays (indicatif) puis numéro masqué selon le format du pays. La valeur du
 * formulaire est toujours le numéro international complet : l'API le range en E.164.
 */
export function PhoneNumberField({ name = 'phone', label }: Props) {
  const t = useTranslations('auth.phone');
  const locale = useAppLocale();
  const { setValue } = useFormContext();
  const [country, setCountry] = useState(DEFAULT_PHONE_COUNTRY);
  const dial = PHONE_FORMATS[country].dial;

  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label ?? t('label')}</FormLabel>
          <div className="space-y-2">
            <NativeSelect
              aria-label={t('country')}
              className="w-full"
              value={country}
              onChange={(e) => {
                setCountry(e.target.value);
                setValue(name, '', { shouldValidate: false });
              }}
            >
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {countryLabel(c, locale)} ({PHONE_FORMATS[c].dial})
                </option>
              ))}
            </NativeSelect>
            <div className="flex min-w-0">
              <span
                data-testid="phone-dial"
                className="inline-flex items-center rounded-l-md border border-r-0 bg-muted px-2.5 text-sm text-muted-foreground"
              >
                {dial}
              </span>
              <FormControl>
                <Input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  className="min-w-0 rounded-l-none"
                  placeholder={phonePlaceholder(country)}
                  name={field.name}
                  ref={field.ref}
                  onBlur={field.onBlur}
                  value={nationalPhoneOf(country, field.value)}
                  onChange={(e) =>
                    field.onChange(
                      toStoredPhone(country, maskNationalPhone(country, e.target.value)),
                    )
                  }
                />
              </FormControl>
            </div>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
