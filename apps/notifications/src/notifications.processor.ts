import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
  NotificationJob,
  QUEUES,
  authLinkEmailPayloadSchema,
  celebrationPublishedPayloadSchema,
  contactMessagePayloadSchema,
  smsPayloadSchema,
} from '@churchy/contracts';
import {
  contactMessageEmail,
  emailVerificationEmail,
  passwordResetEmail,
  pinResetEmail,
} from './email-templates';
import { MailService } from './mail.service';
import { SmsService } from './sms.service';

/**
 * Consommateur de la file `notifications` (microservice autonome, sans HTTP).
 * Un payload invalide lève une erreur : BullMQ réessaie puis marque le job en échec.
 */
@Processor(QUEUES.NOTIFICATIONS)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly mail: MailService,
    private readonly sms: SmsService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case NotificationJob.CELEBRATION_PUBLISHED: {
        const payload = celebrationPublishedPayloadSchema.parse(job.data);
        // TODO: prévenir les membres et abonnés de la paroisse (email / push) — à définir.
        this.logger.log(
          `Célébration publiée « ${payload.title} » (paroisse ${payload.parishId}) — notification à envoyer`,
        );
        return;
      }
      case NotificationJob.EMAIL_VERIFICATION_REQUESTED: {
        const payload = authLinkEmailPayloadSchema.parse(job.data);
        await this.mail.send(payload.email, emailVerificationEmail(payload));
        return;
      }
      case NotificationJob.PASSWORD_RESET_REQUESTED: {
        const payload = authLinkEmailPayloadSchema.parse(job.data);
        await this.mail.send(payload.email, passwordResetEmail(payload));
        return;
      }
      case NotificationJob.PIN_RESET_REQUESTED: {
        const payload = authLinkEmailPayloadSchema.parse(job.data);
        await this.mail.send(payload.email, pinResetEmail(payload));
        return;
      }
      case NotificationJob.SMS_REQUESTED: {
        const payload = smsPayloadSchema.parse(job.data);
        await this.sms.send(payload.to, payload.body);
        return;
      }
      case NotificationJob.CONTACT_MESSAGE_RECEIVED: {
        const payload = contactMessagePayloadSchema.parse(job.data);
        await this.mail.send(
          process.env.CONTACT_EMAIL ?? 'contact@churchy.local',
          contactMessageEmail(payload),
        );
        return;
      }
      default:
        this.logger.warn(`Job inconnu ignoré : ${job.name}`);
    }
  }
}
