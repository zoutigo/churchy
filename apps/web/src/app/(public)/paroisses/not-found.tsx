import Link from 'next/link';

export default function ParishNotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="font-playfair text-2xl font-bold text-churchy-700">Paroisse introuvable.</h1>
      <p className="mt-2 text-churchy-900/75">
        Cette paroisse n&apos;existe pas ou n&apos;est plus disponible.
      </p>
      <Link
        href="/paroisses"
        className="mt-6 inline-flex h-11 items-center rounded-lg bg-churchy-500 px-5 text-sm font-semibold text-white hover:bg-churchy-700"
      >
        Rechercher une paroisse
      </Link>
    </div>
  );
}
