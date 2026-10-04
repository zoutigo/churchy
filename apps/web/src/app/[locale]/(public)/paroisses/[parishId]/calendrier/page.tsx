import { isValidMonth } from '@churchy/shared';
import { MonthCalendar, todayIn } from '@/components/public/MonthCalendar';
import { orNotFound, publicApi } from '@/lib/api/public.api';

interface Props {
  params: { parishId: string };
  searchParams: { mois?: string };
}

/** Calendrier public : toutes les dates annoncées du mois (passées et annulées comprises). */
export default async function Page({ params, searchParams }: Props) {
  // Un mois mal formé dans l'URL retombe sur le mois courant plutôt que sur une erreur.
  const month =
    searchParams.mois && isValidMonth(searchParams.mois) ? searchParams.mois : undefined;
  const calendar = await orNotFound(publicApi.getCalendar(params.parishId, month));
  return (
    <MonthCalendar
      calendar={calendar}
      parishId={params.parishId}
      today={todayIn(calendar.timezone)}
    />
  );
}
