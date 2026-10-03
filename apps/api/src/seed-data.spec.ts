/* Garde-fous des données de démonstration (scripts/seed) : elles doivent rester réalistes et valides. */
import {
  ContentType,
  createActivitySchema,
  createAnnouncementSchema,
  createContentSchema,
} from '@churchy/shared';
import { sanitizeRichText } from './common/rich-text';

/* eslint-disable @typescript-eslint/no-require-imports */
/** sanitize-html écrit `<br />` : même HTML, autre sérialisation. */
const norm = (html: string) => html.replace(/<br \/>/g, '<br>');
const TYPES: Record<string, [string, string][]> = {
  SONG: require('../scripts/seed/songs'),
  PSALM: require('../scripts/seed/psalms'),
  GOSPEL: require('../scripts/seed/gospels'),
  READING: require('../scripts/seed/readings'),
  PRAYER: require('../scripts/seed/prayers'),
  UNIVERSAL_PRAYER: require('../scripts/seed/universal'),
  ANNOUNCEMENT: require('../scripts/seed/announcement-texts'),
  FREE_TEXT: require('../scripts/seed/free-texts'),
};
const news = require('../scripts/seed/news') as {
  announcements: [string, string, string[], number][];
  activities: [string, string[], string, number, number, number][];
  at: (d: number, h: number, m: number) => Date;
};

describe('données de démonstration', () => {
  it('couvrent tous les types de contenu, 20 de chacun', () => {
    expect(Object.keys(TYPES).sort()).toEqual(Object.values(ContentType).sort());
    for (const [type, items] of Object.entries(TYPES))
      expect([type, items.length]).toEqual([type, 20]);
  });

  it.each(Object.entries(TYPES))(
    '%s : titres uniques, valides, et textes étoffés',
    (type, items) => {
      expect(new Set(items.map((i) => i[0])).size).toBe(items.length);
      for (const [title, body] of items) {
        const parsed = createContentSchema.safeParse({ title, type, body });
        expect([title, parsed.success]).toEqual([title, true]);
        // HTML déjà conforme à la liste blanche : l'API ne le modifierait pas à l'écriture
        expect([title, norm(sanitizeRichText(body))]).toEqual([title, body]);
        expect([title, body.length > 120]).toEqual([title, true]);
      }
    },
  );

  it('vingt annonces publiques valides, aux titres uniques, publiées de plus en plus tôt', () => {
    const { announcements } = news;
    expect(announcements.length).toBeGreaterThanOrEqual(20);
    expect(new Set(announcements.map((a) => a[0])).size).toBe(announcements.length);
    for (const [title, summary, paras] of announcements) {
      const body = paras.join('');
      expect(createAnnouncementSchema.safeParse({ title, summary, body }).success).toBe(true);
      expect(norm(sanitizeRichText(body))).toBe(body);
      expect(body.length).toBeGreaterThan(100);
    }
  });

  it('au moins quinze activités valides, à venir, avec un lieu', () => {
    const { activities, at } = news;
    expect(activities.length).toBeGreaterThanOrEqual(15);
    expect(new Set(activities.map((a) => a[0])).size).toBe(activities.length);
    for (const [title, paras, location, days, h, m] of activities) {
      const description = paras.join('');
      const startsAt = at(days, h, m);
      expect(
        createActivitySchema.safeParse({
          title,
          description,
          location,
          startsAt: startsAt.toISOString(),
        }).success,
      ).toBe(true);
      expect(norm(sanitizeRichText(description))).toBe(description);
      expect(location.length).toBeGreaterThan(3);
      expect(days).toBeGreaterThan(0);
    }
  });
});
