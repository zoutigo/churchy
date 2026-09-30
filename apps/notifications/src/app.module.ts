import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from '@churchy/contracts';
import { NotificationsProcessor } from './notifications.processor';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6380),
      },
    }),
    BullModule.registerQueue({ name: QUEUES.NOTIFICATIONS }),
  ],
  providers: [NotificationsProcessor],
})
export class AppModule {}
