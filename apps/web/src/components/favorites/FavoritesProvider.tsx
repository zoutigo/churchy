'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { MAX_FAVORITE_PARISHES, type PublicParishSummary } from '@churchy/shared';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/useAuth';
import { favoritesApi } from '@/lib/api/favorites.api';
import { errorMessage } from '@/lib/forms/submit-error';
import {
  clearLocalFavorites,
  readLocalFavorites,
  writeLocalFavorites,
} from '@/lib/favorites/storage';
import { notify } from '@/lib/notify';

interface FavoritesContextValue {
  /** Identifiants des paroisses favorites, dans l'ordre d'ajout (la première est « ma paroisse »). */
  ids: string[];
  /** Résumés des favoris (chargés dès qu'un composant appelle `useFavoriteItems`). */
  items: PublicParishSummary[];
  /** Faux tant que les favoris ne sont pas connus (session en cours de vérification). */
  ready: boolean;
  /** Vrai pendant le chargement des résumés. */
  itemsLoading: boolean;
  isFavorite: (parishId: string) => boolean;
  /** Ajoute ou retire la paroisse ; annonce le résultat par un toast. */
  toggle: (parish: { id: string; name: string }) => Promise<void>;
  requestItems: () => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

/**
 * Paroisses favorites. Visiteur : conservées sur l'appareil (`localStorage`, ids seulement) ;
 * connecté : persistées en base. À la connexion, les favoris de l'appareil sont versés dans le compte
 * puis effacés de l'appareil (un appareil partagé ne garde rien d'un compte).
 */
export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations('favorites');
  const { user, initializing } = useAuth();
  const userId = user?.id ?? null;
  const [ids, setIds] = useState<string[]>([]);
  const [summaries, setSummaries] = useState<Record<string, PublicParishSummary>>({});
  const [ready, setReady] = useState(false);
  const [itemsWanted, setItemsWanted] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(false);
  const idsRef = useRef(ids);
  idsRef.current = ids;

  const applyList = useCallback((list: PublicParishSummary[]) => {
    setIds(list.map((p) => p.id));
    setSummaries(Object.fromEntries(list.map((p) => [p.id, p])));
  }, []);

  // Source des favoris : l'appareil pour un visiteur, le compte (avec fusion) une fois connecté.
  useEffect(() => {
    if (initializing) return;
    let cancelled = false;
    setSummaries({});
    if (!userId) {
      setIds(readLocalFavorites());
      setReady(true);
      return;
    }
    (async () => {
      const local = readLocalFavorites();
      try {
        const list = local.length
          ? await favoritesApi.merge({ parishIds: local })
          : await favoritesApi.list();
        if (local.length) clearLocalFavorites();
        if (!cancelled) applyList(list);
      } catch {
        try {
          if (!cancelled) applyList(await favoritesApi.list());
        } catch {
          if (!cancelled) setIds([]);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initializing, userId, applyList]);

  // Visiteur : les résumés manquants sont demandés à l'API publique, seulement si quelqu'un les affiche.
  useEffect(() => {
    if (!ready || userId || !itemsWanted) return;
    const missing = ids.filter((id) => !summaries[id]);
    if (missing.length === 0) return;
    let cancelled = false;
    setItemsLoading(true);
    favoritesApi
      .summaries(ids)
      .then((list) => {
        if (cancelled) return;
        const found = new Set(list.map((p) => p.id));
        setSummaries((prev) => ({ ...prev, ...Object.fromEntries(list.map((p) => [p.id, p])) }));
        // Une paroisse qui n'existe plus ne reste pas dans les favoris de l'appareil.
        const kept = idsRef.current.filter((id) => found.has(id) || summaries[id]);
        if (kept.length !== idsRef.current.length) {
          writeLocalFavorites(kept);
          setIds(kept);
        }
      })
      .catch(() => {
        // Hors ligne : on réessaiera au prochain affichage ; les favoris eux-mêmes ne sont pas touchés.
      })
      .finally(() => !cancelled && setItemsLoading(false));
    return () => {
      cancelled = true;
    };
    // `summaries` volontairement absent : on ne redemande que quand la liste d'ids change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, userId, itemsWanted, ids.join(',')]);

  const toggle = useCallback(
    async ({ id, name }: { id: string; name: string }) => {
      const current = idsRef.current;
      const removing = current.includes(id);
      if (!removing && current.length >= MAX_FAVORITE_PARISHES) {
        notify.error(t('limitTitle'), t('limitText', { max: MAX_FAVORITE_PARISHES }));
        return;
      }
      const next = removing ? current.filter((x) => x !== id) : [...current, id];
      setIds(next);

      if (!userId) {
        writeLocalFavorites(next);
      } else {
        try {
          await (removing ? favoritesApi.remove(id) : favoritesApi.add(id));
        } catch (err) {
          setIds((now) => (removing ? [...now, id] : now.filter((x) => x !== id)));
          notify.error(removing ? t('removeFail') : t('addFail'), errorMessage(err, t('retry')));
          return;
        }
      }
      if (removing) notify.success(t('removed'), t('removedText', { name }));
      else notify.success(t('added'), t('addedText', { name }));
    },
    [userId, t],
  );

  const requestItems = useCallback(() => setItemsWanted(true), []);

  const value = useMemo<FavoritesContextValue>(
    () => ({
      ids,
      items: ids.flatMap((id) => summaries[id] ?? []),
      ready,
      itemsLoading,
      isFavorite: (id) => ids.includes(id),
      toggle,
      requestItems,
    }),
    [ids, summaries, ready, itemsLoading, toggle, requestItems],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites doit être utilisé dans un <FavoritesProvider>');
  return ctx;
}

/** Comme `useFavorites`, et demande en plus les résumés (nom, ville, prochaine messe) des favoris. */
export function useFavoriteItems(): FavoritesContextValue {
  const ctx = useFavorites();
  const { requestItems } = ctx;
  useEffect(() => requestItems(), [requestItems]);
  return ctx;
}
