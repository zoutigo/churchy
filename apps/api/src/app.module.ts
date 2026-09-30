import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ParishesModule } from './modules/parishes/parishes.module';
import { ParishMembersModule } from './modules/parish-members/parish-members.module';
import { ContentsModule } from './modules/contents/contents.module';
import { CelebrationTemplatesModule } from './modules/celebration-templates/celebration-templates.module';
import { CelebrationsModule } from './modules/celebrations/celebrations.module';
import { PublicModule } from './modules/public/public.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    ParishesModule,
    ParishMembersModule,
    ContentsModule,
    CelebrationTemplatesModule,
    CelebrationsModule,
    PublicModule,
    HealthModule,
  ],
})
export class AppModule {}
