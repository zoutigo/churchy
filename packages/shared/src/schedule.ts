/**
 * Planning d'une série de célébrations : dates ponctuelles ou récurrence hebdomadaire, exprimées en
 * **heure locale de la paroisse** (date « AAAA-MM-JJ » + heure « HH:mm ») puis converties en instants UTC
 * avec le fuseau de la paroisse. « Chaque dimanche à 10 h » reste donc à 10 h au passage heure d'été/hiver.
 * Le même code sert à l'API (création) et au web (aperçu des dates générées).
 */

export interface ScheduleDate {
  /** Jour local, « AAAA-MM-JJ ». */
  date: string;
  /** Heure locale, « HH:mm ». */
  time: string;
}

export type Schedule =
  | { kind: 'dates'; dates: ScheduleDate[] }
  | {
      kind: 'recurrence';
      startDate: string;
      endDate: string;
      time: string;
      /** Jours de la semaine, 0 = dimanche … 6 = samedi. */
      weekdays: number[];
    };

/** Une série ne peut pas être programmée au-delà d'un an. */
export const SCHEDULE_HORIZON_YEARS = 1;
/** Rappel de prolongation : un mois avant la fin de la série. */
export const SERIES_END_REMINDER_DAYS = 30;
/** Nombre maximal de dates acceptées par requête (un an en quotidien, avec marge). */
export const MAX_OCCURRENCES_PER_REQUEST = 400;

export const DEFAULT_TIMEZONE = 'Europe/Paris';

/** Fuseau par défaut selon le pays (noms français de `COUNTRIES`). Modifiable ensuite par la paroisse. */
export const COUNTRY_TIMEZONES: Record<string, string> = {
  Cameroun: 'Africa/Douala',
  'Afrique du Sud': 'Africa/Johannesburg',
  Algérie: 'Africa/Algiers',
  Allemagne: 'Europe/Berlin',
  Angola: 'Africa/Luanda',
  Belgique: 'Europe/Brussels',
  Bénin: 'Africa/Porto-Novo',
  Brésil: 'America/Sao_Paulo',
  'Burkina Faso': 'Africa/Ouagadougou',
  Burundi: 'Africa/Bujumbura',
  Canada: 'America/Toronto',
  Centrafrique: 'Africa/Bangui',
  Congo: 'Africa/Brazzaville',
  "Côte d'Ivoire": 'Africa/Abidjan',
  Espagne: 'Europe/Madrid',
  'États-Unis': 'America/New_York',
  France: 'Europe/Paris',
  Gabon: 'Africa/Libreville',
  Ghana: 'Africa/Accra',
  Guinée: 'Africa/Conakry',
  'Guinée équatoriale': 'Africa/Malabo',
  Italie: 'Europe/Rome',
  Luxembourg: 'Europe/Luxembourg',
  Mali: 'Africa/Bamako',
  Maroc: 'Africa/Casablanca',
  Niger: 'Africa/Niamey',
  Nigeria: 'Africa/Lagos',
  'Pays-Bas': 'Europe/Amsterdam',
  Portugal: 'Europe/Lisbon',
  'République démocratique du Congo': 'Africa/Kinshasa',
  'Royaume-Uni': 'Europe/London',
  Rwanda: 'Africa/Kigali',
  Sénégal: 'Africa/Dakar',
  Suisse: 'Europe/Zurich',
  Tchad: 'Africa/Ndjamena',
  Togo: 'Africa/Lome',
  Tunisie: 'Africa/Tunis',
};

export function timezoneForCountry(country: string): string {
  return COUNTRY_TIMEZONES[country] ?? DEFAULT_TIMEZONE;
}

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('fr-FR', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** « AAAA-MM-JJ » existant au calendrier (refuse le 31 février). */
export function isValidDateString(value: string): boolean {
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

export function isValidTimeString(value: string): boolean {
  return TIME_RE.test(value);
}

/** Décalage (ms) du fuseau par rapport à UTC à l'instant donné. */
function offsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/** Instant UTC correspondant à une date et une heure locales dans le fuseau donné. */
export function zonedToUtc(date: string, time: string, timeZone: string): Date {
  const d = DATE_RE.exec(date);
  const t = TIME_RE.exec(time);
  if (!d || !t) throw new Error(`Date ou heure invalide : ${date} ${time}`);
  const wallClock = Date.UTC(
    Number(d[1]),
    Number(d[2]) - 1,
    Number(d[3]),
    Number(t[1]),
    Number(t[2]),
  );
  // Deux passes : le décalage au moment cherché peut différer de celui de l'estimation (changement d'heure).
  let utc = wallClock - offsetMs(wallClock, timeZone);
  utc = wallClock - offsetMs(utc, timeZone);
  return new Date(utc);
}

/** Jour (« AAAA-MM-JJ ») et heure (« HH:mm ») locaux d'un instant dans le fuseau donné. */
export function utcToZoned(instant: Date, timeZone: string): ScheduleDate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  };
}

