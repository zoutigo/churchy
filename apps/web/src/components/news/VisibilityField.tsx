'use client';
import { useTranslations } from 'next-intl';
import type { Control, FieldValues, Path } from 'react-hook-form';
import { ContentVisibility } from '@churchy/shared';
import { FormField, FormItem } from '@/components/ui/form';

interface Props<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
}

/** Choix « Tout le monde » / « Paroissiens seulement » d'une annonce ou d'une activité. */
export function VisibilityField<T extends FieldValues>({ control, name }: Props<T>) {
  const t = useTranslations('visibilityField');
  const options = [
    { value: ContentVisibility.PUBLIC, label: t('public'), hint: t('publicHint') },
    { value: ContentVisibility.MEMBERS, label: t('members'), hint: t('membersHint') },
  ];
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium leading-none">{t('label')}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {options.map((o) => (
                <label
                  key={o.value}
                  className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3 has-[:checked]:border-churchy-500 has-[:checked]:bg-churchy-50"
                >
                  <input
                    type="radio"
                    name={field.name}
                    value={o.value}
                    checked={field.value === o.value}
                    onChange={() => field.onChange(o.value)}
                    onBlur={field.onBlur}
                    className="mt-1"
                  />
                  <span className="space-y-0.5">
                    <span className="block text-sm font-medium">{o.label}</span>
                    <span className="block text-xs text-muted-foreground">{o.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </FormItem>
      )}
    />
  );
}
