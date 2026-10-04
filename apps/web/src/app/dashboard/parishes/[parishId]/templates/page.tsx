'use client';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { templatesApi, type TemplateWithSteps } from '@/lib/api/celebrations.api';
import { errorMessage } from '@/lib/forms/submit-error';
import { notify } from '@/lib/notify';
import { TemplateCard } from '@/components/celebration/TemplateCard';
import { TemplateForm } from '@/components/celebration/TemplateForm';
import { FormView } from '@/components/layout/FormView';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { ErrorNotice } from '@/components/ui/error-notice';

interface Props {
  params: { parishId: string };
}

export default function TemplatesPage({ params }: Props) {
  const t = useTranslations('dashTemplates');
  const td = useTranslations('dashboard');
  const tc = useTranslations('common');
  const { parishId } = params;
  const [templates, setTemplates] = useState<TemplateWithSteps[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TemplateWithSteps | null>(null);

  const load = useCallback(() => {
    templatesApi
      .findByParish(parishId)
      .then(setTemplates)
      .catch((err: unknown) => setError(errorMessage(err, td('loadError'))))
      .finally(() => setLoading(false));
  }, [parishId, td]);

  useEffect(load, [load]);

  if (creating || editing) {
    const close = () => {
      setCreating(false);
      setEditing(null);
    };
    return (
      <FormView
        title={editing ? t('editTitle', { name: editing.name }) : t('newTitle')}
        description={editing ? t('editDesc') : t('newDesc')}
        onBack={close}
      >
        <TemplateForm
          parishId={parishId}
          template={editing ?? undefined}
          onCancel={close}
          onDone={() => {
            close();
            load();
          }}
        />
      </FormView>
    );
  }

  async function remove(tpl: TemplateWithSteps) {
    try {
      await templatesApi.remove(tpl.id);
      setTemplates((list) => list.filter((x) => x.id !== tpl.id));
      notify.success(t('removed'), tpl.name);
    } catch (err) {
      notify.error(t('removeError'), errorMessage(err, t('removeFailed')));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('desc')}
        action={<Button onClick={() => setCreating(true)}>{t('add')}</Button>}
      />

      {error ? (
        <ErrorNotice message={error} />
      ) : loading ? (
        <p className="text-muted-foreground">{tc('loading')}</p>
      ) : templates.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">{t('empty')}</p>
      ) : (
        <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((tpl) => (
            <TemplateCard
              key={tpl.id}
              template={tpl}
              onEdit={() => setEditing(tpl)}
              onDelete={() => remove(tpl)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
