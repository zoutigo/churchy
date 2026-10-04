'use client';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  TIMEZONE_CHOICES,
  updateParishSchema,
  withCompletePhone,
  type Parish,
  type UpdateParishDto,
} from '@churchy/shared';
import { parishesApi } from '@/lib/api/parishes.api';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { LocationFields } from './LocationFields';
import { PhoneField } from './PhoneField';
import { handleSubmitError } from '@/lib/forms/submit-error';
import { notify } from '@/lib/notify';

type Field = keyof UpdateParishDto;

const TEXT_FIELDS: { name: Field; type?: string }[] = [
  { name: 'mainChurch' },
  { name: 'address' },
  { name: 'addressComplement' },
  { name: 'email', type: 'email' },
  { name: 'website', type: 'url' },
  { name: 'imageUrl', type: 'url' },
];

/** Identité publique de la paroisse : ce qui s'affiche sur sa page et dans les résultats de recherche. */
export function ParishInfoForm({
  parish,
  onSaved,
}: {
  parish: Parish;
  onSaved?: (p: Parish) => void;
}) {
  const t = useTranslations('parishForm');
  const tc = useTranslations('common');
  const form = useForm<UpdateParishDto>({
    resolver: zodResolver(withCompletePhone(updateParishSchema)),
    defaultValues: {
      description: parish.description ?? '',
      country: parish.country,
      region: parish.region ?? '',
      city: parish.city,
      district: parish.district ?? '',
      mainChurch: parish.mainChurch ?? '',
      address: parish.address ?? '',
      addressComplement: parish.addressComplement ?? '',
      phone: parish.phone ?? '',
      email: parish.email ?? '',
      website: parish.website ?? '',
      imageUrl: parish.imageUrl ?? '',
      timezone: parish.timezone,
    },
    mode: 'onChange',
  });

  async function onSubmit(data: UpdateParishDto) {
    try {
      const saved = await parishesApi.update(parish.id, data);
      form.clearErrors('root');
      notify.success(t('updated'));
      onSaved?.(saved);
    } catch (err: unknown) {
      handleSubmitError(form, err, t('saveError'));
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('presentation')}</FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  placeholder={t('presentationPlaceholder')}
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <LocationFields />
        <div className="grid gap-4 sm:grid-cols-2">
          <PhoneField />
          {TEXT_FIELDS.map((f) => (
            <FormField
              key={f.name}
              control={form.control}
              name={f.name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t(`fields.${f.name}.label`)}</FormLabel>
                  <FormControl>
                    <Input
                      type={f.type}
                      placeholder={t(`fields.${f.name}.placeholder`)}
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
          <FormField
            control={form.control}
            name="timezone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('timezone')}</FormLabel>
                <FormControl>
                  <NativeSelect {...field} value={field.value ?? parish.timezone}>
                    {[...new Set([...TIMEZONE_CHOICES, parish.timezone])].sort().map((tz) => (
                      <option key={tz} value={tz}>
                        {tz.replace('_', ' ')}
                      </option>
                    ))}
                  </NativeSelect>
                </FormControl>
                <p className="text-xs text-muted-foreground">{t('timezoneHint')}</p>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {form.formState.errors.root && (
          <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
        )}
        <Button type="submit" className="w-full sm:w-auto" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? t('saving') : tc('save')}
        </Button>
      </form>
    </Form>
  );
}
