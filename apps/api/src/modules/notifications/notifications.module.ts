import { Module } from '@nestjs/common';
import { QueueModule } from '../../queue/queue.module';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [QueueModule],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
