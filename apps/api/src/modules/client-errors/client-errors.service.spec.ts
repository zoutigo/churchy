import { Logger } from '@nestjs/common';
import { ClientErrorsService } from './client-errors.service';

describe('ClientErrorsService', () => {
  it('journalise l’erreur du navigateur sur une ligne JSON', () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const dto = { message: 'boom', source: 'global' as const, path: '/fr' };
    expect(new ClientErrorsService().report(dto)).toEqual({ received: true });
    expect(warn).toHaveBeenCalledWith(JSON.stringify(dto));
    warn.mockRestore();
  });
});
