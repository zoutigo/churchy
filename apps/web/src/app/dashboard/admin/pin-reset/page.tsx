import { redirect } from 'next/navigation';

/** Ancienne adresse : l'outil a déménagé dans l'espace plateforme. */
export default function LegacyPinResetPage() {
  redirect('/platform/pin-reset');
}
