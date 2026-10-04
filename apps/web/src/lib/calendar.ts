import { utcToZoned, type PublicCelebrationSummary } from '@churchy/shared';

export interface CalendarCell {
  /** Jour local « AAAA-MM-JJ ». */
  date: string;
  day: number;
  inMonth: boolean;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Semaines (lundi → dimanche) qui couvrent le mois « AAAA-MM » ; les jours hors mois complètent les bords. */
export function buildMonthGrid(month: string): CalendarCell[][] {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const last = new Date(Date.UTC(y, m, 0));
  const start = new Date(first);
  start.setUTCDate(start.getUTCDate() - ((first.getUTCDay() + 6) % 7)); // retour au lundi
  const weeks: CalendarCell[][] = [];
  const cursor = new Date(start);
  while (cursor <= last || weeks.length === 0 || weeks.at(-1)!.length < 7) {
    if (!weeks.length || weeks.at(-1)!.length === 7) weeks.push([]);
    weeks.at(-1)!.push({
      date: iso(cursor),
      day: cursor.getUTCDate(),
      inMonth: cursor.getUTCMonth() === m - 1,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return weeks;
}

/** Dates regroupées par jour local de la paroisse, chaque jour dans l'ordre horaire. */
export function groupByDay(
  items: PublicCelebrationSummary[],
  timezone: string,
): Map<string, PublicCelebrationSummary[]> {
  const days = new Map<string, PublicCelebrationSummary[]>();
  for (const item of [...items].sort((a, b) => a.date.localeCompare(b.date))) {
    const day = utcToZoned(new Date(item.date), timezone).date;
    days.set(day, [...(days.get(day) ?? []), item]);
  }
  return days;
}
