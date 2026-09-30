import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { ParishesModule } from '../parishes/parishes.module';
import { CelebrationsModule } from '../celebrations/celebrations.module';

@Module({
  imports: [ParishesModule, CelebrationsModule],
  controllers: [PublicController],
})
export class PublicModule {}
