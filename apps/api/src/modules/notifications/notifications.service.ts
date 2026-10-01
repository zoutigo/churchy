import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  AuthLinkEmailPayload,
  CelebrationPublishedPayload,
  ContactMessagePayload,
  NotificationJob,
  QUEUES,
} from '@churchy/contracts';

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

  // Les liens contiennent un jeton : on ne garde pas le job une fois traité, et peu de temps en cas d'échec.
  private static readonly AUTH_EMAIL_JOB_OPTIONS = {
    removeOnComplete: true,
    removeOnFail: { age: 3600 },
  };

  emailVerificationRequested(payload: AuthLinkEmailPayload) {
    return this.queue.add(
      NotificationJob.EMAIL_VERIFICATION_REQUESTED,
      payload,
      NotificationsService.AUTH_EMAIL_JOB_OPTIONS,
    );
  }

  passwordResetRequested(payload: AuthLinkEmailPayload) {
    return this.queue.add(
      NotificationJob.PASSWORD_RESET_REQUESTED,
      payload,
      NotificationsService.AUTH_EMAIL_JOB_OPTIONS,
    );
  }

  /** Message d'un visiteur anonyme : données personnelles, donc conservées le moins longtemps possible. */
  contactMessageReceived(payload: ContactMessagePayload) {
    return this.queue.add(NotificationJob.CONTACT_MESSAGE_RECEIVED, payload, {
      removeOnComplete: true,
      removeOnFail: { age: 86400 },
    });
  }
}
