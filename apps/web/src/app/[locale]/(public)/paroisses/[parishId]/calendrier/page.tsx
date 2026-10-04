import { isValidMonth } from '@churchy/shared';
import { readQueryParam } from '@/i18n/paths';
import { MonthCalendar, todayIn } from '@/components/public/MonthCalendar';
import { orNotFound, publicApi } from '@/lib/api/public.api';

interface Props {
  params: { parishId: string };
  searchParams: Record<string, string | string[] | undefined>;
}

/** Calendrier public : toutes les dates annoncées du mois (passées et annulées comprises). */
export default async function Page({ params, searchParams }: Props) {
  // Un mois mal formé dans l'URL retombe sur le mois courant plutôt que sur une erreur.
  // `?mois=` (français) ou `?month=` (anglais) : les deux sont lus, les anciens liens restent valides.
  const raw = readQueryParam(searchParams, 'mois');
  const month = raw && isValidMonth(raw) ? raw : undefined;
  const calendar = await orNotFound(publicApi.getCalendar(params.parishId, month));
  return (
    <MonthCalendar
      calendar={calendar}
      parishId={params.parishId}
      today={todayIn(calendar.timezone)}
    />
  );
}