/** Dernier instant programmable : un an après `now`. */
export function scheduleHorizon(now: Date = new Date()): Date {
  const limit = new Date(now);
  limit.setUTCFullYear(limit.getUTCFullYear() + SCHEDULE_HORIZON_YEARS);
  return limit;
}

/** Jours « AAAA-MM-JJ » de `start` à `end` inclus, avec leur jour de semaine (calendrier, sans fuseau). */
function eachDay(start: string, end: string): { date: string; weekday: number }[] {
  const s = DATE_RE.exec(start)!;
  const cursor = new Date(Date.UTC(Number(s[1]), Number(s[2]) - 1, Number(s[3])));
  const e = DATE_RE.exec(end)!;
  const last = Date.UTC(Number(e[1]), Number(e[2]) - 1, Number(e[3]));
  const days: { date: string; weekday: number }[] = [];
  while (cursor.getTime() <= last && days.length <= 3660) {
    days.push({ date: cursor.toISOString().slice(0, 10), weekday: cursor.getUTCDay() });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

/** Instants UTC (triés, sans doublon) d'un planning, interprété dans le fuseau de la paroisse. */
export function expandSchedule(schedule: Schedule, timeZone: string): Date[] {
  const instants =
    schedule.kind === 'dates'
      ? schedule.dates.map((d) => zonedToUtc(d.date, d.time, timeZone))
      : eachDay(schedule.startDate, schedule.endDate)
          .filter((day) => schedule.weekdays.includes(day.weekday))
          .map((day) => zonedToUtc(day.date, schedule.time, timeZone));
  const unique = new Map(instants.map((i) => [i.getTime(), i]));
  return [...unique.values()].sort((a, b) => a.getTime() - b.getTime());
}

export type ScheduleWindowError = 'EMPTY' | 'PAST' | 'TOO_FAR' | 'TOO_MANY';

/**
 * Vérifie que les dates générées sont toutes à venir et dans l'horizon d'un an.
 * Retourne `null` si le planning est valide, sinon la première raison de refus.
 */
export function checkScheduleWindow(
  instants: Date[],
  now: Date = new Date(),
): ScheduleWindowError | null {
  if (instants.length === 0) return 'EMPTY';
  if (instants.length > MAX_OCCURRENCES_PER_REQUEST) return 'TOO_MANY';
  if (instants.some((i) => i.getTime() <= now.getTime())) return 'PAST';
  const horizon = scheduleHorizon(now).getTime();
  if (instants.some((i) => i.getTime() > horizon)) return 'TOO_FAR';
  return null;
}

export const SCHEDULE_WINDOW_MESSAGES: Record<ScheduleWindowError, string> = {
  EMPTY: 'Aucune date ne correspond à ce planning',
  PAST: 'Impossible de programmer une date passée',
  TOO_FAR: 'Impossible de programmer au-delà d’un an',
  TOO_MANY: `Trop de dates (${MAX_OCCURRENCES_PER_REQUEST} maximum)`,
};

/** Fuseaux proposés dans le formulaire de paroisse (ceux des pays proposés), triés. */
export const TIMEZONE_CHOICES: readonly string[] = [
  ...new Set(Object.values(COUNTRY_TIMEZONES)),
].sort();

/* ------------------------------------------------------------------------------------------------
 * Mois (« AAAA-MM ») : calendrier public, d'un mois dans le fuseau de la paroisse.
 * ---------------------------------------------------------------------------------------------- */

const MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

export const isValidMonth = (value: string): boolean => MONTH_RE.test(value);

/** Mois courant (« AAAA-MM ») dans le fuseau donné. */
export function currentMonth(timeZone: string, now: Date = new Date()): string {
  return utcToZoned(now, timeZone).date.slice(0, 7);
}

/** Mois décalé de `delta` mois (négatif : précédent). */
export function shiftMonth(month: string, delta: number): string {
  const m = MONTH_RE.exec(month);
  if (!m) throw new Error(`Mois invalide : ${month}`);
  const index = Number(m[1]) * 12 + (Number(m[2]) - 1) + delta;
  const year = Math.floor(index / 12);
  return `${String(year).padStart(4, '0')}-${String((index % 12) + 1).padStart(2, '0')}`;
}

/** Début (inclus) et fin (exclue) d'un mois, en instants UTC, selon le fuseau. */
export function monthRange(month: string, timeZone: string): { start: Date; end: Date } {
  return {
    start: zonedToUtc(`${month}-01`, '00:00', timeZone),
    end: zonedToUtc(`${shiftMonth(month, 1)}-01`, '00:00', timeZone),
  };
}
