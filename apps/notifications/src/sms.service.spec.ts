import { Logger } from '@nestjs/common';
import { createSmsProvider, LogSmsProvider, SmsService } from './sms.service';

describe('fournisseur SMS', () => {
  afterEach(() => jest.restoreAllMocks());

  it('« log » par défaut', () => {
    expect(createSmsProvider({})).toBeInstanceOf(LogSmsProvider);
    expect(createSmsProvider({ SMS_PROVIDER: ' LOG ' })).toBeInstanceOf(LogSmsProvider);
  });

  it('refuse un fournisseur inconnu au démarrage', () => {
    expect(() => createSmsProvider({ SMS_PROVIDER: 'orange' })).toThrow(/SMS_PROVIDER inconnu/);
  });

  it('le fournisseur « log » ne journalise jamais le texte (il peut contenir un code)', async () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    await new SmsService(new LogSmsProvider()).send('+237677123456', 'Votre code : 987654');
    const written = log.mock.calls.map((c) => String(c[0])).join(' ');
    expect(written).toContain('+237677123456');
    expect(written).not.toContain('987654');
  });
});
