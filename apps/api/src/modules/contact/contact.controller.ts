import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { contactMessageSchema, type ContactMessageDto } from '@churchy/shared';
import { env } from '../../config/env';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ContactService } from './contact.service';

/** Route publique qui déclenche un email : même limite stricte que les routes d'authentification. */
const STRICT = { default: { limit: env.AUTH_THROTTLE_LIMIT, ttl: 60_000 } };

@ApiTags('contact')
@Controller('contact')
export class ContactController {
  constructor(private service: ContactService) {}

  @Post()
  @HttpCode(202)
  @Throttle(STRICT)
  send(@Body(new ZodValidationPipe(contactMessageSchema)) dto: ContactMessageDto) {
    return this.service.send(dto);
  }
}
