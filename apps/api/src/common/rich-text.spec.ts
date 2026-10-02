import { sanitizeRichText } from './rich-text';

const PNG = 'data:image/png;base64,iVBORw0KGgo=';

describe('sanitizeRichText', () => {
  it('conserve la mise en forme autorisée', () => {
    const html =
      '<h2 style="text-align:center">Titre</h2><p><strong>gras</strong> <em>it</em> <u>so</u></p><ul><li>a</li></ul>';
    expect(sanitizeRichText(html)).toBe(html);
  });

  it('retire scripts, gestionnaires d’événements et styles dangereux', () => {
    const out = sanitizeRichText(
      '<p onclick="x()" style="position:fixed;color:#f00">Hi<script>alert(1)</script><iframe src="//x"></iframe></p>',
    );
    expect(out).toBe('<p style="color:#f00">Hi</p>');
  });

  it('bloque les liens javascript: et force noopener sur les liens', () => {
    expect(sanitizeRichText('<p><a href="javascript:alert(1)">x</a></p>')).toBe(
      '<p><a target="_blank" rel="noopener noreferrer">x</a></p>',
    );
    expect(sanitizeRichText('<p><a href="https://a.fr">x</a></p>')).toContain(
      'rel="noopener noreferrer"',
    );
  });

  it('accepte les images data:image et http(s), refuse le reste', () => {
    expect(sanitizeRichText(`<p>a</p><img src="${PNG}" data-width="50">`)).toContain(
      `src="${PNG}"`,
    );
    expect(sanitizeRichText('<p>a</p><img src="https://a.fr/x.png">')).toContain(
      '<img src="https://a.fr/x.png"',
    );
    expect(sanitizeRichText('<p>a</p><img src="data:image/svg+xml;base64,AAAA">')).toBe('<p>a</p>');
    expect(sanitizeRichText('<p>a</p><img src="javascript:alert(1)">')).toBe('<p>a</p>');
    expect(sanitizeRichText(`<p>a</p><img src="${PNG}" data-width="999">`)).not.toContain(
      'data-width',
    );
  });

  it('convertit un ancien texte brut en HTML échappé', () => {
    expect(sanitizeRichText('Bonjour <b>\nligne 2\n\nSuite')).toBe(
      '<p>Bonjour &lt;b&gt;<br />ligne 2</p><p>Suite</p>',
    );
  });
});
