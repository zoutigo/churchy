import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CelebrationPublishedPayload, NotificationJob, QUEUES } from '@churchy/contracts';

/** Producteur : les autres modules passent par ce service pour enfiler des jobs. */
@Injectable()
export class NotificationsService {
  constructor(@InjectQueue(QUEUES.NOTIFICATIONS) private readonly queue: Queue) {}

  celebrationPublished(payload: CelebrationPublishedPayload) {
    return this.queue.add(NotificationJob.CELEBRATION_PUBLISHED, payload, {
      // BullMQ interdit ':' dans un jobId ; l'id rend l'enfilage idempotent
      jobId: `celebration-published-${payload.celebrationId}`,
    });
  }
}
