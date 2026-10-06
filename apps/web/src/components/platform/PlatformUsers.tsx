'use client';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import {
  PLATFORM_ROLE_RANK,
  canChangePlatformRole,
  canSuspendAccount,
  hasPlatformPermission,
  type PlatformUserDto,
  type PlatformUsersPageDto,
  type UserRole,
} from '@churchy/shared';
import { Loader2, Search, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { platformApi } from '@/lib/api/platform.api';
import { errorMessage } from '@/lib/forms/submit-error';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { PageHeader } from '@/components/layout/PageHeader';

const ROLES = Object.keys(PLATFORM_ROLE_RANK) as UserRole[];

/**
 * Comptes de la plateforme : recherche, rôle, suspension. Les contrôles proposés suivent les règles de
 * `@churchy/shared` (l'API les impose de toute façon) : on ne montre que ce que l'utilisateur peut faire.
 */
export function PlatformUsers() {
  const t = useTranslations('platform.users');
  const tRoles = useTranslations('platform.roles');
  const tPlatform = useTranslations('platform');
  const { user: me } = useAuth();
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PlatformUsersPageDto | null>(null);
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

  const allowed = !!me && hasPlatformPermission(me.role, 'platform.users.read');

  const load = useCallback(async () => {
    if (!allowed) return;
    setLoading(true);
    setFailed(false);
    try {
      setData(await platformApi.users({ q: search, page }));
    } catch (err: unknown) {
      setFailed(true);
      notify.error(t('loadError'), errorMessage(err, ''));
    } finally {
      setLoading(false);
    }
  }, [allowed, search, page, t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!me) return null;
  if (!allowed) {
    return (
      <Alert variant="destructive" className="mx-auto max-w-xl">
        <ShieldAlert size={16} />
        <AlertDescription>{tPlatform('forbidden')}</AlertDescription>
      </Alert>
    );
  }

  const replaceRow = (updated: PlatformUserDto) =>
    setData((d) =>
      d ? { ...d, items: d.items.map((u) => (u.id === updated.id ? updated : u)) } : d,
    );
  const nameOf = (u: PlatformUserDto) => `${u.firstName} ${u.lastName}`;

  async function changeRole(target: PlatformUserDto, role: UserRole) {
    setBusy(target.id);
    try {
      const updated = await platformApi.changeRole(target.id, role);
      replaceRow(updated);
      notify.success(t('roleChanged', { name: nameOf(updated), role: tRoles(updated.role) }));
    } catch (err: unknown) {
      notify.error(t('roleError'), errorMessage(err, ''));
    } finally {
      setBusy(null);
    }
  }

  async function toggleSuspension(target: PlatformUserDto) {
    setBusy(target.id);
    setConfirming(null);
    try {
      const suspending = !target.suspendedAt;
      const updated = suspending
        ? await platformApi.suspend(target.id)
        : await platformApi.reinstate(target.id);
      replaceRow(updated);
      notify.success(t(suspending ? 'suspendedOk' : 'reinstatedOk', { name: nameOf(updated) }));
    } catch (err: unknown) {
      notify.error(t('suspendError'), errorMessage(err, ''));
    } finally {
      setBusy(null);
    }
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  const roleControl = (u: PlatformUserDto) => {
    const options = ROLES.filter((r) => r === u.role || canChangePlatformRole(me.role, u.role, r));
    if (options.length <= 1) return <span className="text-sm">{tRoles(u.role)}</span>;
    return (
      <NativeSelect
        aria-label={t('roleLabel', { name: nameOf(u) })}
        value={u.role}
        disabled={busy === u.id}
        onChange={(e) => void changeRole(u, e.target.value as UserRole)}
        className="h-11 sm:h-9 lg:w-full lg:max-w-44"
      >
        {options.map((r) => (
          <option key={r} value={r}>
            {tRoles(r)}
          </option>
        ))}
      </NativeSelect>
    );
  };

  const suspensionControl = (u: PlatformUserDto) => {
    if (!canSuspendAccount(me.role, u.role, u.id === me.id)) return null;
    if (u.suspendedAt) {
      return (
        <Button
          size="sm"
          variant="outline"
          disabled={busy === u.id}
          onClick={() => void toggleSuspension(u)}
          className="h-11 w-full sm:h-9 sm:w-auto"
        >
          {t('reinstate')}
        </Button>
      );
    }
    if (confirming === u.id) {
      return (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="destructive"
            disabled={busy === u.id}
            onClick={() => void toggleSuspension(u)}
            className="h-11 flex-1 sm:h-9 sm:flex-none"
          >
            {t('suspendConfirm')}
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
        onClick={() => setConfirming(u.id)}
        className="h-11 w-full text-destructive sm:h-9 sm:w-auto"
      >
        {t('suspend')}
      </Button>
    );
  };

  const status = (u: PlatformUserDto) => (
    <span
      className={cn(
        'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
        u.suspendedAt ? 'bg-destructive/10 text-destructive' : 'bg-emerald-100 text-emerald-800',
      )}
    >
      {u.suspendedAt ? t('suspended') : t('active')}
    </span>
  );

  return (
    <div className="space-y-5">
      <PageHeader title={t('title')} description={t('desc')} />

      <div className="relative max-w-md">
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

      {loading && !data ? (
        <div role="status" className="flex justify-center py-10">
          <Loader2 className="animate-spin text-churchy-500" size={22} />
        </div>
      ) : failed && !data ? null : data && data.items.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">{t('empty')}</p>
      ) : (
        data && (
          <>
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {t('count', { count: data.total })}
            </p>

            {/* Mobile et tablette : une carte par compte (la barre latérale laisse peu de place au tableau). */}
            <ul className="space-y-3 lg:hidden" aria-label={t('title')}>
              {data.items.map((u) => (
                <li
                  key={u.id}
                  className="space-y-3 rounded-lg border border-churchy-200 bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {nameOf(u)}
                        {u.id === me.id && (
                          <span className="ml-2 text-xs text-muted-foreground">({t('you')})</span>
                        )}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {u.email ?? t('noEmail')}
                      </p>
                    </div>
                    {status(u)}
                  </div>
                  {roleControl(u)}
                  {suspensionControl(u)}
                </li>
              ))}
            </ul>

            {/* Bureau : tableau. */}
            <div className="hidden overflow-hidden rounded-lg border border-churchy-200 bg-white lg:block">
              <table className="w-full table-fixed text-left text-sm">
                <thead className="bg-churchy-50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium w-[30%]">
                      {t('columns.name')}
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium w-[26%]">
                      {t('columns.role')}
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium w-[14%]">
                      {t('columns.status')}
                    </th>
                    <th scope="col" className="px-4 py-3 font-medium w-[30%]">
                      {t('columns.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-churchy-100">
                  {data.items.map((u) => (
                    <tr key={u.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium">
                          {nameOf(u)}
                          {u.id === me.id && (
                            <span className="ml-2 text-xs text-muted-foreground">({t('you')})</span>
                          )}
                        </p>
                        <p className="text-muted-foreground">{u.email ?? t('noEmail')}</p>
                      </td>
                      <td className="px-4 py-3">{roleControl(u)}</td>
                      <td className="px-4 py-3">{status(u)}</td>
                      <td className="px-4 py-3">{suspensionControl(u)}</td>
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
