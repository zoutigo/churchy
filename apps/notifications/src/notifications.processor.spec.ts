import { Logger } from '@nestjs/common';
import { NotificationJob } from '@churchy/contracts';
import { NotificationsProcessor } from './notifications.processor';

describe('NotificationsProcessor', () => {
  const payload = {
    celebrationId: 'c1',
    parishId: 'p1',
    title: 'Messe',
    date: '2026-10-04T09:00:00.000Z',
    publishedAt: '2026-09-30T18:00:00.000Z',
  };
  let processor: NotificationsProcessor;
  let log: jest.SpyInstance;
  let warn: jest.SpyInstance;

  beforeEach(() => {
    processor = new NotificationsProcessor();
    log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('traite un job celebration.published valide', async () => {
    await processor.process({ name: NotificationJob.CELEBRATION_PUBLISHED, data: payload } as any);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('Messe'));
  });

  it('rejette (donc déclenche un retry BullMQ) un payload invalide', async () => {
    await expect(
      processor.process({
        name: NotificationJob.CELEBRATION_PUBLISHED,
        data: { ...payload, date: 'demain' },
      } as any),
    ).rejects.toThrow();
  });

  it('ignore un job inconnu sans échouer', async () => {
    await expect(processor.process({ name: 'inconnu', data: {} } as any)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });
});
