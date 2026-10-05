import type { AuthLinkEmailPayload, ContactMessagePayload } from '@churchy/contracts';

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
  /** Adresse à laquelle répondre (ex. l'expéditeur d'un message de contact). */
  replyTo?: string;
}

/** Les prénoms viennent d'utilisateurs : toujours échapper avant de les mettre dans du HTML. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

type Lang = AuthLinkEmailPayload['locale'];

const DATE_LOCALES: Record<Lang, string> = { fr: 'fr-FR', en: 'en-GB' };

const formatDate = (iso: string, lang: Lang = 'fr') =>
  new Date(iso).toLocaleString(DATE_LOCALES[lang], { dateStyle: 'long', timeStyle: 'short' });

/** Textes d'un email à lien, dans chaque langue (le français reste la langue par défaut). */
const AUTH_TEXTS = {
  fr: {
    hello: (name: string) => `Bonjour ${name}`,
    expires: (date: string) => `Ce lien expire le ${date}.`,
    copy: 'Si le bouton ne fonctionne pas, copiez cette adresse dans votre navigateur :',
    verification: {
      subject: 'Confirmez votre adresse email — Churchy',
      title: 'Confirmez votre adresse email',
      intro:
        'merci de votre inscription sur Churchy. Confirmez votre adresse email pour sécuriser votre compte.',
      cta: 'Confirmer mon email',
      textIntro: 'Confirmez votre adresse email en ouvrant ce lien :',
      ignore: "Si vous n'êtes pas à l'origine de cette inscription, ignorez ce message.",
    },
    reset: {
      subject: 'Réinitialisation de votre mot de passe — Churchy',
      title: 'Réinitialisation de votre mot de passe',
      intro:
        "vous avez demandé à réinitialiser votre mot de passe. Si ce n'est pas vous, ignorez ce message : votre mot de passe reste inchangé.",
      cta: 'Choisir un nouveau mot de passe',
      textIntro: 'Pour choisir un nouveau mot de passe, ouvrez ce lien :',
      ignore:
        "Si vous n'avez pas demandé cette réinitialisation, ignorez ce message : votre mot de passe reste inchangé.",
    },
    pinReset: {
      subject: 'Réinitialisation de votre PIN — Churchy',
      title: 'Réinitialisation de votre PIN',
      intro:
        "vous avez demandé à réinitialiser le PIN de connexion par téléphone. Si ce n'est pas vous, ignorez ce message : votre PIN reste inchangé.",
      cta: 'Choisir un nouveau PIN',
      textIntro: 'Pour choisir un nouveau PIN, ouvrez ce lien :',
      ignore:
        "Si vous n'avez pas demandé cette réinitialisation, ignorez ce message : votre PIN reste inchangé.",
    },
  },
  en: {
    hello: (name: string) => `Hello ${name}`,
    expires: (date: string) => `This link expires on ${date}.`,
    copy: "If the button doesn't work, copy this address into your browser:",
    verification: {
      subject: 'Confirm your email address — Churchy',
      title: 'Confirm your email address',
      intro:
        'thank you for signing up to Churchy. Confirm your email address to secure your account.',
      cta: 'Confirm my email',
      textIntro: 'Confirm your email address by opening this link:',
      ignore: "If you didn't create this account, ignore this message.",
    },
    reset: {
      subject: 'Reset your password — Churchy',
      title: 'Reset your password',
      intro:
        "you asked to reset your password. If this wasn't you, ignore this message: your password stays unchanged.",
      cta: 'Choose a new password',
      textIntro: 'To choose a new password, open this link:',
      ignore:
        "If you didn't request this reset, ignore this message: your password stays unchanged.",
    },
    pinReset: {
      subject: 'Reset your PIN — Churchy',
      title: 'Reset your PIN',
      intro:
        "you asked to reset your phone sign-in PIN. If this wasn't you, ignore this message: your PIN stays unchanged.",
      cta: 'Choose a new PIN',
      textIntro: 'To choose a new PIN, open this link:',
      ignore: "If you didn't request this reset, ignore this message: your PIN stays unchanged.",
    },
  },
} as const;

function layout(
  lang: Lang,
  title: string,
  intro: string,
  cta: string,
  url: string,
  expiry: string,
) {
  const safeUrl = escapeHtml(url);
  const t = AUTH_TEXTS[lang];
  return `<!doctype html>
<html lang="${lang}"><body style="margin:0;background:#f7f3e8;font-family:Arial,sans-serif;color:#2b2112">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;padding:32px">
      <tr><td style="font-size:20px;font-weight:bold;color:#2f6b47">✦ Churchy</td></tr>
      <tr><td style="padding-top:16px;font-size:18px;font-weight:bold">${title}</td></tr>
      <tr><td style="padding-top:12px;line-height:1.5">${intro}</td></tr>
      <tr><td style="padding:24px 0"><a href="${safeUrl}" style="background:#2f6b47;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block">${cta}</a></td></tr>
      <tr><td style="font-size:13px;color:#6b6252;line-height:1.5">${t.expires(expiry)}<br>${t.copy}<br>${safeUrl}</td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

function authEmail(
  kind: 'verification' | 'reset' | 'pinReset',
  p: AuthLinkEmailPayload,
): EmailContent {
  const lang = p.locale ?? 'fr';
  const t = AUTH_TEXTS[lang];
  const k = t[kind];
  const expiry = formatDate(p.expiresAt, lang);
  return {
    subject: k.subject,
    text: `${t.hello(p.firstName)},\n\n${k.textIntro}\n${p.url}\n\n${t.expires(expiry)}\n${k.ignore}`,
    html: layout(
      lang,
      k.title,
      `${t.hello(escapeHtml(p.firstName))},<br>${k.intro}`,
      k.cta,
      p.url,
      expiry,
    ),
  };
}

export const emailVerificationEmail = (p: AuthLinkEmailPayload) => authEmail('verification', p);
export const passwordResetEmail = (p: AuthLinkEmailPayload) => authEmail('reset', p);
export const pinResetEmail = (p: AuthLinkEmailPayload) => authEmail('pinReset', p);

const CONTACT_TOPIC_LABELS: Record<ContactMessagePayload['topic'], string> = {
  QUESTION: 'Question',
  PARISH: 'Paroisse',
  PROBLEM: 'Problème',
  OTHER: 'Autre',
};

/** Message de la page Contact, à destination de l'équipe : tout le contenu vient d'un visiteur anonyme. */
export function contactMessageEmail(p: ContactMessagePayload): EmailContent {
  const topic = CONTACT_TOPIC_LABELS[p.topic];
  // Un nom contenant un saut de ligne ne doit pas pouvoir injecter d'en-tête dans le sujet.
  const safeName = p.name.replace(/[\r\n]+/g, ' ').trim();
  return {
    subject: `[Contact · ${topic}] ${safeName}`,
    replyTo: p.email,
    text: `Message reçu le ${formatDate(p.receivedAt)}\nDe : ${safeName} <${p.email}>\nSujet : ${topic}\n\n${p.message}`,
    html: `<!doctype html><html lang="fr"><body style="font-family:Arial,sans-serif;color:#2b2112">
  <p style="font-weight:bold;color:#2f6b47">✦ Churchy — nouveau message de contact</p>
  <p><strong>De :</strong> ${escapeHtml(safeName)} &lt;${escapeHtml(p.email)}&gt;<br><strong>Sujet :</strong> ${topic}</p>
  <p style="white-space:pre-wrap;line-height:1.5">${escapeHtml(p.message)}</p>
</body></html>`,
  };
}
