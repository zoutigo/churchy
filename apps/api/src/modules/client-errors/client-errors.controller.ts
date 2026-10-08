import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { clientErrorSchema, type ClientErrorDto } from '@churchy/shared';
import { env } from '../../config/env';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ClientErrorsService } from './client-errors.service';

/** Route publique qui écrit dans les logs : même limite stricte que l'authentification. */
const STRICT = { default: { limit: env.AUTH_THROTTLE_LIMIT, ttl: 60_000 } };

@ApiTags('client-errors')
@Controller('client-errors')
export class ClientErrorsController {
  constructor(private service: ClientErrorsService) {}

  @Post()
  @HttpCode(202)
  @Throttle(STRICT)
  report(@Body(new ZodValidationPipe(clientErrorSchema)) dto: ClientErrorDto) {
    return this.service.report(dto);
  }
}
