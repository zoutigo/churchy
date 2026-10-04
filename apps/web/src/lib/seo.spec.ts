import { describe, expect, it } from 'vitest';
import { parishMetadata, plainDescription } from './seo';

describe('plainDescription', () => {
  it('retire les balises et réduit les espaces', () => {
    expect(plainDescription('<p>Une  paroisse</p><p>vivante&nbsp;!</p>')).toBe(
      'Une paroisse vivante !',
    );
  });

  it('tronque les textes longs avec une ellipse', () => {
    const out = plainDescription('mot '.repeat(100), 50);
    expect(out.length).toBeLessThanOrEqual(50);
    expect(out.endsWith('…')).toBe(true);
  });

  it('gère l’absence de description', () => {
    expect(plainDescription(null)).toBe('');
    expect(plainDescription(undefined)).toBe('');
  });
});

describe('parishMetadata', () => {
  const parish = { id: 'p1', name: 'Saint-Pierre', city: 'Lyon', description: null };

  it('titre, URL canonique et aperçu de partage par id', () => {
    const m = parishMetadata(parish);
    expect(m.title).toBe('Saint-Pierre — Churchy');
    expect(m.alternates?.canonical).toBe('/paroisses/p1');
    expect(m.openGraph).toMatchObject({
      url: '/paroisses/p1',
      title: 'Saint-Pierre — Churchy',
      siteName: 'Churchy',
    });
    expect(m.twitter).toMatchObject({ card: 'summary_large_image', images: ['/opengraph-image'] });
    expect(m.openGraph).toMatchObject({
      images: [{ url: '/opengraph-image', width: 1200, height: 630 }],
    });
  });

  it('sans description : phrase de repli avec le nom et la ville', () => {
    expect(parishMetadata(parish).description).toBe(
      'Messes, annonces et activités de Saint-Pierre (Lyon).',
    );
  });

  it('utilise la description publique, débarrassée de son HTML', () => {
    const m = parishMetadata({ ...parish, description: '<p>Une paroisse <b>vivante</b>.</p>' });
    expect(m.description).toBe('Une paroisse vivante.');
    expect(m.openGraph?.description).toBe(m.description);
  });
});
