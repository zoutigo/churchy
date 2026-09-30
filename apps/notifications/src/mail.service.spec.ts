import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { MailService } from './mail.service';

describe('MailService', () => {
  beforeEach(() => jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined));
  afterEach(() => jest.restoreAllMocks());

  it('envoie un message complet (expéditeur, destinataire, sujet, texte, HTML)', async () => {
    // jsonTransport : construit le message sans réseau, et permet de l'inspecter.
    const transport = nodemailer.createTransport({ jsonTransport: true });
    const service = new MailService(transport, 'Churchy <no-reply@churchy.local>');

    const spy = jest.spyOn(transport, 'sendMail');
    await service.send('jean@paroisse.fr', {
      subject: 'Sujet',
      text: 'Texte',
      html: '<p>Html</p>',
    });

    expect(spy).toHaveBeenCalledWith({
      from: 'Churchy <no-reply@churchy.local>',
      to: 'jean@paroisse.fr',
      subject: 'Sujet',
      text: 'Texte',
      html: '<p>Html</p>',
    });
  });

  it('ne journalise pas le contenu du message (lien à usage unique)', async () => {
    const transport = nodemailer.createTransport({ jsonTransport: true });
    const log = jest.spyOn(Logger.prototype, 'log');
    await new MailService(transport, 'a@b.fr').send('jean@paroisse.fr', {
      subject: 'Sujet',
      text: 'http://secret/lien?token=abc',
      html: '<p>x</p>',
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain('token=abc');
  });

  it('propage l’échec du transport', async () => {
    const transport = {
      sendMail: jest.fn().mockRejectedValue(new Error('SMTP indisponible')),
    } as unknown as nodemailer.Transporter;
    await expect(
      new MailService(transport, 'a@b.fr').send('x@y.fr', { subject: 's', text: 't', html: 'h' }),
    ).rejects.toThrow('SMTP indisponible');
  });
});
