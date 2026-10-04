import { describe, expect, it } from 'vitest';
import { dateBounds, draftToSchedule, emptyDraft, previewDraft } from './schedule-draft';

const now = new Date('2026-10-03T12:00:00.000Z');

describe('previewDraft', () => {
  it('un brouillon vide n’affiche ni aperçu ni erreur', () => {
    const p = previewDraft(emptyDraft(), 'Europe/Paris', now);
    expect(p).toMatchObject({ blank: true, error: null, instants: [] });
  });

  it('liste les dates d’une récurrence, à l’heure locale de la paroisse', () => {
    const p = previewDraft(
      {
        mode: 'recurrence',
        startDate: '2026-10-04',
        endDate: '2026-10-18',
        time: '10:00',
        weekdays: [0],
      },
      'Africa/Douala',
      now,
    );
    expect(p.error).toBeNull();
    expect(p.instants.map((i) => i.toISOString())).toEqual([
      '2026-10-04T09:00:00.000Z',
      '2026-10-11T09:00:00.000Z',
      '2026-10-18T09:00:00.000Z',
    ]);
  });

  it('applique les mêmes refus que l’API : passé et au-delà d’un an', () => {
    const one = (date: string) =>
      previewDraft({ mode: 'dates', dates: [{ date, time: '10:00' }] }, 'Europe/Paris', now);
    expect(one('2026-10-01').error).toBe('schedulePast');
    expect(one('2027-11-01').error).toBe('scheduleTooFar');
    expect(one('2026-10-05').error).toBeNull();
  });

  it('signale une fin de récurrence antérieure au début', () => {
    const p = previewDraft(
      {
        mode: 'recurrence',
        startDate: '2026-10-20',
        endDate: '2026-10-10',
        time: '10:00',
        weekdays: [0],
      },
      'Europe/Paris',
      now,
    );
    expect(p.error).toBe('endBeforeStart');
  });

  it('une récurrence sans jour correspondant est signalée', () => {
    const p = previewDraft(
      {
        mode: 'recurrence',
        startDate: '2026-10-06', // mardi
        endDate: '2026-10-09',
        time: '10:00',
        weekdays: [0],
      },
      'Europe/Paris',
      now,
    );
    expect(p.error).toBe('scheduleEmpty');
  });

  it('ignore les lignes de dates laissées vides', () => {
    const draft = {
      mode: 'dates' as const,
      dates: [
        { date: '', time: '10:00' },
        { date: '2026-10-05', time: '10:00' },
      ],
    };
    expect(draftToSchedule(draft)).toEqual({
      kind: 'dates',
      dates: [{ date: '2026-10-05', time: '10:00' }],
    });
  });
});

describe('dateBounds', () => {
  it('va d’aujourd’hui (jour local de la paroisse) à un an plus tard', () => {
    expect(dateBounds('Europe/Paris', now)).toEqual({ min: '2026-10-03', max: '2027-10-03' });
    // 23 h UTC : il est déjà le lendemain à Douala (UTC+1).
    expect(dateBounds('Africa/Douala', new Date('2026-10-03T23:30:00.000Z')).min).toBe(
      '2026-10-04',
    );
  });
});
