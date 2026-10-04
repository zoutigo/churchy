import { describe, expect, it } from 'vitest';
import type { PublicCelebrationSummary } from '@churchy/shared';
import { buildMonthGrid, groupByDay } from './calendar';

describe('buildMonthGrid', () => {
  it('semaines complètes du lundi au dimanche, jours hors mois marqués', () => {
    const weeks = buildMonthGrid('2026-10'); // 1er octobre 2026 = jeudi
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks[0][0]).toEqual({ date: '2026-09-28', day: 28, inMonth: false });
    expect(weeks[0][3]).toEqual({ date: '2026-10-01', day: 1, inMonth: true });
    expect(weeks.at(-1)!.at(-1)).toEqual({ date: '2026-11-01', day: 1, inMonth: false });
    expect(weeks).toHaveLength(5);
    expect(weeks.flat().filter((c) => c.inMonth)).toHaveLength(31);
  });

  it('un mois qui commence un lundi n’a pas de jours avant', () => {
    const weeks = buildMonthGrid('2026-06'); // 1er juin 2026 = lundi
    expect(weeks[0][0]).toEqual({ date: '2026-06-01', day: 1, inMonth: true });
  });

  it('février 2027 (28 jours, commence un lundi) tient en 4 semaines', () => {
    const weeks = buildMonthGrid('2027-02');
    expect(weeks).toHaveLength(4);
    expect(weeks.flat().every((c) => c.inMonth)).toBe(true);
  });

  it('un mois à 6 semaines (mars 2025 commence un samedi)', () => {
    expect(buildMonthGrid('2025-03')).toHaveLength(6);
  });

  it('passe correctement d’une année à l’autre', () => {
    const weeks = buildMonthGrid('2026-12');
    expect(weeks.flat().filter((c) => c.inMonth)).toHaveLength(31);
    expect(weeks.at(-1)!.at(-1)!.date).toBe('2027-01-03');
  });
});

describe('groupByDay', () => {
  const item = (id: string, date: string): PublicCelebrationSummary =>
    ({ id, date }) as PublicCelebrationSummary;

  it('regroupe par jour LOCAL de la paroisse, dans l’ordre horaire', () => {
    const days = groupByDay(
      [
        item('soir', '2026-10-04T17:00:00.000Z'),
        item('matin', '2026-10-04T08:00:00.000Z'),
        item('autre', '2026-10-05T08:00:00.000Z'),
      ],
      'Africa/Douala',
    );
    expect([...days.keys()]).toEqual(['2026-10-04', '2026-10-05']);
    expect(days.get('2026-10-04')!.map((i) => i.id)).toEqual(['matin', 'soir']);
  });

  it('une messe à 23 h 30 UTC tombe le lendemain à Douala (UTC+1)', () => {
    const days = groupByDay([item('veillee', '2026-10-03T23:30:00.000Z')], 'Africa/Douala');
    expect([...days.keys()]).toEqual(['2026-10-04']);
    const utc = groupByDay([item('veillee', '2026-10-03T23:30:00.000Z')], 'UTC');
    expect([...utc.keys()]).toEqual(['2026-10-03']);
  });
});
