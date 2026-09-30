import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

/** Erreur de chargement affichée dans la page (à la place d'un échec silencieux). */
export function ErrorNotice({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <AlertCircle size={16} />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
