import {
  contactMessageEmail,
  emailVerificationEmail,
  escapeHtml,
  passwordResetEmail,
} from './email-templates';

const payload = {
  email: 'jean@paroisse.fr',
  firstName: 'Jean',
  url: 'http://localhost:3200/fr/reinitialisation?token=abc&x=1',
  locale: 'fr' as const,
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
    expect(mail.html).toContain('http://localhost:3200/fr/reinitialisation?token=abc&amp;x=1');
  });

  it('échappe le prénom (aucune injection HTML possible via le profil)', () => {
    const mail = passwordResetEmail({ ...payload, firstName: '<img src=x onerror=alert(1)>' });
    expect(mail.html).not.toContain('<img src=x');
    expect(mail.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });
});

describe('email templates en anglais', () => {
  const en = {
    ...payload,
    locale: 'en' as const,
    url: 'http://localhost:3200/en/reset-password?token=abc',
  };

  it('vérification : sujet, texte, HTML et date en anglais', () => {
    const mail = emailVerificationEmail(en);
    expect(mail.subject).toBe('Confirm your email address — Churchy');
    expect(mail.text).toContain('Hello Jean');
    expect(mail.text).toContain('This link expires on 1 October 2026');
    expect(mail.html).toContain('<html lang="en">');
    expect(mail.html).toContain('Confirm my email');
    expect(mail.html).not.toMatch(/Bonjour|expire le/);
  });

  it('réinitialisation : en anglais, avec le lien de la langue', () => {
    const mail = passwordResetEmail(en);
    expect(mail.subject).toBe('Reset your password — Churchy');
    expect(mail.text).toContain(en.url);
    expect(mail.html).toContain('Choose a new password');
  });

  it('en français par défaut, jamais de mélange', () => {
    const mail = passwordResetEmail(payload);
    expect(mail.subject).toBe('Réinitialisation de votre mot de passe — Churchy');
    expect(mail.html).toContain('<html lang="fr">');
    expect(mail.text).toContain('Bonjour Jean');
    expect(mail.text).not.toMatch(/Hello|expires on/);
  });

  it('échappe aussi le prénom en anglais', () => {
    expect(passwordResetEmail({ ...en, firstName: '<b>x</b>' }).html).toContain(
      '&lt;b&gt;x&lt;/b&gt;',
    );
  });
});

describe('contactMessageEmail', () => {
  const message = {
    name: 'Marie',
    email: 'marie@exemple.fr',
    topic: 'PROBLEM' as const,
    message: 'Ça ne marche pas',
    receivedAt: '2026-10-01T10:00:00.000Z',
  };

  it('répond à l’expéditeur et indique le sujet', () => {
    const mail = contactMessageEmail(message);
    expect(mail.replyTo).toBe('marie@exemple.fr');
    expect(mail.subject).toContain('Problème');
    expect(mail.text).toContain('Ça ne marche pas');
  });

  it('échappe le HTML venant du visiteur (nom, email, message)', () => {
    const mail = contactMessageEmail({
      ...message,
      name: '<b>Marie</b>',
      message: '<script>alert(1)</script>',
    });
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).not.toContain('<b>Marie</b>');
    expect(mail.html).toContain('&lt;script&gt;');
  });

  it('empêche l’injection d’en-tête par un saut de ligne dans le nom', () => {
    const mail = contactMessageEmail({ ...message, name: 'Marie\r\nBcc: x@y.z' });
    expect(mail.subject).not.toMatch(/[\r\n]/);
  });
});
