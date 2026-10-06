'use client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Link } from '@/i18n/link';
import { ExternalLink } from 'lucide-react';
import type { ParishPermission } from '@churchy/shared';
import { useParish } from '@/hooks/useParish';
import { useParishAccess } from '@/hooks/useParishAccess';
import { FollowButton } from '@/components/parish/FollowButton';
import { FavoriteButton } from '@/components/favorites/FavoriteButton';
import { ParishInfoSummary } from '@/components/parish/ParishInfoSummary';
import { FormView } from '@/components/layout/FormView';
import { Button } from '@/components/ui/button';
import { ParishInfoForm } from '@/components/parish/ParishInfoForm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ErrorNotice } from '@/components/ui/error-notice';

interface Props {
  params: { parishId: string };
}

/** Chaque section n'est proposée qu'à qui peut la lire (l'API refuse de toute façon). */
const SECTIONS: { key: string; permission: ParishPermission }[] = [
  { key: 'contents', permission: 'parish.internal.read' },
  { key: 'templates', permission: 'parish.internal.read' },
  { key: 'celebrations', permission: 'parish.internal.read' },
  { key: 'announcements', permission: 'parish.view' },
  { key: 'activities', permission: 'parish.view' },
];

export default function ParishDetailPage({ params }: Props) {
  const t = useTranslations('dashboard.parish');
  const tc = useTranslations('common');
  const { parishId } = params;
  const { parish, error, setParish } = useParish(parishId);
  const { ready, can } = useParishAccess(parishId);
  const canManage = can('parish.manage');
  const sections = SECTIONS.filter((x) => can(x.permission));
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
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">{parish?.name ?? t('fallbackName')}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {parish && (
            <>
              <FollowButton parishId={parishId} parishName={parish.name} />
              <FavoriteButton parishId={parishId} parishName={parish.name} />
            </>
          )}
          <Link
            href={`/paroisses/${parishId}`}
            target="_blank"
            className="inline-flex h-11 items-center gap-2 px-2 text-sm font-medium text-churchy-500 hover:underline"
          >
            {t('viewPublic')} <ExternalLink size={14} aria-hidden />
          </Link>
        </div>
        {ready && !canManage && (
          <p className="text-sm text-muted-foreground">{t('readOnlyHint')}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map(({ key }) => (
          <Link
            key={key}
            href={`/dashboard/parishes/${parishId}/${key}`}
            className="block rounded-lg border bg-card p-5 hover:shadow-md transition-shadow"
          >
            <h2 className="font-semibold">{t(`sections.${key}.title`)}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t(`sections.${key}.text`)}</p>
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
          {parish && canManage && (
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
