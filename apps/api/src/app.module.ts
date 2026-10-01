import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { env } from './config/env';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ParishesModule } from './modules/parishes/parishes.module';
import { ParishMembersModule } from './modules/parish-members/parish-members.module';
import { ContentsModule } from './modules/contents/contents.module';
import { CelebrationTemplatesModule } from './modules/celebration-templates/celebration-templates.module';
import { CelebrationsModule } from './modules/celebrations/celebrations.module';
import { AnnouncementsModule } from './modules/announcements/announcements.module';
import { ActivitiesModule } from './modules/activities/activities.module';
import { ContactModule } from './modules/contact/contact.module';
import { PublicModule } from './modules/public/public.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: env.THROTTLE_LIMIT }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    ParishesModule,
    ParishMembersModule,
    ContentsModule,
    CelebrationTemplatesModule,
    CelebrationsModule,
    AnnouncementsModule,
    ActivitiesModule,
    ContactModule,
    PublicModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
