import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { EmailContent } from './email-templates';

export const MAIL_TRANSPORT = 'MAIL_TRANSPORT';

/** Transport SMTP configuré par l'environnement (Mailpit en local : localhost:1025). */
export function createSmtpTransport(env: NodeJS.ProcessEnv = process.env): nodemailer.Transporter {
  return nodemailer.createTransport({
    host: env.SMTP_HOST ?? 'localhost',
    port: Number(env.SMTP_PORT ?? 1025),
    secure: env.SMTP_SECURE === 'true',
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD ?? '' } : undefined,
  });
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly transport: nodemailer.Transporter,
    private readonly from: string = process.env.MAIL_FROM ?? 'Churchy <no-reply@churchy.local>',
  ) {}

  async send(to: string, content: EmailContent): Promise<void> {
    await this.transport.sendMail({
      from: this.from,
      to,
      subject: content.subject,
      text: content.text,
      html: content.html,
    });
    // On ne journalise jamais le contenu (il contient un lien à usage unique).
    this.logger.log(`Email « ${content.subject} » envoyé à ${to}`);
  }
}
