import { Module } from '@nestjs/common';
import { CelebrationsController } from './celebrations.controller';
import { CelebrationsService } from './celebrations.service';
import { SheetsController } from './sheets.controller';
import { SheetsService } from './sheets.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [CelebrationsController, SheetsController],
  providers: [CelebrationsService, SheetsService],
})
export class CelebrationsModule {}
