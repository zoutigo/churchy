import { BadRequestException, ConflictException } from '@nestjs/common';
import { ParishRole } from '@churchy/shared';
import {
  assertNotPast,
  canSeeInternalNotes,
  isEndingSoon,
  isPast,
  resolveSchedule,
} from './celebration.rules';

const now = new Date('2026-10-03T12:00:00.000Z');
const at = (s: string) => new Date(s);

describe('isPast / assertNotPast', () => {
  it('une date est passée dès qu’elle a commencé', () => {
    expect(isPast(at('2026-10-03T11:59:59.000Z'), now)).toBe(true);
    expect(isPast(now, now)).toBe(true);
    expect(isPast(at('2026-10-03T12:00:01.000Z'), now)).toBe(false);
  });

  it('assertNotPast refuse le passé avec un 409', () => {
    expect(() => assertNotPast(at('2026-01-01T10:00:00.000Z'), now)).toThrow(ConflictException);
    expect(() => assertNotPast(at('2026-12-01T10:00:00.000Z'), now)).not.toThrow();
  });
});

describe('isEndingSoon', () => {
  it('rappelle dans les 30 derniers jours seulement', () => {
    expect(isEndingSoon(at('2026-11-02T12:00:00.000Z'), now)).toBe(true); // J+30
    expect(isEndingSoon(at('2026-11-02T12:00:01.000Z'), now)).toBe(false); // J+30 + 1 s
    expect(isEndingSoon(at('2026-10-10T09:00:00.000Z'), now)).toBe(true);
  });

  it('pas de rappel pour une série terminée ou sans date', () => {
    expect(isEndingSoon(at('2026-10-01T09:00:00.000Z'), now)).toBe(false);
    expect(isEndingSoon(null, now)).toBe(false);
  });
});

describe('canSeeInternalNotes', () => {
  it('réservées à ceux qui préparent (administrateur, préparateur) et au super admin', () => {
    expect(canSeeInternalNotes(ParishRole.PARISH_ADMIN)).toBe(true);
    expect(canSeeInternalNotes(ParishRole.PREPARER)).toBe(true);
    expect(canSeeInternalNotes('SUPER_ADMIN')).toBe(true);
    expect(canSeeInternalNotes(ParishRole.READER)).toBe(false);
    expect(canSeeInternalNotes(ParishRole.VIEWER)).toBe(false);
    expect(canSeeInternalNotes(undefined)).toBe(false);
  });
});

describe('resolveSchedule', () => {
  it('déplie en heure locale de la paroisse', () => {
    const dates = resolveSchedule(
      { kind: 'dates', dates: [{ date: '2026-10-04', time: '10:00' }] },
      'Africa/Douala',
      now,
    );
    expect(dates.map((d) => d.toISOString())).toEqual(['2026-10-04T09:00:00.000Z']);
  });

  it.each([
    ['passé', { kind: 'dates', dates: [{ date: '2026-10-02', time: '10:00' }] }, 'schedulePast'],
    [
      'trop loin',
      { kind: 'dates', dates: [{ date: '2027-10-04', time: '10:00' }] },
      'scheduleTooFar',
    ],
    [
      'récurrence sans jour correspondant',
      {
        kind: 'recurrence',
        startDate: '2026-10-06', // mardi
        endDate: '2026-10-09',
        time: '10:00',
        weekdays: [0],
      },
      'scheduleEmpty',
    ],
  ] as const)(
    'refuse un planning invalide : %s, sous le champ « schedule »',
    (_n, schedule, text) => {
      try {
        resolveSchedule(schedule as never, 'Europe/Paris', now);
        throw new Error('aurait dû échouer');
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
        const body = (err as BadRequestException).getResponse() as {
          fieldErrors: { schedule: string[] };
        };
        expect(body.fieldErrors.schedule[0]).toContain(text);
      }
    },
  );

  it('accepte exactement un an, refuse une seconde de plus', () => {
    expect(() =>
      resolveSchedule(
        { kind: 'dates', dates: [{ date: '2027-10-03', time: '12:59' }] },
        'Europe/Paris',
        now,
      ),
    ).not.toThrow(); // 12:59 Paris = 10:59Z... avant 12:00Z de l'an suivant
    expect(() =>
      resolveSchedule(
        { kind: 'dates', dates: [{ date: '2027-10-03', time: '14:01' }] },
        'Europe/Paris',
        now,
      ),
    ).toThrow(BadRequestException);
  });
});
