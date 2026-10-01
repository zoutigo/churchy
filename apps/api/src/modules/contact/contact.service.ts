import { Injectable } from '@nestjs/common';
import type { ContactMessageDto } from '@churchy/shared';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ContactService {
  constructor(private notifications: NotificationsService) {}

  async send(dto: ContactMessageDto) {
    // Piège à robots : le champ masqué est rempli → on répond « ok » sans rien transmettre.
    if (dto.website) return { sent: true };

    await this.notifications.contactMessageReceived({
      name: dto.name,
      email: dto.email,
      topic: dto.topic,
      message: dto.message,
      receivedAt: new Date().toISOString(),
    });
    return { sent: true };
  }
}
