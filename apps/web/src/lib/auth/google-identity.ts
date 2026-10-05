/**
 * Google Identity Services (bouton « Se connecter avec Google »). Le script est chargé une seule fois, à la
 * demande, et seulement si l'API annonce que Google est configuré : un site sans Google ne contacte jamais Google.
 */
interface GoogleIdentity {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: { credential?: string }) => void;
        ux_mode?: 'popup' | 'redirect';
        auto_select?: boolean;
      }) => void;
      renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

const SCRIPT_URL = 'https://accounts.google.com/gsi/client';
let loading: Promise<GoogleIdentity> | null = null;

export function loadGoogleIdentity(): Promise<GoogleIdentity> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Navigateur requis'));
  if (window.google) return Promise.resolve(window.google);
  loading ??= new Promise<GoogleIdentity>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () =>
      window.google ? resolve(window.google) : reject(new Error('Google indisponible'));
    script.onerror = () => {
      loading = null; // permet de réessayer
      reject(new Error('Google indisponible'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/** Pour les tests : oublie le chargement en cours. */
export function resetGoogleIdentityForTests() {
  loading = null;
}
