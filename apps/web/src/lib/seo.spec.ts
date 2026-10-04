import { describe, expect, it } from 'vitest';
import { pageMetadata, parishMetadata, plainDescription } from './seo';

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

  it('en anglais : URL traduite, hreflang vers les deux versions, og:locale', () => {
    const m = parishMetadata(parish, 'en');
    expect(m.alternates?.canonical).toBe('/en/parishes/p1');
    expect(m.alternates?.languages).toEqual({
      fr: '/fr/paroisses/p1',
      en: '/en/parishes/p1',
      'x-default': '/fr/paroisses/p1',
    });
    expect(m.openGraph).toMatchObject({ locale: 'en_US', url: '/en/parishes/p1' });
  });

  it('titre, URL canonique et aperçu de partage par id', () => {
    const m = parishMetadata(parish);
    expect(m.title).toBe('Saint-Pierre — Churchy');
    expect(m.alternates?.canonical).toBe('/fr/paroisses/p1');
    expect(m.openGraph).toMatchObject({
      url: '/fr/paroisses/p1',
      title: 'Saint-Pierre — Churchy',
      siteName: 'Churchy',
    });
    expect(m.twitter).toMatchObject({
      card: 'summary_large_image',
      images: ['/fr/opengraph-image'],
    });
    expect(m.openGraph).toMatchObject({
      images: [{ url: '/fr/opengraph-image', width: 1200, height: 630 }],
    });
  });

  it('en anglais : image d’aperçu et phrase de repli dans la langue de la page', () => {
    const m = parishMetadata(parish, 'en');
    expect(m.description).toBe('Masses, announcements and activities of Saint-Pierre (Lyon).');
    expect(m.openGraph).toMatchObject({
      alternateLocale: ['fr_FR'],
      images: [{ url: '/en/opengraph-image' }],
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

describe('pageMetadata', () => {
  it('donne canonical, hreflang, Open Graph et Twitter pour une page statique traduite', () => {
    const m = pageMetadata({ locale: 'en', path: '/a-propos', title: 'About', description: 'd' });
    expect(m.alternates).toEqual({
      canonical: '/en/about',
      languages: { fr: '/fr/a-propos', en: '/en/about', 'x-default': '/fr/a-propos' },
    });
    expect(m.openGraph).toMatchObject({ url: '/en/about', title: 'About', locale: 'en_US' });
    expect(m.twitter).toMatchObject({ images: ['/en/opengraph-image'] });
  });
});
