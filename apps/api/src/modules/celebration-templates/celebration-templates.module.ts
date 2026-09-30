import { Module } from '@nestjs/common';
import { CelebrationTemplatesController } from './celebration-templates.controller';
import { CelebrationTemplatesService } from './celebration-templates.service';

@Module({
  controllers: [CelebrationTemplatesController],
  providers: [CelebrationTemplatesService],
  exports: [CelebrationTemplatesService],
})
export class CelebrationTemplatesModule {}
