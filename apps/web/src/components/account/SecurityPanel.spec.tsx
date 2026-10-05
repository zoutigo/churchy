import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserRole, type AuthUserDto } from '@churchy/shared';
import { setTestLocale } from '../../../vitest.setup';
import { SecurityPanel } from './SecurityPanel';

const api = vi.hoisted(() => ({
  addEmail: vi.fn(),
  setPassword: vi.fn(),
  setPhonePin: vi.fn(),
  changePin: vi.fn(),
  linkGoogle: vi.fn(),
  unlinkGoogle: vi.fn(),
  providers: vi.fn(),
}));
const notify = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
const applyUser = vi.fn();
let currentUser: AuthUserDto;
let emitCredential: ((token: string) => void) | undefined;

vi.mock('@/lib/api/auth.api', () => ({ authApi: api }));
vi.mock('@/lib/notify', () => ({ notify }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: currentUser, applyUser }) }));
vi.mock('@/components/auth/GoogleSignInButton', () => ({
  GoogleSignInButton: (props: { onCredential: (t: string) => void }) => {
    emitCredential = props.onCredential;
    return <div data-testid="google-button" />;
  },
}));

const baseUser = (over: Partial<AuthUserDto> = {}): AuthUserDto => ({
  id: 'u1',
  email: 'jean@paroisse.fr',
  phone: null,
  firstName: 'Jean',
  lastName: 'Dupont',
  role: UserRole.USER,
  emailVerified: true,
  locale: 'fr',
  methods: { password: true, pin: false, google: false },
  ...over,
});
const phoneOnly = () =>
  baseUser({
    email: null,
    emailVerified: false,
    phone: '+237677123456',
    methods: { password: false, pin: true, google: false },
  });
const googleOnly = () => baseUser({ methods: { password: false, pin: false, google: true } });

const card = (id: string) => within(screen.getByTestId(id));

