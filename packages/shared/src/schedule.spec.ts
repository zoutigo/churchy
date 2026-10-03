import { describe, expect, it } from 'vitest';
import {
  MAX_OCCURRENCES_PER_REQUEST,
  checkScheduleWindow,
  expandSchedule,
  currentMonth,
  isValidDateString,
  isValidMonth,
  monthRange,
  shiftMonth,
  isValidTimeString,
  isValidTimezone,
  scheduleHorizon,
  TIMEZONE_CHOICES,
  timezoneForCountry,
  utcToZoned,
  zonedToUtc,
} from './schedule';
import { scheduleSchema } from './schemas/celebration.schema';
import { COUNTRIES } from './constants/geo.constants';

const iso = (d: Date) => d.toISOString();

describe('zonedToUtc / utcToZoned', () => {
  it('convertit en tenant compte du fuseau (Douala = UTC+1 toute l’année)', () => {
    expect(iso(zonedToUtc('2026-05-25', '10:00', 'Africa/Douala'))).toBe(
      '2026-05-25T09:00:00.000Z',
    );
    expect(iso(zonedToUtc('2026-12-25', '10:00', 'Africa/Douala'))).toBe(
      '2026-12-25T09:00:00.000Z',
    );
  });

  it('suit l’heure d’été et l’heure d’hiver (Paris)', () => {
    expect(iso(zonedToUtc('2026-01-18', '10:00', 'Europe/Paris'))).toBe('2026-01-18T09:00:00.000Z');
    expect(iso(zonedToUtc('2026-07-19', '10:00', 'Europe/Paris'))).toBe('2026-07-19T08:00:00.000Z');
  });

  it('revient à la date et l’heure locales (aller-retour)', () => {
    for (const tz of ['Europe/Paris', 'Africa/Douala', 'America/Toronto', 'Asia/Kolkata']) {
      const instant = zonedToUtc('2026-10-25', '09:30', tz);
      expect(utcToZoned(instant, tz)).toEqual({ date: '2026-10-25', time: '09:30' });
    }
  });

  it('refuse une date ou une heure mal formée', () => {
    expect(() => zonedToUtc('25/05/2026', '10:00', 'Europe/Paris')).toThrow();
    expect(() => zonedToUtc('2026-05-25', '10h', 'Europe/Paris')).toThrow();
  });
});

describe('expandSchedule', () => {
  it('déplie une récurrence hebdomadaire en gardant l’heure locale au changement d’heure', () => {
    // 29 mars 2026 : passage à l’heure d’été en France.
    const dates = expandSchedule(
      {
        kind: 'recurrence',
        startDate: '2026-03-22',
        endDate: '2026-04-05',
        time: '10:00',
        weekdays: [0],
      },
      'Europe/Paris',
    );
    expect(dates.map(iso)).toEqual([
      '2026-03-22T09:00:00.000Z',
      '2026-03-29T08:00:00.000Z',
      '2026-04-05T08:00:00.000Z',
    ]);
  });

  it('inclut le premier et le dernier jour, et plusieurs jours par semaine', () => {
    const dates = expandSchedule(
      {
        kind: 'recurrence',
        startDate: '2026-06-01', // lundi
        endDate: '2026-06-07', // dimanche
        time: '18:30',
        weekdays: [1, 6, 0],
      },
      'Africa/Douala',
    );
    expect(dates.map((d) => utcToZoned(d, 'Africa/Douala').date)).toEqual([
      '2026-06-01',
      '2026-06-06',
      '2026-06-07',
    ]);
  });

  it('renvoie une liste vide si aucun jour ne correspond', () => {
    expect(
      expandSchedule(
        {
          kind: 'recurrence',
          startDate: '2026-06-02', // mardi
          endDate: '2026-06-05',
          time: '10:00',
          weekdays: [0],
        },
        'Europe/Paris',
      ),
    ).toEqual([]);
  });

  it('trie et dédoublonne des dates ponctuelles', () => {
    const dates = expandSchedule(
      {
        kind: 'dates',
        dates: [
          { date: '2026-08-02', time: '10:00' },
          { date: '2026-07-26', time: '10:00' },
          { date: '2026-08-02', time: '10:00' },
        ],
      },
      'Africa/Douala',
    );
    expect(dates.map(iso)).toEqual(['2026-07-26T09:00:00.000Z', '2026-08-02T09:00:00.000Z']);
  });

  it('ne dépend pas du fuseau de la machine pour le jour de la semaine', () => {
    // Dimanche 2026-01-04 à 00:30 à Tokyo est encore samedi en UTC : le jour local doit rester dimanche.
    const dates = expandSchedule(
      {
        kind: 'recurrence',
        startDate: '2026-01-04',
        endDate: '2026-01-04',
        time: '00:30',
        weekdays: [0],
      },
      'Asia/Tokyo',
    );
    expect(dates.map(iso)).toEqual(['2026-01-03T15:30:00.000Z']);
  });
});

