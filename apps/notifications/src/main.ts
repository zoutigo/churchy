import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

/** Service sans HTTP : un simple worker BullMQ. */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  app.enableShutdownHooks();
  new Logger('Notifications').log('Worker démarré — en écoute sur la file « notifications »');
}

bootstrap();
