import {
  checkScheduleWindow,
  expandSchedule,
  scheduleHorizon,
  scheduleSchema,
  SCHEDULE_WINDOW_MESSAGES,
  utcToZoned,
  type Schedule,
  type ScheduleDate,
} from '@churchy/shared';

/** Brouillon du planning tel que saisi dans le formulaire (champs éventuellement incomplets). */
export type ScheduleDraft =
  | { mode: 'dates'; dates: ScheduleDate[] }
  | { mode: 'recurrence'; startDate: string; endDate: string; time: string; weekdays: number[] };

export const DEFAULT_TIME = '10:00';

export const emptyDraft = (): ScheduleDraft => ({
  mode: 'dates',
  dates: [{ date: '', time: DEFAULT_TIME }],
});

export function draftToSchedule(draft: ScheduleDraft): Schedule {
  if (draft.mode === 'recurrence') {
    return {
      kind: 'recurrence',
      startDate: draft.startDate,
      endDate: draft.endDate,
      time: draft.time,
      weekdays: draft.weekdays,
    };
  }
  return { kind: 'dates', dates: draft.dates.filter((d) => d.date) };
}

const isBlank = (draft: ScheduleDraft) =>
  draft.mode === 'dates'
    ? draft.dates.every((d) => !d.date)
    : !draft.startDate && !draft.endDate && draft.weekdays.length === 0;

export interface SchedulePreview {
  /** Rien n'a encore été saisi : on n'affiche ni aperçu ni erreur. */
  blank: boolean;
  schedule: Schedule | null;
  instants: Date[];
  error: string | null;
}

/** Dates qui seraient créées, et la raison d'un éventuel refus (même règle que l'API). */
export function previewDraft(
  draft: ScheduleDraft,
  timezone: string,
  now = new Date(),
): SchedulePreview {
  if (isBlank(draft)) return { blank: true, schedule: null, instants: [], error: null };
  const schedule = draftToSchedule(draft);
  const parsed = scheduleSchema.safeParse(schedule);
  if (!parsed.success) {
    return { blank: false, schedule: null, instants: [], error: parsed.error.issues[0].message };
  }
  const instants = expandSchedule(parsed.data, timezone);
  const problem = checkScheduleWindow(instants, now);
  return {
    blank: false,
    schedule: parsed.data,
    instants,
    error: problem ? SCHEDULE_WINDOW_MESSAGES[problem] : null,
  };
}

/** Bornes des champs date : aujourd'hui (dans le fuseau de la paroisse) et un an plus tard. */
export function dateBounds(timezone: string, now = new Date()) {
  return {
    min: utcToZoned(now, timezone).date,
    max: utcToZoned(scheduleHorizon(now), timezone).date,
  };
}
