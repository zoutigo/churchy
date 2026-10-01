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

const formatExpiry = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });

function layout(title: string, intro: string, cta: string, url: string, expiry: string) {
  const safeUrl = escapeHtml(url);
  return `<!doctype html>
<html lang="fr"><body style="margin:0;background:#f7f3e8;font-family:Arial,sans-serif;color:#2b2112">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;padding:32px">
      <tr><td style="font-size:20px;font-weight:bold;color:#2f6b47">✦ Churchy</td></tr>
      <tr><td style="padding-top:16px;font-size:18px;font-weight:bold">${title}</td></tr>
      <tr><td style="padding-top:12px;line-height:1.5">${intro}</td></tr>
      <tr><td style="padding:24px 0"><a href="${safeUrl}" style="background:#2f6b47;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;display:inline-block">${cta}</a></td></tr>
      <tr><td style="font-size:13px;color:#6b6252;line-height:1.5">Ce lien expire le ${expiry}.<br>Si le bouton ne fonctionne pas, copiez cette adresse dans votre navigateur :<br>${safeUrl}</td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

export function emailVerificationEmail(p: AuthLinkEmailPayload): EmailContent {
  const name = escapeHtml(p.firstName);
  const expiry = formatExpiry(p.expiresAt);
  return {
    subject: 'Confirmez votre adresse email — Churchy',
    text: `Bonjour ${p.firstName},\n\nConfirmez votre adresse email en ouvrant ce lien :\n${p.url}\n\nCe lien expire le ${expiry}.\nSi vous n'êtes pas à l'origine de cette inscription, ignorez ce message.`,
    html: layout(
      'Confirmez votre adresse email',
      `Bonjour ${name},<br>merci de votre inscription sur Churchy. Confirmez votre adresse email pour sécuriser votre compte.`,
      'Confirmer mon email',
      p.url,
      expiry,
    ),
  };
}

export function passwordResetEmail(p: AuthLinkEmailPayload): EmailContent {
  const name = escapeHtml(p.firstName);
  const expiry = formatExpiry(p.expiresAt);
  return {
    subject: 'Réinitialisation de votre mot de passe — Churchy',
    text: `Bonjour ${p.firstName},\n\nPour choisir un nouveau mot de passe, ouvrez ce lien :\n${p.url}\n\nCe lien expire le ${expiry}.\nSi vous n'avez pas demandé cette réinitialisation, ignorez ce message : votre mot de passe reste inchangé.`,
    html: layout(
      'Réinitialisation de votre mot de passe',
      `Bonjour ${name},<br>vous avez demandé à réinitialiser votre mot de passe. Si ce n'est pas vous, ignorez ce message : votre mot de passe reste inchangé.`,
      'Choisir un nouveau mot de passe',
      p.url,
      expiry,
    ),
  };
}

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
    text: `Message reçu le ${formatExpiry(p.receivedAt)}\nDe : ${safeName} <${p.email}>\nSujet : ${topic}\n\n${p.message}`,
    html: `<!doctype html><html lang="fr"><body style="font-family:Arial,sans-serif;color:#2b2112">
  <p style="font-weight:bold;color:#2f6b47">✦ Churchy — nouveau message de contact</p>
  <p><strong>De :</strong> ${escapeHtml(safeName)} &lt;${escapeHtml(p.email)}&gt;<br><strong>Sujet :</strong> ${topic}</p>
  <p style="white-space:pre-wrap;line-height:1.5">${escapeHtml(p.message)}</p>
</body></html>`,
  };
}
