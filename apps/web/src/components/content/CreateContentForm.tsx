'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createContentSchema, type CreateContentDto, ContentType } from '@churchy/shared';
import { contentsApi } from '@/lib/api/contents.api';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  [ContentType.SONG]: 'Chant',
  [ContentType.PSALM]: 'Psaume',
  [ContentType.GOSPEL]: 'Évangile',
  [ContentType.READING]: 'Lecture',
  [ContentType.PRAYER]: 'Prière',
  [ContentType.UNIVERSAL_PRAYER]: 'Prière universelle',
  [ContentType.ANNOUNCEMENT]: 'Annonce',
  [ContentType.FREE_TEXT]: 'Texte libre',
};

interface Props {
  parishId: string;
  onSuccess?: () => void;
}

export function CreateContentForm({ parishId, onSuccess }: Props) {
  const form = useForm<CreateContentDto>({
    resolver: zodResolver(createContentSchema),
    defaultValues: {
      title: '',
      type: ContentType.FREE_TEXT,
      body: '',
      language: 'fr',
      tags: [],
    },
    mode: 'onChange',
  });

  async function onSubmit(data: CreateContentDto) {
    try {
      await contentsApi.create(parishId, data);
      form.reset();
      onSuccess?.();
    } catch (err: unknown) {
      form.setError('root', {
        message: err instanceof Error ? err.message : 'Erreur lors de la création',
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Titre</FormLabel>
              <FormControl>
                <Input placeholder="Titre du contenu" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.values(ContentType).map((type) => (
                    <SelectItem key={type} value={type}>
                      {CONTENT_TYPE_LABELS[type]}
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
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contenu</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Saisissez le texte ici..."
                  className="min-h-[150px] resize-y"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {form.formState.errors.root && (
          <p className="text-sm text-destructive">
            {form.formState.errors.root.message}
          </p>
        )}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Enregistrement...' : 'Ajouter le contenu'}
        </Button>
      </form>
    </Form>
  );
}
