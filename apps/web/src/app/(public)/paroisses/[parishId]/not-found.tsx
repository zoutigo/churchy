import Link from 'next/link';

export default function ParishPageNotFound() {
  return (
    <div className="py-12 text-center">
      <h2 className="font-playfair text-2xl font-bold text-churchy-700">Page introuvable.</h2>
      <p className="mt-2 text-churchy-900/75">
        Cette page n&apos;existe pas ou n&apos;est plus disponible.
      </p>
      <Link href=".." className="mt-4 inline-block text-sm font-medium text-churchy-500 underline">
        Retour à la paroisse
      </Link>
    </div>
  );
}
