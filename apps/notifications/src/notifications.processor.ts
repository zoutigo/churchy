import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
  NotificationJob,
  QUEUES,
  authLinkEmailPayloadSchema,
  celebrationPublishedPayloadSchema,
} from '@churchy/contracts';
import { emailVerificationEmail, passwordResetEmail } from './email-templates';
import { MailService } from './mail.service';

/**
 * Consommateur de la file `notifications` (microservice autonome, sans HTTP).
 * Un payload invalide lève une erreur : BullMQ réessaie puis marque le job en échec.
 */
@Processor(QUEUES.NOTIFICATIONS)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private readonly mail: MailService) {
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
      default:
        this.logger.warn(`Job inconnu ignoré : ${job.name}`);
    }
  }
}
