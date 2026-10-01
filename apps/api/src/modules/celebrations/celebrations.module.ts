import { Module } from '@nestjs/common';
import { CelebrationsController } from './celebrations.controller';
import { CelebrationsService } from './celebrations.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [CelebrationsController],
  providers: [CelebrationsService],
})
export class CelebrationsModule {}
