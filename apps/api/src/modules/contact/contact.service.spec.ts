import { NotificationsService } from '../notifications/notifications.service';
import { ContactService } from './contact.service';

describe('ContactService', () => {
  const dto = {
    name: 'Marie',
    email: 'marie@exemple.fr',
    topic: 'QUESTION' as const,
    message: 'Bonjour, une question ?',
  };
  let notifications: { contactMessageReceived: jest.Mock };
  let service: ContactService;

  beforeEach(() => {
    notifications = { contactMessageReceived: jest.fn().mockResolvedValue(undefined) };
    service = new ContactService(notifications as unknown as NotificationsService);
  });

  it('enfile le message avec sa date de réception', async () => {
    await expect(service.send(dto)).resolves.toEqual({ sent: true });
    expect(notifications.contactMessageReceived).toHaveBeenCalledWith({
      ...dto,
      receivedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
  });

  it('piège à robots : champ masqué rempli → réponse normale mais rien n’est transmis', async () => {
    await expect(service.send({ ...dto, website: 'http://spam.example' })).resolves.toEqual({
      sent: true,
    });
    expect(notifications.contactMessageReceived).not.toHaveBeenCalled();
  });

  it('ne masque pas un échec d’enfilage (le visiteur doit pouvoir réessayer)', async () => {
    notifications.contactMessageReceived.mockRejectedValue(new Error('redis down'));
    await expect(service.send(dto)).rejects.toThrow('redis down');
  });
});