describe('checkScheduleWindow', () => {
  const now = new Date('2026-10-03T12:00:00.000Z');
  const at = (s: string) => new Date(s);

  it('accepte des dates à venir dans l’année', () => {
    expect(
      checkScheduleWindow([at('2026-10-04T09:00:00Z'), at('2027-10-03T11:59:00Z')], now),
    ).toBeNull();
  });

  it('refuse le passé, y compris l’instant présent', () => {
    expect(checkScheduleWindow([at('2026-10-03T11:00:00Z')], now)).toBe('PAST');
    expect(checkScheduleWindow([now], now)).toBe('PAST');
    expect(checkScheduleWindow([at('2026-10-10T09:00:00Z'), at('2026-09-01T09:00:00Z')], now)).toBe(
      'PAST',
    );
  });

  it('refuse au-delà d’un an', () => {
    expect(checkScheduleWindow([at('2027-10-03T12:00:01Z')], now)).toBe('TOO_FAR');
    expect(iso(scheduleHorizon(now))).toBe('2027-10-03T12:00:00.000Z');
  });

  it('refuse une liste vide ou trop longue', () => {
    expect(checkScheduleWindow([], now)).toBe('EMPTY');
    const many = Array.from(
      { length: MAX_OCCURRENCES_PER_REQUEST + 1 },
      (_, i) => new Date(now.getTime() + (i + 1) * 3_600_000),
    );
    expect(checkScheduleWindow(many, now)).toBe('TOO_MANY');
  });
});

describe('validation', () => {
  it('reconnaît les dates, heures et fuseaux valides', () => {
    expect(isValidDateString('2026-02-28')).toBe(true);
    expect(isValidDateString('2026-02-31')).toBe(false);
    expect(isValidDateString('2026-2-3')).toBe(false);
    expect(isValidTimeString('09:05')).toBe(true);
    expect(isValidTimeString('24:00')).toBe(false);
    expect(isValidTimeString('9:05')).toBe(false);
    expect(isValidTimezone('Africa/Douala')).toBe(true);
    expect(isValidTimezone('Mars/Olympus')).toBe(false);
  });

  it('donne un fuseau valide à chaque pays proposé', () => {
    for (const country of COUNTRIES) {
      expect(isValidTimezone(timezoneForCountry(country))).toBe(true);
    }
    expect(TIMEZONE_CHOICES).toContain('Africa/Douala');
    expect(new Set(TIMEZONE_CHOICES).size).toBe(TIMEZONE_CHOICES.length);
    expect(timezoneForCountry('Cameroun')).toBe('Africa/Douala');
    expect(timezoneForCountry('Pays inconnu')).toBe('Europe/Paris');
  });

  it('schéma de planning : dates ponctuelles', () => {
    expect(
      scheduleSchema.safeParse({ kind: 'dates', dates: [{ date: '2026-05-25', time: '10:00' }] })
        .success,
    ).toBe(true);
    expect(scheduleSchema.safeParse({ kind: 'dates', dates: [] }).success).toBe(false);
    expect(
      scheduleSchema.safeParse({ kind: 'dates', dates: [{ date: '2026-02-31', time: '10:00' }] })
        .success,
    ).toBe(false);
  });

  it('schéma de planning : récurrence', () => {
    const base = {
      kind: 'recurrence',
      startDate: '2026-06-01',
      endDate: '2026-08-31',
      time: '10:00',
      weekdays: [0],
    };
    expect(scheduleSchema.safeParse(base).success).toBe(true);
    expect(scheduleSchema.safeParse({ ...base, endDate: '2026-05-01' }).success).toBe(false);
    expect(scheduleSchema.safeParse({ ...base, weekdays: [] }).success).toBe(false);
    expect(scheduleSchema.safeParse({ ...base, weekdays: [7] }).success).toBe(false);
    expect(scheduleSchema.safeParse({ ...base, time: '25:00' }).success).toBe(false);
    expect(scheduleSchema.safeParse({ kind: 'weekly' }).success).toBe(false);
  });
});

describe('mois', () => {
  it('valide le format AAAA-MM', () => {
    expect(isValidMonth('2026-10')).toBe(true);
    expect(isValidMonth('2026-13')).toBe(false);
    expect(isValidMonth('2026-00')).toBe(false);
    expect(isValidMonth('2026-1')).toBe(false);
    expect(isValidMonth('26-10')).toBe(false);
  });

  it('décale d’un mois à travers les années', () => {
    expect(shiftMonth('2026-10', 1)).toBe('2026-11');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-03', -15)).toBe('2024-12');
    expect(() => shiftMonth('nope', 1)).toThrow();
  });

  it('le mois courant dépend du fuseau (minuit passé à Douala, pas à Montréal)', () => {
    const now = new Date('2026-10-31T23:30:00.000Z');
    expect(currentMonth('Africa/Douala', now)).toBe('2026-11'); // 00:30 le 1er novembre
    expect(currentMonth('America/Toronto', now)).toBe('2026-10');
  });

  it('borne un mois dans le fuseau de la paroisse', () => {
    const { start, end } = monthRange('2026-10', 'Africa/Douala');
    expect(start.toISOString()).toBe('2026-09-30T23:00:00.000Z');
    expect(end.toISOString()).toBe('2026-10-31T23:00:00.000Z');
  });

  it('un mois contenant un changement d’heure fait 1 h de plus ou de moins (Paris, octobre 2026)', () => {
    const { start, end } = monthRange('2026-10', 'Europe/Paris');
    expect(start.toISOString()).toBe('2026-09-30T22:00:00.000Z');
    expect(end.toISOString()).toBe('2026-10-31T23:00:00.000Z');
    expect((end.getTime() - start.getTime()) / 3_600_000).toBe(31 * 24 + 1);
  });
});
