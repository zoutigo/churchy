'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2 } from 'lucide-react';
import {
  CONTACT_TOPICS,
  CONTACT_TOPIC_LABELS,
  contactMessageSchema,
  type ContactMessageDto,
  type ContactTopic,
} from '@churchy/shared';
import { publicApi } from '@/lib/api/public.api';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { handleSubmitError } from '@/lib/forms/submit-error';
import { notify } from '@/lib/notify';

export function ContactForm({ defaultTopic = 'QUESTION' }: { defaultTopic?: ContactTopic }) {
  const [sent, setSent] = useState(false);
  const form = useForm<ContactMessageDto>({
    resolver: zodResolver(contactMessageSchema),
    defaultValues: { name: '', email: '', topic: defaultTopic, message: '', website: '' },
    mode: 'onChange',
  });

  async function onSubmit(data: ContactMessageDto) {
    try {
      await publicApi.sendContact(data);
      notify.success('Message transmis');
      form.reset();
      setSent(true);
    } catch (err: unknown) {
      handleSubmitError(form, err, 'Le message n’a pas pu être envoyé. Réessayez.');
    }
  }

  if (sent) {
    return (
      <div
        role="status"
        className="flex gap-3 rounded-xl border border-churchy-200 bg-churchy-200/40 p-5 text-churchy-700"
      >
        <CheckCircle2 className="mt-0.5 shrink-0" size={20} aria-hidden />
        <div>
          <p className="font-semibold">Message envoyé</p>
          <p className="text-sm">Merci ! Nous vous répondrons par email dès que possible.</p>
          <button
            type="button"
            className="mt-3 text-sm font-medium underline"
            onClick={() => setSent(false)}
          >
            Envoyer un autre message
          </button>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nom</FormLabel>
                <FormControl>
                  <Input autoComplete="name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" autoComplete="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="topic"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sujet</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CONTACT_TOPICS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {CONTACT_TOPIC_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message</FormLabel>
              <FormControl>
                <Textarea rows={6} className="resize-y" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Piège à robots : invisible et inaccessible pour une personne, rempli par les scripts. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label htmlFor="contact-website">Ne pas remplir</label>
          <input
            id="contact-website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            {...form.register('website')}
          />
        </div>

        {form.formState.errors.root && (
          <p role="alert" className="text-sm text-destructive">
            {form.formState.errors.root.message}
          </p>
        )}
        <Button
          type="submit"
          size="lg"
          className="w-full sm:w-auto"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? 'Envoi…' : 'Envoyer le message'}
        </Button>
      </form>
    </Form>
  );
}
