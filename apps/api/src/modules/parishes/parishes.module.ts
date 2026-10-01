import { Module } from '@nestjs/common';
import { ParishesController } from './parishes.controller';
import { ParishesService } from './parishes.service';

@Module({
  controllers: [ParishesController],
  providers: [ParishesService],
})
export class ParishesModule {}
