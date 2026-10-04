'use client';
import { useTranslations } from 'next-intl';
import { useLabels } from '@/i18n/labels';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from '@/i18n/link';
import { Search } from 'lucide-react';
import { contentsApi } from '@/lib/api/contents.api';
import { ContentForm } from '@/components/content/ContentForm';
import { FormView } from '@/components/layout/FormView';
import { PageHeader } from '@/components/layout/PageHeader';
import { filterContents, ALL_TYPES, type ContentTypeFilter } from '@/components/content/filter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { ErrorNotice } from '@/components/ui/error-notice';
import { ContentType, type Content } from '@churchy/shared';

interface Props {
  params: { parishId: string };
}

const PAGE_SIZE = 24;

export default function ContentsPage({ params }: Props) {
  const t = useTranslations('dashContents');
  const td = useTranslations('dashboard');
  const tc = useTranslations('common');
  const labels = useLabels();
  const { parishId } = params;
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState('');
  const [type, setType] = useState<ContentTypeFilter>(ALL_TYPES);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const load = useCallback(() => {
    setError(null);
    return contentsApi
      .findByParish(parishId)
      .then(setContents)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : td('loadError')))
      .finally(() => setLoading(false));
  }, [parishId, td]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => setVisible(PAGE_SIZE), [query, type]);

  const filtered = useMemo(() => filterContents(contents, query, type), [contents, query, type]);

  if (showForm) {
    return (
      <FormView title={t('newTitle')} description={t('newDesc')} onBack={() => setShowForm(false)}>
        <ContentForm
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
      ) : contents.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">{t('empty')}</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem] lg:max-w-3xl">
            <div className="relative">
              <Search
                size={16}
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                type="search"
                aria-label={t('searchAria')}
                placeholder={t('searchPlaceholder')}
                className="pl-9"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <NativeSelect
              aria-label={t('filterAria')}
              value={type}
              onChange={(e) => setType(e.target.value as ContentTypeFilter)}
            >
              <option value={ALL_TYPES}>{t('allTypes')}</option>
              {Object.values(ContentType).map((ct) => (
                <option key={ct} value={ct}>
                  {labels.contentType(ct)}
                </option>
              ))}
            </NativeSelect>
          </div>
          <p className="text-sm text-muted-foreground" role="status">
            {t('count', { count: filtered.length })}
            {filtered.length !== contents.length && t('ofTotal', { total: contents.length })}
          </p>

          {filtered.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">{t('noMatch')}</p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filtered.slice(0, visible).map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/dashboard/parishes/${parishId}/contents/${c.id}`}
                    className="flex min-h-[3.5rem] items-center justify-between gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-primary hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="min-w-0 truncate font-medium">{c.title}</span>
                    <span className="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                      {labels.contentType(c.type)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {filtered.length > visible && (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                {t('showMore', { remaining: filtered.length - visible })}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
