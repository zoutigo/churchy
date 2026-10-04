'use client';
import { useTranslations } from 'next-intl';
import { useLabels } from '@/i18n/labels';
import { useAppLocale } from '@/i18n/locale';
import { useCallback, useEffect, useState } from 'react';
import { Link } from '@/i18n/link';
import { useRouter } from '@/i18n/link';
import { ArrowLeft } from 'lucide-react';
import { contentsApi } from '@/lib/api/contents.api';
import { ContentForm } from '@/components/content/ContentForm';
import { DeleteButton } from '@/components/news/DeleteButton';
import { FormView } from '@/components/layout/FormView';
import { RichContent } from '@/components/rich-text/RichContent';
import { Button } from '@/components/ui/button';
import { ErrorNotice } from '@/components/ui/error-notice';
import { useAuth } from '@/hooks/useAuth';
import { errorMessage } from '@/lib/forms/submit-error';
import { notify } from '@/lib/notify';
import { formatDateLong } from '@/lib/format';
import type { Content } from '@churchy/shared';

interface Props {
  params: { parishId: string; contentId: string };
}

export default function ContentDetailPage({ params }: Props) {
  const t = useTranslations('dashContents');
  const tc = useTranslations('common');
  const labels = useLabels();
  const locale = useAppLocale();
  const { parishId, contentId } = params;
  const router = useRouter();
  const { user } = useAuth();
  const [content, setContent] = useState<Content | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const listUrl = `/dashboard/parishes/${parishId}/contents`;

  const load = useCallback(() => {
    contentsApi
      .findById(contentId)
      .then(setContent)
      .catch((err: unknown) => setError(errorMessage(err, t('loadOneError'))));
  }, [contentId, t]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4">
        <ErrorNotice message={error} />
        <Button asChild variant="outline">
          <Link href={listUrl}>{t('backToLibrary')}</Link>
        </Button>
      </div>
    );
  }
  if (!content) return <p className="text-muted-foreground">{tc('loading')}</p>;

  // L'API réserve la modification et la suppression à l'auteur du contenu.
  const canManage = user?.id === content.createdById;

  if (editing) {
    return (
      <FormView
        title={t('editTitle')}
        description={t('quoted', { title: content.title })}
        onBack={() => setEditing(false)}
      >
        <ContentForm
          parishId={parishId}
          content={content}
          onSuccess={(saved) => {
            setContent({ ...content, ...saved });
            setEditing(false);
          }}
        />
      </FormView>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 sm:space-y-6">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="-ml-3 h-10 gap-2 text-muted-foreground sm:h-9"
      >
        <Link href={listUrl}>
          <ArrowLeft size={16} aria-hidden /> {t('library')}
        </Link>
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <h1 className="break-words text-2xl font-bold">{content.title}</h1>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
              {labels.contentType(content.type)}
            </span>
            <span>
              {t('addedOn', { date: formatDateLong(String(content.createdAt), { locale }) })}
            </span>
            {content.createdBy && (
              <span>
                {t('by', { name: `${content.createdBy.firstName} ${content.createdBy.lastName}` })}
              </span>
            )}
          </p>
        </div>
        {canManage && (
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              {tc('edit')}
            </Button>
            <DeleteButton
              label={content.title}
              onConfirm={async () => {
                try {
                  await contentsApi.delete(content.id);
                  notify.success(t('deleted'), t('quoted', { title: content.title }));
                  router.push(listUrl);
                } catch (err: unknown) {
                  notify.error(t('deleteFailed'), errorMessage(err, t('retryLater')));
                }
              }}
            />
          </div>
        )}
      </div>

      <article className="rounded-lg border bg-card p-4 sm:p-6 lg:p-8">
        <RichContent html={content.body} />
      </article>
      {!canManage && <p className="text-sm text-muted-foreground">{t('onlyAuthor')}</p>}
    </div>
  );
}
