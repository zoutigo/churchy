'use client';
import { useTranslations } from 'next-intl';
import { useAppLocale } from '@/i18n/locale';
import { useCallback, useEffect, useState } from 'react';
import { activitiesApi, type Activity } from '@/lib/api/activities.api';
import { CreateActivityForm } from '@/components/news/CreateActivityForm';
import { DeleteButton } from '@/components/news/DeleteButton';
import { FormView } from '@/components/layout/FormView';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { ErrorNotice } from '@/components/ui/error-notice';
import { errorMessage } from '@/lib/forms/submit-error';
import { notify } from '@/lib/notify';
import { formatDateLong, formatTime } from '@/lib/format';

interface Props {
  params: { parishId: string };
}

export default function Page({ params }: Props) {
  const t = useTranslations('dashActivities');
  const td = useTranslations('dashboard');
  const tc = useTranslations('common');
  const tcn = useTranslations('dashContents');
  const locale = useAppLocale();
  const { parishId } = params;
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() => {
    setError(null);
    return activitiesApi
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
        <CreateActivityForm
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
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-muted-foreground">
                  {t('at', {
                    date: formatDateLong(item.startsAt, { locale }),
                    time: formatTime(item.startsAt, { locale }),
                  })}
                </p>
              </div>
              <DeleteButton
                label={item.title}
                onConfirm={async () => {
                  try {
                    await activitiesApi.remove(parishId, item.id);
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
