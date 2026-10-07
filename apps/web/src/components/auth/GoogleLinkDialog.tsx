'use client';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ERR } from '@churchy/shared';
import { useRouter } from '@/i18n/link';
import { useAuth } from '@/hooks/useAuth';
import { AuthLink } from '@/components/auth/AuthCard';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { PasswordInput } from '@/components/ui/password-input';
import { Button } from '@/components/ui/button';
import { afterLoginPath } from '@/lib/auth/session';
import { handleSubmitError } from '@/lib/forms/submit-error';
import { notify } from '@/lib/notify';

const schema = z.object({ password: z.string().min(1, ERR.passwordRequired) });
type Values = z.infer<typeof schema>;

interface Props {
  idToken: string;
  email: string;
  next?: string;
  onClose: () => void;
}

/** Un compte existe déjà avec cet email : son mot de passe prouve qu'il est bien à la personne avant de lier Google. */
export function GoogleLinkDialog({ idToken, email, next, onClose }: Props) {
  const t = useTranslations('auth.google');
  const tAuth = useTranslations('auth');
  const router = useRouter();
  const { linkGoogleWithPassword, loading } = useAuth();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: '' },
  });

  async function onSubmit({ password }: Values) {
    try {
      const user = await linkGoogleWithPassword({ idToken, password });
      notify.success(t('linked'));
      router.push(afterLoginPath(user, next));
      router.refresh();
    } catch (err: unknown) {
      handleSubmitError(form, err, t('linkError'));
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('linkTitle')}</DialogTitle>
          <DialogDescription>
            {t.rich('linkText', { email, strong: (chunks) => <strong>{chunks}</strong> })}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>{tAuth('password')}</FormLabel>
                    <span className="text-xs">
                      <AuthLink href="/forgot-password">{tAuth('login.forgot')}</AuthLink>
                    </span>
                  </div>
                  <FormControl>
                    <PasswordInput autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.formState.errors.root && (
              <p role="alert" className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={onClose}>
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? t('linking') : t('linkSubmit')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
