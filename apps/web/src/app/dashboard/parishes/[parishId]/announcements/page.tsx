'use client';
import { useTranslations } from 'next-intl';
import { useAppLocale } from '@/i18n/locale';
import { useCallback, useEffect, useState } from 'react';
import { announcementsApi, type Announcement } from '@/lib/api/announcements.api';
import { CreateAnnouncementForm } from '@/components/news/CreateAnnouncementForm';
import { DeleteButton } from '@/components/news/DeleteButton';
import { FormView } from '@/components/layout/FormView';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { ErrorNotice } from '@/components/ui/error-notice';
import { errorMessage } from '@/lib/forms/submit-error';
import { notify } from '@/lib/notify';
import { formatDateLong } from '@/lib/format';

interface Props {
  params: { parishId: string };
}

export default function Page({ params }: Props) {
  const t = useTranslations('dashAnnouncements');
  const td = useTranslations('dashboard');
  const tc = useTranslations('common');
  const tcn = useTranslations('dashContents');
  const tv = useTranslations('visibilityField');
  const locale = useAppLocale();
  const { parishId } = params;
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() => {
    setError(null);
    return announcementsApi
      .findByParish(parishId)
      .then(setItems)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : td('loadError')))
      .finally(() => setLoading(false));
  }, [parishId, td]);

  useEffect(() => {
    void load();
  }, [load]);

  if (showForm) {
    return (
      <FormView title={t('newTitle')} description={t('newDesc')} onBack={() => setShowForm(false)}>
        <CreateAnnouncementForm
          parishId={parishId}
          onSuccess={() => {
            setShowForm(false);
            void load();
          }}
        />
      </FormView>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('desc')}
        action={<Button onClick={() => setShowForm(true)}>{t('add')}</Button>}
      />

      {error ? (
        <ErrorNotice message={error} />
      ) : loading ? (
        <p className="text-muted-foreground">{tc('loading')}</p>
      ) : items.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">{t('empty')}</p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <p className="font-medium">
                  {item.title}
                  {item.visibility === 'MEMBERS' && (
                    <span className="ml-2 rounded-full bg-churchy-100 px-2 py-0.5 align-middle text-xs font-normal text-churchy-700">
                      {tv('badgeMembers')}
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatDateLong(item.publishedAt, { locale })}
                </p>
              </div>
              <DeleteButton
                label={item.title}
                onConfirm={async () => {
                  try {
                    await announcementsApi.remove(parishId, item.id);
                    notify.success(t('deleted'), tcn('quoted', { title: item.title }));
                    await load();
                  } catch (err: unknown) {
                    notify.error(tcn('deleteFailed'), errorMessage(err, tcn('retryLater')));
                  }
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
