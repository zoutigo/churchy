'use client';

export default function PublicError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="font-playfair text-2xl font-bold text-churchy-700">
        Le service est momentanément indisponible
      </h1>
      <p className="mt-2 text-churchy-900/75">
        Nous n&apos;avons pas pu charger cette page. Réessayez dans un instant.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex h-11 items-center rounded-lg bg-churchy-500 px-5 text-sm font-semibold text-white hover:bg-churchy-700"
      >
        Réessayer
      </button>
    </div>
  );
}
