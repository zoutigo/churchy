import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  ERR,
  hasParishPermission,
  SCHEDULE_WINDOW_MESSAGES,
  SERIES_END_REMINDER_DAYS,
  checkScheduleWindow,
  expandSchedule,
  type Schedule,
} from '@churchy/shared';
import type { ParishRoleValue } from '../../common/decorators/parish-role.decorator';

/** Une date est passée dès qu'elle a commencé : on ne réécrit pas l'histoire. */
export function isPast(startsAt: Date, now: Date): boolean {
  return startsAt.getTime() <= now.getTime();
}

export const PAST_MESSAGE = ERR.occurrencePast;

export function assertNotPast(startsAt: Date, now: Date): void {
  if (isPast(startsAt, now)) throw new ConflictException(PAST_MESSAGE);
}

/** La dernière date approche (ou vient de passer de peu : non) — rappel de prolongation un mois avant. */
export function isEndingSoon(lastOccurrenceAt: Date | null, now: Date): boolean {
  if (!lastOccurrenceAt || lastOccurrenceAt.getTime() <= now.getTime()) return false;
  return lastOccurrenceAt.getTime() - now.getTime() <= SERIES_END_REMINDER_DAYS * 86_400_000;
}

/** Les notes internes sont réservées à ceux qui préparent (administrateurs et préparateurs). */
export function canSeeInternalNotes(role: ParishRoleValue | undefined): boolean {
  if (role === undefined) return false;
  if (role === 'SUPER_ADMIN' || role === 'PLATFORM_STAFF') return true;
  return hasParishPermission(role, 'parish.celebrations.write');
}

/** Erreur de planning au même format que les erreurs Zod, pour s'afficher sous le champ. */
export function scheduleError(message: string): BadRequestException {
  return new BadRequestException({ formErrors: [], fieldErrors: { schedule: [message] } });
}

/** Dates (UTC) d'un planning dans le fuseau de la paroisse ; refuse le passé et au-delà d'un an. */
export function resolveSchedule(schedule: Schedule, timezone: string, now: Date): Date[] {
  const instants = expandSchedule(schedule, timezone);
  const problem = checkScheduleWindow(instants, now);
  if (problem) throw scheduleError(SCHEDULE_WINDOW_MESSAGES[problem]);
  return instants;
}
