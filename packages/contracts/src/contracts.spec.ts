import { describe, expect, it } from 'vitest';
import { NotificationJob, QUEUES, celebrationPublishedPayloadSchema } from './index';

describe('noms de files et de jobs', () => {
  it('ne contiennent pas ":" (interdit dans un jobId BullMQ)', () => {
    const jobIdSafe = (v: string) => !v.includes(':');
    expect(Object.values(QUEUES).every(jobIdSafe)).toBe(true);
    expect(Object.values(NotificationJob).every(jobIdSafe)).toBe(true);
  });
});

describe('celebrationPublishedPayloadSchema', () => {
  const valid = {
    celebrationId: 'c1',
    parishId: 'p1',
    title: 'Messe',
    date: '2026-10-04T09:00:00.000Z',
    publishedAt: '2026-09-30T18:00:00.000Z',
  };

  it('accepte un payload complet', () => {
    expect(celebrationPublishedPayloadSchema.safeParse(valid).success).toBe(true);
  });

  it('rejette un payload sans celebrationId', () => {
    const { celebrationId: _omit, ...rest } = valid;
    expect(celebrationPublishedPayloadSchema.safeParse(rest).success).toBe(false);
  });

  it('rejette une date non ISO', () => {
    expect(celebrationPublishedPayloadSchema.safeParse({ ...valid, date: 'demain' }).success).toBe(
      false,
    );
  });
});