describe('SecurityPanel', () => {
  beforeEach(() => {
    Object.values(api).forEach((m) => m.mockReset());
    notify.success.mockReset();
    notify.error.mockReset();
    applyUser.mockReset();
    api.providers.mockResolvedValue({ google: null });
    emitCredential = undefined;
    currentUser = baseUser();
  });

  describe('vue d’ensemble', () => {
    it('indique les moyens de connexion actifs', () => {
      currentUser = baseUser({
        phone: '+237677123456',
        methods: { password: true, pin: true, google: false },
      });
      render(<SecurityPanel />);
      expect(screen.getByTestId('method-password')).toHaveAttribute('data-active', 'true');
      expect(screen.getByTestId('method-pin')).toHaveAttribute('data-active', 'true');
      expect(screen.getByTestId('method-google')).toHaveAttribute('data-active', 'false');
    });

    it('rien sans utilisateur', () => {
      currentUser = undefined as unknown as AuthUserDto;
      const { container } = render(<SecurityPanel />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('compte email + mot de passe', () => {
    it('affiche l’email confirmé et change le mot de passe avec le mot de passe actuel', async () => {
      api.setPassword.mockResolvedValue({ user: baseUser() });
      render(<SecurityPanel />);
      expect(card('card-email-password').getByText('jean@paroisse.fr')).toBeInTheDocument();
      expect(card('card-email-password').getByText('confirmé')).toBeInTheDocument();

      const c = card('card-email-password');
      await userEvent.type(c.getByLabelText('Mot de passe actuel'), 'ancien-mdp-1');
      await userEvent.type(c.getByLabelText('Nouveau mot de passe'), 'nouveau-mdp-1');
      await userEvent.type(c.getByLabelText('Confirmer le mot de passe'), 'nouveau-mdp-1');
      await userEvent.click(c.getByRole('button', { name: 'Changer le mot de passe' }));

      await waitFor(() =>
        expect(api.setPassword).toHaveBeenCalledWith({
          password: 'nouveau-mdp-1',
          currentPassword: 'ancien-mdp-1',
        }),
      );
      expect(applyUser).toHaveBeenCalled();
      expect(notify.success).toHaveBeenCalledWith('Mot de passe modifié', expect.any(String));
    });

    it('refuse une confirmation différente et un mot de passe trop court', async () => {
      render(<SecurityPanel />);
      const c = card('card-email-password');
      await userEvent.type(c.getByLabelText('Mot de passe actuel'), 'ancien-mdp-1');
      await userEvent.type(c.getByLabelText('Nouveau mot de passe'), 'court');
      await userEvent.type(c.getByLabelText('Confirmer le mot de passe'), 'autre');
      await userEvent.click(c.getByRole('button', { name: 'Changer le mot de passe' }));
      expect(await c.findByText('Minimum 8 caractères')).toBeInTheDocument();
      expect(c.getByText('Les mots de passe ne correspondent pas')).toBeInTheDocument();
      expect(api.setPassword).not.toHaveBeenCalled();
    });

    it('exige le mot de passe actuel', async () => {
      render(<SecurityPanel />);
      const c = card('card-email-password');
      await userEvent.type(c.getByLabelText('Nouveau mot de passe'), 'nouveau-mdp-1');
      await userEvent.type(c.getByLabelText('Confirmer le mot de passe'), 'nouveau-mdp-1');
      await userEvent.click(c.getByRole('button', { name: 'Changer le mot de passe' }));
      expect(await c.findByText('Mot de passe requis')).toBeInTheDocument();
      expect(api.setPassword).not.toHaveBeenCalled();
    });

    it('mauvais mot de passe actuel : message dans la carte et toast d’erreur', async () => {
      api.setPassword.mockRejectedValue(new Error('Mot de passe ou PIN actuel incorrect'));
      render(<SecurityPanel />);
      const c = card('card-email-password');
      await userEvent.type(c.getByLabelText('Mot de passe actuel'), 'faux-mdp-1');
      await userEvent.type(c.getByLabelText('Nouveau mot de passe'), 'nouveau-mdp-1');
      await userEvent.type(c.getByLabelText('Confirmer le mot de passe'), 'nouveau-mdp-1');
      await userEvent.click(c.getByRole('button', { name: 'Changer le mot de passe' }));
      expect(await c.findByRole('alert')).toHaveTextContent('Mot de passe ou PIN actuel incorrect');
      expect(notify.error).toHaveBeenCalled();
      expect(notify.success).not.toHaveBeenCalled();
    });

    it('email non confirmé signalé', () => {
      currentUser = baseUser({ emailVerified: false });
      render(<SecurityPanel />);
      expect(card('card-email-password').getByText('à confirmer')).toBeInTheDocument();
    });
  });

  describe('compte par téléphone (sans email)', () => {
    beforeEach(() => {
      currentUser = phoneOnly();
    });

    it('propose d’ajouter un email avec le PIN actuel comme preuve, et bloque le mot de passe', async () => {
      render(<SecurityPanel />);
      const c = card('card-email-password');
      expect(c.getByText(/Ajoutez d’abord une adresse email/)).toBeInTheDocument();
      expect(c.queryByRole('button', { name: /mot de passe/i })).not.toBeInTheDocument();
      expect(c.getByLabelText('PIN actuel')).toBeInTheDocument();
    });

    it('ajoute l’email : envoie la preuve, annonce le succès et met à jour le compte', async () => {
      api.addEmail.mockResolvedValue(baseUser({ emailVerified: false }));
      render(<SecurityPanel />);
      const c = card('card-email-password');
      await userEvent.type(c.getByLabelText('Adresse email'), 'jean@paroisse.fr');
      await userEvent.type(c.getByLabelText('PIN actuel'), '482915');
      await userEvent.click(c.getByRole('button', { name: 'Ajouter l’email' }));
      await waitFor(() =>
        expect(api.addEmail).toHaveBeenCalledWith({
          email: 'jean@paroisse.fr',
          currentPin: '482915',
        }),
      );
      expect(applyUser).toHaveBeenCalled();
      expect(notify.success).toHaveBeenCalledWith('Email ajouté', expect.stringContaining('lien'));
    });

    it('email invalide ou déjà pris', async () => {
      api.addEmail.mockRejectedValue(new Error('Email déjà utilisé'));
      render(<SecurityPanel />);
      const c = card('card-email-password');
      await userEvent.type(c.getByLabelText('Adresse email'), 'pas-un-email');
      await userEvent.type(c.getByLabelText('PIN actuel'), '482915');
      await userEvent.click(c.getByRole('button', { name: 'Ajouter l’email' }));
      expect(await c.findByText('Email invalide')).toBeInTheDocument();
      expect(api.addEmail).not.toHaveBeenCalled();

      await userEvent.clear(c.getByLabelText('Adresse email'));
      await userEvent.type(c.getByLabelText('Adresse email'), 'pris@paroisse.fr');
      await userEvent.click(c.getByRole('button', { name: 'Ajouter l’email' }));
      expect(await c.findByRole('alert')).toHaveTextContent('Email déjà utilisé');
    });

    it('affiche le numéro enregistré et change le PIN', async () => {
      api.changePin.mockResolvedValue({ user: phoneOnly() });
      render(<SecurityPanel />);
      const c = card('card-phone-pin');
      expect(c.getByText('+237 6 77 12 34 56')).toBeInTheDocument();
      await userEvent.type(c.getByLabelText('PIN actuel'), '482915');
      await userEvent.type(c.getByLabelText('Nouveau PIN'), '739104');
      await userEvent.type(c.getByLabelText('Confirmer le PIN'), '739104');
      await userEvent.click(c.getByRole('button', { name: 'Changer le PIN' }));
      await waitFor(() =>
        expect(api.changePin).toHaveBeenCalledWith({ currentPin: '482915', pin: '739104' }),
      );
      expect(notify.success).toHaveBeenCalledWith('PIN modifié', expect.any(String));
    });

    it('refuse un nouveau PIN trop simple ou une confirmation différente', async () => {
      render(<SecurityPanel />);
      const c = card('card-phone-pin');
      await userEvent.type(c.getByLabelText('PIN actuel'), '482915');
      await userEvent.type(c.getByLabelText('Nouveau PIN'), '123456');
      await userEvent.type(c.getByLabelText('Confirmer le PIN'), '654321');
      await userEvent.click(c.getByRole('button', { name: 'Changer le PIN' }));
      expect(await c.findByText(/PIN trop simple/)).toBeInTheDocument();
      expect(c.getByText('Les PIN ne correspondent pas')).toBeInTheDocument();
      expect(api.changePin).not.toHaveBeenCalled();
    });

    it('mauvais PIN actuel : message et toast d’erreur', async () => {
      api.changePin.mockRejectedValue(new Error('Mot de passe ou PIN actuel incorrect'));
      render(<SecurityPanel />);
      const c = card('card-phone-pin');
      await userEvent.type(c.getByLabelText('PIN actuel'), '000001');
      await userEvent.type(c.getByLabelText('Nouveau PIN'), '739104');
      await userEvent.type(c.getByLabelText('Confirmer le PIN'), '739104');
      await userEvent.click(c.getByRole('button', { name: 'Changer le PIN' }));
      expect(await c.findByRole('alert')).toHaveTextContent('incorrect');
      expect(notify.error).toHaveBeenCalled();
    });
  });

  describe('ajouter le téléphone à un compte email', () => {
    it('demande le mot de passe actuel et active la connexion par téléphone', async () => {
      api.setPhonePin.mockResolvedValue({
        user: baseUser({
          phone: '+237677123456',
          methods: { password: true, pin: true, google: false },
        }),
      });
      render(<SecurityPanel />);
      const c = card('card-phone-pin');
      await userEvent.type(c.getByLabelText('Numéro de téléphone'), '677123456');
      await userEvent.type(c.getByLabelText('PIN', { exact: true }), '739104');
      await userEvent.type(c.getByLabelText('Confirmer le PIN'), '739104');
      await userEvent.type(c.getByLabelText('Mot de passe actuel'), 'password123');
      await userEvent.click(c.getByRole('button', { name: 'Activer la connexion par téléphone' }));
      await waitFor(() =>
        expect(api.setPhonePin).toHaveBeenCalledWith({
          phone: '+237677123456',
          pin: '739104',
          currentPassword: 'password123',
        }),
      );
      expect(notify.success).toHaveBeenCalledWith(
        'Connexion par téléphone activée',
        expect.any(String),
      );
      expect(applyUser).toHaveBeenCalled();
    });

    it('numéro déjà utilisé : message d’erreur', async () => {
      api.setPhonePin.mockRejectedValue(new Error('Ce numéro est déjà utilisé'));
      render(<SecurityPanel />);
      const c = card('card-phone-pin');
      await userEvent.type(c.getByLabelText('Numéro de téléphone'), '677123456');
      await userEvent.type(c.getByLabelText('PIN', { exact: true }), '739104');
      await userEvent.type(c.getByLabelText('Confirmer le PIN'), '739104');
      await userEvent.type(c.getByLabelText('Mot de passe actuel'), 'password123');
      await userEvent.click(c.getByRole('button', { name: 'Activer la connexion par téléphone' }));
      expect(await c.findByRole('alert')).toHaveTextContent('Ce numéro est déjà utilisé');
    });
  });

  describe('compte Google', () => {
    it('crée un mot de passe sans preuve (rien à prouver) pour un compte uniquement Google', async () => {
      currentUser = googleOnly();
      api.setPassword.mockResolvedValue({
        user: baseUser({ methods: { password: true, pin: false, google: true } }),
      });
      render(<SecurityPanel />);
      const c = card('card-email-password');
      expect(c.queryByLabelText('Mot de passe actuel')).not.toBeInTheDocument();
      await userEvent.type(c.getByLabelText('Mot de passe', { exact: true }), 'nouveau-mdp-1');
      await userEvent.type(c.getByLabelText('Confirmer le mot de passe'), 'nouveau-mdp-1');
      await userEvent.click(c.getByRole('button', { name: 'Créer le mot de passe' }));
      await waitFor(() =>
        expect(api.setPassword).toHaveBeenCalledWith({ password: 'nouveau-mdp-1' }),
      );
      expect(notify.success).toHaveBeenCalledWith('Mot de passe créé', expect.any(String));
    });

    it('la carte Google est absente quand Google n’est pas configuré', async () => {
      render(<SecurityPanel />);
      await waitFor(() => expect(api.providers).toHaveBeenCalled());
      expect(screen.queryByTestId('card-google')).not.toBeInTheDocument();
    });

    describe('Google configuré', () => {
      beforeEach(() => {
        api.providers.mockResolvedValue({ google: { clientId: 'cid' } });
      });

      it('lie un compte Google après la preuve par mot de passe', async () => {
        api.linkGoogle.mockResolvedValue(
          baseUser({ methods: { password: true, pin: false, google: true } }),
        );
        render(<SecurityPanel />);
        await screen.findByTestId('google-button');
        emitCredential?.('id.token');
        const c = card('card-google');
        await userEvent.type(await c.findByLabelText('Mot de passe actuel'), 'password123');
        await userEvent.click(c.getByRole('button', { name: 'Lier Google' }));
        await waitFor(() =>
          expect(api.linkGoogle).toHaveBeenCalledWith({
            idToken: 'id.token',
            currentPassword: 'password123',
          }),
        );
        expect(notify.success).toHaveBeenCalledWith('Compte Google lié');
      });

      it('annuler la liaison ramène au bouton Google', async () => {
        render(<SecurityPanel />);
        await screen.findByTestId('google-button');
        emitCredential?.('id.token');
        await userEvent.click(await card('card-google').findByRole('button', { name: 'Annuler' }));
        expect(await screen.findByTestId('google-button')).toBeInTheDocument();
        expect(api.linkGoogle).not.toHaveBeenCalled();
      });

      it('erreur de liaison (déjà lié ailleurs) : message et toast d’erreur', async () => {
        api.linkGoogle.mockRejectedValue(
          new Error('Ce compte Google est déjà lié à un autre compte Churchy'),
        );
        render(<SecurityPanel />);
        await screen.findByTestId('google-button');
        emitCredential?.('id.token');
        const c = card('card-google');
        await userEvent.type(await c.findByLabelText('Mot de passe actuel'), 'password123');
        await userEvent.click(c.getByRole('button', { name: 'Lier Google' }));
        expect(await c.findByRole('alert')).toHaveTextContent('déjà lié à un autre compte');
        expect(notify.error).toHaveBeenCalled();
      });

      it('délie Google avec la preuve', async () => {
        currentUser = baseUser({ methods: { password: true, pin: false, google: true } });
        api.unlinkGoogle.mockResolvedValue(baseUser());
        render(<SecurityPanel />);
        await screen.findByTestId('card-google');
        const c = card('card-google');
        expect(c.getByText('Un compte Google est lié.')).toBeInTheDocument();
        await userEvent.type(c.getByLabelText('Mot de passe actuel'), 'password123');
        await userEvent.click(c.getByRole('button', { name: 'Délier Google' }));
        await waitFor(() =>
          expect(api.unlinkGoogle).toHaveBeenCalledWith({ currentPassword: 'password123' }),
        );
        expect(notify.success).toHaveBeenCalledWith('Compte Google délié');
      });

      it('Google seul moyen de connexion : impossible de le délier, explication affichée', async () => {
        currentUser = googleOnly();
        render(<SecurityPanel />);
        await screen.findByTestId('card-google');
        const c = card('card-google');
        expect(c.getByText(/seul moyen de connexion/)).toBeInTheDocument();
        expect(c.queryByRole('button', { name: 'Délier Google' })).not.toBeInTheDocument();
      });
    });
  });

  it('en anglais', async () => {
    setTestLocale('en');
    render(<SecurityPanel />);
    expect(screen.getByRole('heading', { name: 'Account security' })).toBeInTheDocument();
    expect(card('card-email-password').getByLabelText('Current password')).toBeInTheDocument();
  });
});
