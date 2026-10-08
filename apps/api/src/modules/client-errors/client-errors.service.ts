import { Injectable, Logger } from '@nestjs/common';
import type { ClientErrorDto } from '@churchy/shared';

/** Journalise les erreurs vues par les visiteurs : sans cela, une page d'erreur n'est jamais signalée. */
@Injectable()
export class ClientErrorsService {
  private readonly logger = new Logger('ClientError');

  report(dto: ClientErrorDto) {
    // Une seule ligne JSON : facile à retrouver avec `docker compose logs api | grep ClientError`.
    this.logger.warn(JSON.stringify(dto));
    return { received: true };
  }
}
