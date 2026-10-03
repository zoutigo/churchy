import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { NotificationJob } from '@churchy/contracts';
import { MailService } from './mail.service';
import { NotificationsProcessor } from './notifications.processor';

const job = (name: string, data: unknown) => ({ name, data }) as unknown as Job;

describe('NotificationsProcessor', () => {
  const published = {
    celebrationId: 'c1',
    occurrenceId: 'o1',
    parishId: 'p1',
    title: 'Messe',
    date: '2026-10-04T09:00:00.000Z',
    publishedAt: '2026-09-30T18:00:00.000Z',
  };
  const linkEmail = {
    email: 'jean@paroisse.fr',
    firstName: 'Jean',
    url: 'http://localhost:3200/reset-password?token=abc',
    expiresAt: '2026-10-01T10:00:00.000Z',
  };
  let send: jest.Mock;
  let processor: NotificationsProcessor;
  let log: jest.SpyInstance;
  let warn: jest.SpyInstance;

  beforeEach(() => {
    send = jest.fn().mockResolvedValue(undefined);
    processor = new NotificationsProcessor({ send } as unknown as MailService);
    log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('celebration.published', () => {
    it('traite un job valide', async () => {
      await processor.process(job(NotificationJob.CELEBRATION_PUBLISHED, published));
      expect(log).toHaveBeenCalledWith(expect.stringContaining('Messe'));
    });

    it('rejette (donc déclenche un retry BullMQ) un payload invalide', async () => {
      await expect(
        processor.process(
          job(NotificationJob.CELEBRATION_PUBLISHED, { ...published, date: 'demain' }),
        ),
      ).rejects.toThrow();
    });
  });

  describe('emails d’authentification', () => {
    it('envoie l’email de vérification avec le lien', async () => {
      await processor.process(job(NotificationJob.EMAIL_VERIFICATION_REQUESTED, linkEmail));
      expect(send).toHaveBeenCalledWith(
        'jean@paroisse.fr',
        expect.objectContaining({
          subject: expect.stringContaining('Confirmez'),
          text: expect.stringContaining(linkEmail.url),
        }),
      );
    });

    it('envoie l’email de réinitialisation avec le lien', async () => {
      await processor.process(job(NotificationJob.PASSWORD_RESET_REQUESTED, linkEmail));
      expect(send).toHaveBeenCalledWith(
        'jean@paroisse.fr',
        expect.objectContaining({
          subject: expect.stringContaining('Réinitialisation'),
          text: expect.stringContaining(linkEmail.url),
        }),
      );
    });

    it('rejette un payload invalide sans rien envoyer', async () => {
      await expect(
        processor.process(
          job(NotificationJob.PASSWORD_RESET_REQUESTED, { ...linkEmail, email: 'pas-un-email' }),
        ),
      ).rejects.toThrow();
      expect(send).not.toHaveBeenCalled();
    });

    it('laisse remonter l’échec d’envoi pour que BullMQ réessaie', async () => {
      send.mockRejectedValue(new Error('SMTP indisponible'));
      await expect(
        processor.process(job(NotificationJob.PASSWORD_RESET_REQUESTED, linkEmail)),
      ).rejects.toThrow('SMTP indisponible');
    });
  });

  describe('contact.message-received', () => {
    const message = {
      name: 'Marie',
      email: 'marie@exemple.fr',
      topic: 'PARISH',
      message: 'Nous voulons rejoindre Churchy',
      receivedAt: '2026-10-01T10:00:00.000Z',
    };

    afterEach(() => delete process.env.CONTACT_EMAIL);

    it('transmet le message à l’équipe, en répondant à l’expéditeur', async () => {
      process.env.CONTACT_EMAIL = 'equipe@churchy.test';
      await processor.process(job(NotificationJob.CONTACT_MESSAGE_RECEIVED, message));
      expect(send).toHaveBeenCalledWith(
        'equipe@churchy.test',
        expect.objectContaining({
          replyTo: 'marie@exemple.fr',
          subject: expect.stringContaining('Paroisse'),
          text: expect.stringContaining('Nous voulons rejoindre Churchy'),
        }),
      );
    });

    it('utilise l’adresse locale par défaut sans CONTACT_EMAIL', async () => {
      await processor.process(job(NotificationJob.CONTACT_MESSAGE_RECEIVED, message));
      expect(send).toHaveBeenCalledWith('contact@churchy.local', expect.anything());
    });

    it('rejette un payload invalide sans rien envoyer', async () => {
      await expect(
        processor.process(
          job(NotificationJob.CONTACT_MESSAGE_RECEIVED, { ...message, email: 'nope' }),
        ),
      ).rejects.toThrow();
      expect(send).not.toHaveBeenCalled();
    });
  });

  it('ignore un job inconnu sans échouer', async () => {
    await expect(processor.process(job('inconnu', {}))).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });
});
