import { describe, expect, it } from 'vitest';
import {
  NotificationJob,
  QUEUES,
  authLinkEmailPayloadSchema,
  celebrationPublishedPayloadSchema,
  contactMessagePayloadSchema,
} from './index';

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
    occurrenceId: 'o1',
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

  it('rejette un payload sans occurrenceId (la publication concerne une date, pas la série)', () => {
    const { occurrenceId: _omit, ...rest } = valid;
    expect(celebrationPublishedPayloadSchema.safeParse(rest).success).toBe(false);
  });

  it('rejette une date non ISO', () => {
    expect(celebrationPublishedPayloadSchema.safeParse({ ...valid, date: 'demain' }).success).toBe(
      false,
    );
  });
});

describe('authLinkEmailPayloadSchema', () => {
  const valid = {
    email: 'jean@paroisse.fr',
    firstName: 'Jean',
    url: 'http://localhost:3200/reset-password?token=abc',
    expiresAt: '2026-10-01T10:00:00.000Z',
  };

  it('accepte un payload complet', () => {
    expect(authLinkEmailPayloadSchema.safeParse(valid).success).toBe(true);
  });

  it('la langue vaut français par défaut (ancien job), accepte en, refuse le reste', () => {
    expect(authLinkEmailPayloadSchema.parse(valid).locale).toBe('fr');
    expect(authLinkEmailPayloadSchema.parse({ ...valid, locale: 'en' }).locale).toBe('en');
    expect(authLinkEmailPayloadSchema.safeParse({ ...valid, locale: 'es' }).success).toBe(false);
  });

  it('rejette une url invalide ou un email invalide', () => {
    expect(authLinkEmailPayloadSchema.safeParse({ ...valid, url: 'pas-une-url' }).success).toBe(
      false,
    );
    expect(authLinkEmailPayloadSchema.safeParse({ ...valid, email: 'nope' }).success).toBe(false);
  });
});

describe('contactMessagePayloadSchema', () => {
  const valid = {
    name: 'Marie',
    email: 'marie@exemple.fr',
    topic: 'QUESTION',
    message: 'Bonjour',
    receivedAt: '2026-10-01T10:00:00.000Z',
  };

  it('accepte un payload complet', () => {
    expect(contactMessagePayloadSchema.safeParse(valid).success).toBe(true);
  });

  it('rejette un sujet inconnu, un email invalide ou un message vide', () => {
    expect(contactMessagePayloadSchema.safeParse({ ...valid, topic: 'SPAM' }).success).toBe(false);
    expect(contactMessagePayloadSchema.safeParse({ ...valid, email: 'nope' }).success).toBe(false);
    expect(contactMessagePayloadSchema.safeParse({ ...valid, message: '' }).success).toBe(false);
  });
});
