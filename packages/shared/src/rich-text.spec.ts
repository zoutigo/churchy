import { describe, expect, it } from 'vitest';
import { createActivitySchema, createAnnouncementSchema } from './schemas';
import {
  hasRichContent,
  isRichHtml,
  plainTextToHtml,
  richTextToPlain,
  toRichHtml,
} from './rich-text';

describe('texte riche', () => {
  it('distingue le HTML de l’éditeur d’un ancien texte brut', () => {
    expect(isRichHtml('<p>Bonjour</p>')).toBe(true);
    expect(isRichHtml('  <h2>Titre</h2>')).toBe(true);
    expect(isRichHtml('Bonjour <b>')).toBe(false);
  });

  it('convertit le texte brut en HTML échappé', () => {
    expect(plainTextToHtml('a < b\nsuite\n\nautre')).toBe('<p>a &lt; b<br>suite</p><p>autre</p>');
    expect(toRichHtml('<p>x</p>')).toBe('<p>x</p>');
  });

  it('extrait le texte brut', () => {
    expect(richTextToPlain('<p>Un&nbsp;<strong>deux</strong></p><p>trois &amp; quatre</p>')).toBe(
      'Un deux trois & quatre',
    );
  });

  it('considère vide un contenu sans texte ni image', () => {
    expect(hasRichContent('<p></p>')).toBe(false);
    expect(hasRichContent('   ')).toBe(false);
    expect(hasRichContent('<p>a</p>')).toBe(true);
    expect(hasRichContent('<p><img src="data:image/png;base64,AA"></p>')).toBe(true);
  });

  it('est appliqué aux annonces et activités', () => {
    expect(createAnnouncementSchema.safeParse({ title: 'T', body: '<p></p>' }).success).toBe(false);
    expect(createAnnouncementSchema.safeParse({ title: 'T', body: '<p>ok</p>' }).success).toBe(
      true,
    );
    expect(
      createActivitySchema.safeParse({
        title: 'T',
        description: '<p><img src="data:image/png;base64,AA"></p>',
        startsAt: '2027-01-01T10:00:00.000Z',
      }).success,
    ).toBe(true);
  });
});
