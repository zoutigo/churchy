import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from '@churchy/contracts';
import { createSmtpTransport, MAIL_TRANSPORT, MailService } from './mail.service';
import { NotificationsProcessor } from './notifications.processor';
import { createSmsProvider, SMS_PROVIDER, SmsService, type SmsProvider } from './sms.service';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'localhost',
        port: Number(process.env.REDIS_PORT ?? 6380),
        db: Number(process.env.REDIS_DB ?? 0),
      },
    }),
    BullModule.registerQueue({ name: QUEUES.NOTIFICATIONS }),
  ],
  providers: [
    { provide: MAIL_TRANSPORT, useFactory: () => createSmtpTransport() },
    {
      provide: MailService,
      inject: [MAIL_TRANSPORT],
      useFactory: (transport: ReturnType<typeof createSmtpTransport>) => new MailService(transport),
    },
    { provide: SMS_PROVIDER, useFactory: () => createSmsProvider() },
    {
      provide: SmsService,
      inject: [SMS_PROVIDER],
      useFactory: (provider: SmsProvider) => new SmsService(provider),
    },
    NotificationsProcessor,
  ],
})
export class AppModule {}
