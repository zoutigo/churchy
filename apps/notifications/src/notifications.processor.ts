import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
  NotificationJob,
  QUEUES,
  celebrationPublishedPayloadSchema,
} from '@churchy/contracts';

/**
 * Consommateur de la file `notifications` (microservice autonome, sans HTTP).
 */
@Processor(QUEUES.NOTIFICATIONS)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case NotificationJob.CELEBRATION_PUBLISHED: {
        const payload = celebrationPublishedPayloadSchema.parse(job.data);
        // TODO: envoyer les notifications réelles (email / push) aux membres de la paroisse
        this.logger.log(
          `Célébration publiée « ${payload.title} » (paroisse ${payload.parishId}) — notification à envoyer`,
        );
        return;
      }
      default:
        this.logger.warn(`Job inconnu ignoré : ${job.name}`);
    }
  }
}
