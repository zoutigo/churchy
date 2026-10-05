'use client';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { PIN_LENGTH } from '@churchy/shared';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Props = Omit<
  React.ComponentProps<typeof Input>,
  'type' | 'inputMode' | 'value' | 'onChange'
> & {
  value: string;
  /** Reçoit la valeur nettoyée (chiffres seulement, 6 au plus), pas l'évènement : se branche sur `field.onChange`. */
  onChange: (value: string) => void;
};

/**
 * Saisie du PIN à 6 chiffres : clavier numérique sur mobile, tout ce qui n'est pas un chiffre est écarté
 * (collage compris), masqué par défaut avec un bouton afficher / masquer. Pas d'attribut `maxLength` : le navigateur
 * tronquerait un collage « 482 915 » avant le nettoyage ; la limite est appliquée ici.
 */
const PinInput = React.forwardRef<HTMLInputElement, Props>(
  ({ className, value, onChange, ...props }, ref) => {
    const t = useTranslations('auth.pin');
    const [visible, setVisible] = React.useState(false);

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={visible ? 'text' : 'password'}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          placeholder={props.placeholder ?? '••••••'}
          className={cn('pr-10 tracking-[0.4em] tabular-nums', className)}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH))}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t('hide') : t('show')}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground hover:text-churchy-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    );
  },
);
PinInput.displayName = 'PinInput';

export { PinInput };
