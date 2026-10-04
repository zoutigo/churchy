'use client';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  DEFAULT_COUNTRY,
  createParishSchema,
  withCompletePhone,
  type CreateParishDto,
} from '@churchy/shared';
import { parishesApi } from '@/lib/api/parishes.api';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { LocationFields } from './LocationFields';
import { PhoneField } from './PhoneField';
import { handleSubmitError } from '@/lib/forms/submit-error';
import { notify } from '@/lib/notify';

interface Props {
  onSuccess?: () => void;
}

export function CreateParishForm({ onSuccess }: Props) {
  const t = useTranslations('parishForm');
  const tc = useTranslations('common');
  const form = useForm<CreateParishDto>({
    resolver: zodResolver(withCompletePhone(createParishSchema)),
    defaultValues: {
      name: '',
      description: '',
      country: DEFAULT_COUNTRY,
      region: '',
      city: '',
      district: '',
      addressComplement: '',
      phone: '',
      email: '',
    },
    mode: 'onChange',
  });

  async function onSubmit(data: CreateParishDto) {
    try {
      await parishesApi.create(data);
      notify.success(t('created'), t('createdText', { name: data.name }));
      form.reset();
      onSuccess?.();
    } catch (err: unknown) {
      handleSubmitError(form, err, t('createError'));
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('name')}</FormLabel>
              <FormControl>
                <Input placeholder={t('namePlaceholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('description')}{' '}
                <span className="text-muted-foreground text-xs">{tc('optional')}</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t('descriptionPlaceholder')}
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <LocationFields />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="addressComplement"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t('fields.addressComplement.label')}{' '}
                  <span className="text-muted-foreground text-xs">{tc('optional')}</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder={t('fields.addressComplement.placeholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <PhoneField optionalHint />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t('email')}{' '}
                  <span className="text-muted-foreground text-xs">{tc('optional')}</span>
                </FormLabel>
                <FormControl>
                  <Input type="email" placeholder={t('fields.email.placeholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {form.formState.errors.root && (
          <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
        )}
        <Button type="submit" className="w-full sm:w-auto" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? t('creating') : t('create')}
        </Button>
      </form>
    </Form>
  );
}
