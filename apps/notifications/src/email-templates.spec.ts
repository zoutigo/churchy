import { emailVerificationEmail, escapeHtml, passwordResetEmail } from './email-templates';

const payload = {
  email: 'jean@paroisse.fr',
  firstName: 'Jean',
  url: 'http://localhost:3200/reset-password?token=abc&x=1',
  expiresAt: '2026-10-01T10:00:00.000Z',
};

describe('email templates', () => {
  it('escapeHtml neutralise le HTML', () => {
    expect(escapeHtml(`<script>alert("x")</script> & 'y'`)).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39;',
    );
  });

  it.each([
    ['vérification', emailVerificationEmail],
    ['réinitialisation', passwordResetEmail],
  ])('email de %s : sujet, texte et HTML contiennent le lien', (_label, build) => {
    const mail = build(payload);
    expect(mail.subject).toMatch(/Churchy/);
    expect(mail.text).toContain(payload.url);
    // Dans le HTML, l'URL est échappée (& → &amp;) pour rester valide.
    expect(mail.html).toContain('http://localhost:3200/reset-password?token=abc&amp;x=1');
  });

  it('échappe le prénom (aucune injection HTML possible via le profil)', () => {
    const mail = passwordResetEmail({ ...payload, firstName: '<img src=x onerror=alert(1)>' });
    expect(mail.html).not.toContain('<img src=x');
    expect(mail.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });
});
