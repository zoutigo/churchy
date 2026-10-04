import { toast } from '@/hooks/use-toast';

const SUCCESS_DURATION_MS = 4000;
const ERROR_DURATION_MS = 7000;

/**
 * Notifications (toasts) de toute l'application : c'est le SEUL moyen d'annoncer le résultat d'une
 * action de l'utilisateur (création, modification, suppression, échec). Ne pas appeler `toast()` directement.
 */
export const notify = {
  success: (title: string, description?: string) =>
    toast({ variant: 'success', title, description, duration: SUCCESS_DURATION_MS }),
  error: (title: string, description?: string) =>
    toast({ variant: 'destructive', title, description, duration: ERROR_DURATION_MS }),
};
