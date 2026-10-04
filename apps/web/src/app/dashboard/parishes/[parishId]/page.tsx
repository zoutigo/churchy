'use client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Link } from '@/i18n/link';
import { ExternalLink } from 'lucide-react';
import { useParish } from '@/hooks/useParish';
import { ParishInfoSummary } from '@/components/parish/ParishInfoSummary';
import { FormView } from '@/components/layout/FormView';
import { Button } from '@/components/ui/button';
import { ParishInfoForm } from '@/components/parish/ParishInfoForm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ErrorNotice } from '@/components/ui/error-notice';

interface Props {
  params: { parishId: string };
}

const SECTIONS = ['contents', 'templates', 'celebrations', 'announcements', 'activities'] as const;

export default function ParishDetailPage({ params }: Props) {
  const t = useTranslations('dashboard.parish');
  const tc = useTranslations('common');
  const { parishId } = params;
  const { parish, error, setParish } = useParish(parishId);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);

  if (editing && parish) {
    return (
      <FormView
        title={t('editTitle')}
        description={t('publicDesc')}
        onBack={() => setEditing(false)}
      >
        <ParishInfoForm
          parish={parish}
          onSaved={(saved) => {
            setParish(saved);
            setSaved(true);
            setEditing(false);
          }}
        />
      </FormView>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">{parish?.name ?? t('fallbackName')}</h1>
        <Link
          href={`/paroisses/${parishId}`}
          target="_blank"
          className="inline-flex items-center gap-2 text-sm font-medium text-churchy-500 hover:underline"
        >
          {t('viewPublic')} <ExternalLink size={14} aria-hidden />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SECTIONS.map((s) => (
          <Link
            key={s}
            href={`/dashboard/parishes/${parishId}/${s}`}
            className="block rounded-lg border bg-card p-5 hover:shadow-md transition-shadow"
          >
            <h2 className="font-semibold">{t(`sections.${s}.title`)}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t(`sections.${s}.text`)}</p>
          </Link>
        ))}
      </div>

      <section
        className="rounded-lg border bg-card p-4 sm:p-6 space-y-4"
        aria-labelledby="public-info"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 id="public-info" className="font-semibold">
              {t('publicInfo')}
            </h2>
            <p className="text-sm text-muted-foreground">{t('publicDesc')}</p>
          </div>
          {parish && (
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => {
                setSaved(false);
                setEditing(true);
              }}
            >
              {tc('edit')}
            </Button>
          )}
        </div>
        {error ? (
          <ErrorNotice message={error} />
        ) : parish ? (
          <>
            {saved && (
              <Alert variant="success">
                <AlertDescription>{t('saved')}</AlertDescription>
              </Alert>
            )}
            <ParishInfoSummary parish={parish} />
          </>
        ) : (
          <p className="text-muted-foreground">{tc('loading')}</p>
        )}
      </section>
    </div>
  );
}
