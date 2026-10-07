'use client';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import {
  ParishDuty,
  ParishStatus,
  type ParishMemberDto,
  type ParishMembersPageDto,
} from '@churchy/shared';
import { Loader2, Search, ShieldAlert } from 'lucide-react';
import { useAppLocale } from '@/i18n/locale';
import { useAuth } from '@/hooks/useAuth';
import { useParishAccess } from '@/hooks/useParishAccess';
import { parishesApi } from '@/lib/api/parishes.api';
import { errorMessage } from '@/lib/forms/submit-error';
import { formatDateLong } from '@/lib/format';
import { notify } from '@/lib/notify';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { PageHeader } from '@/components/layout/PageHeader';

const STATUSES = [ParishStatus.FAITHFUL, ParishStatus.PARISHIONER, ParishStatus.PARISH_ADMIN];
const DUTIES = [ParishDuty.PREPARER, ParishDuty.READER, ParishDuty.ANNOUNCER];

/**
 * Membres d'une paroisse (administrateur) : recherche, statut, responsabilités, retrait. Jamais d'email
 * ni de téléphone (l'API ne les renvoie pas). Le web ne fait que proposer : l'API impose les règles
 * (dernier administrateur, responsabilités réservées aux paroissiens).
 */
export function ParishMembers({ parishId }: { parishId: string }) {
  const t = useTranslations('parishMembers');
  const tStatus = useTranslations('enums.parishStatus');
  const tDuty = useTranslations('enums.parishDuty');
  const locale = useAppLocale();
  const { user: me } = useAuth();
  const { ready, can } = useParishAccess(parishId);
  const allowed = can('parish.manage');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ParishStatus | ''>('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ParishMembersPageDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  // Recherche : on attend la fin de la frappe.
  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  const load = useCallback(async () => {
    if (!allowed) return;
    setLoading(true);
    setFailed(false);
    try {
      setData(
        await parishesApi.members(parishId, { q: search, status: status || undefined, page }),
      );
    } catch (err: unknown) {
      setFailed(true);
      notify.error(t('loadError'), errorMessage(err, ''));
    } finally {
      setLoading(false);
    }
  }, [allowed, parishId, search, status, page, t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!ready) return null;
  if (!allowed) {
    return (
      <Alert variant="destructive" className="mx-auto max-w-xl">
        <ShieldAlert size={16} />
        <AlertDescription>{t('forbidden')}</AlertDescription>
      </Alert>
    );
  }

  const nameOf = (m: ParishMemberDto) => `${m.firstName} ${m.lastName}`;
  const replaceRow = (updated: ParishMemberDto) =>
    setData((d) =>
      d ? { ...d, items: d.items.map((m) => (m.userId === updated.userId ? updated : m)) } : d,
    );

  async function update(
    target: ParishMemberDto,
    dto: { status?: ParishStatus; duties?: ParishDuty[] },
  ) {
    setBusy(target.userId);
    // Optimiste : la case ou la liste ne « revient » pas en arrière le temps de la réponse.
    const status = dto.status ?? target.status;
    replaceRow({
      ...target,
      status,
      duties: status === ParishStatus.PARISHIONER ? (dto.duties ?? target.duties) : [],
    });
    try {
      const updated = await parishesApi.updateMember(parishId, target.userId, dto);
      replaceRow(updated);
      notify.success(
        dto.status
          ? t('statusChanged', { name: nameOf(updated), status: tStatus(updated.status) })
          : t('dutiesChanged', { name: nameOf(updated) }),
      );
    } catch (err: unknown) {
      replaceRow(target); // l'API a refusé : on remet la ligne comme elle était
      notify.error(t('updateError'), errorMessage(err, ''));
    } finally {
      setBusy(null);
    }
  }

  async function remove(target: ParishMemberDto) {
    setBusy(target.userId);
    setConfirming(null);
    try {
      await parishesApi.removeMember(parishId, target.userId);
      notify.success(t('removed', { name: nameOf(target) }));
      await load();
    } catch (err: unknown) {
      notify.error(t('removeError'), errorMessage(err, ''));
    } finally {
      setBusy(null);
    }
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const statusControl = (m: ParishMemberDto) => (
    <NativeSelect
      aria-label={t('statusLabel', { name: nameOf(m) })}
      value={m.status}
      disabled={busy === m.userId}
      onChange={(e) => void update(m, { status: e.target.value as ParishStatus })}
      className="h-11 sm:h-9 lg:max-w-44"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {tStatus(s)}
        </option>
      ))}
    </NativeSelect>
  );

  const dutiesControl = (m: ParishMemberDto) => {
    if (m.status !== ParishStatus.PARISHIONER) {
      return <p className="text-sm text-muted-foreground">{t('dutiesHint')}</p>;
    }
    return (
      <fieldset className="flex flex-wrap gap-x-4 gap-y-1" disabled={busy === m.userId}>
        {DUTIES.map((d) => (
          <label key={d} className="flex min-h-11 items-center gap-2 text-sm sm:min-h-9">
            <input
              type="checkbox"
              className="h-4 w-4 accent-churchy-500"
              aria-label={t('dutyLabel', { duty: tDuty(d), name: nameOf(m) })}
              checked={m.duties.includes(d)}
              onChange={(e) =>
                void update(m, {
                  duties: e.target.checked ? [...m.duties, d] : m.duties.filter((x) => x !== d),
                })
              }
            />
            {tDuty(d)}
          </label>
        ))}
      </fieldset>
    );
  };

  const removeControl = (m: ParishMemberDto) => {
    if (confirming === m.userId) {
      return (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="destructive"
            disabled={busy === m.userId}
            onClick={() => void remove(m)}
            className="h-11 flex-1 sm:h-9 sm:flex-none"
          >
            {t('removeConfirm')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setConfirming(null)}
            className="h-11 sm:h-9"
          >
            {t('cancel')}
          </Button>
        </div>
      );
    }
    return (
      <Button
        size="sm"
        variant="outline"
        aria-label={t('removeLabel', { name: nameOf(m) })}
        disabled={busy === m.userId}
        onClick={() => setConfirming(m.userId)}
        className="h-11 w-full text-destructive sm:h-9 sm:w-auto"
      >
        {t('remove')}
      </Button>
    );
  };

  const you = (m: ParishMemberDto) =>
    m.userId === me?.id && <span className="ml-2 text-xs text-muted-foreground">({t('you')})</span>;
  const since = (m: ParishMemberDto) =>
    t('joined', { date: formatDateLong(m.joinedAt, { locale }) });

  return (
    <div className="space-y-5">
      <PageHeader title={t('title')} description={t('desc')} />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative w-full sm:max-w-md">
          <Search
            size={16}
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            aria-label={t('searchLabel')}
            placeholder={t('searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <NativeSelect
          aria-label={t('filterLabel')}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ParishStatus | '');
            setPage(1);
          }}
          className="sm:w-52"
        >
          <option value="">{t('allStatuses')}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {tStatus(s)}
            </option>
          ))}
        </NativeSelect>
      </div>

      {loading && !data ? (
        <div role="status" className="flex justify-center py-10">
          <Loader2 className="animate-spin text-churchy-500" size={22} />
        </div>
      ) : failed && !data ? null : data && data.items.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">
          {search || status ? t('empty') : t('emptyParish')}
        </p>
      ) : (
        data && (
          <>
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {t('count', { count: data.total })}
            </p>

            {/* Mobile et tablette : une carte par membre. */}
            <ul className="space-y-3 lg:hidden" aria-label={t('title')}>
              {data.items.map((m) => (
                <li
                  key={m.userId}
                  className="space-y-3 rounded-lg border border-churchy-200 bg-white p-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium">
                      {nameOf(m)}
                      {you(m)}
                    </p>
                    <p className="text-sm text-muted-foreground">{since(m)}</p>
                  </div>
                  {statusControl(m)}
                  {dutiesControl(m)}
                  {removeControl(m)}
                </li>
              ))}
            </ul>

            {/* Bureau : tableau. */}
            <div className="hidden overflow-hidden rounded-lg border border-churchy-200 bg-white lg:block">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="bg-churchy-50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th scope="col" className="w-[26%] px-4 py-3 font-medium">
                      {t('columns.name')}
                    </th>
                    <th scope="col" className="w-[20%] px-4 py-3 font-medium">
                      {t('columns.status')}
                    </th>
                    <th scope="col" className="w-[32%] px-4 py-3 font-medium">
                      {t('columns.duties')}
                    </th>
                    <th scope="col" className="w-[22%] px-4 py-3 font-medium">
                      {t('columns.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-churchy-100">
                  {data.items.map((m) => (
                    <tr key={m.userId}>
                      <td className="px-4 py-3">
                        <p className="font-medium">
                          {nameOf(m)}
                          {you(m)}
                        </p>
                        <p className="text-muted-foreground">{since(m)}</p>
                      </td>
                      <td className="px-4 py-3">{statusControl(m)}</td>
                      <td className="px-4 py-3">{dutiesControl(m)}</td>
                      <td className="px-4 py-3">{removeControl(m)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pages > 1 && (
              <nav className="flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => p - 1)}
                >
                  {t('previous')}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {t('pageOf', { page, pages })}
                </span>
                <Button
                  variant="outline"
                  disabled={page >= pages || loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {t('next')}
                </Button>
              </nav>
            )}
          </>
        )
      )}
    </div>
  );
}
