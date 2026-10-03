'use client';
import './globals.css';

/** Dernier filet : le layout racine lui-même a échoué (donc ni en-tête, ni fournisseurs, ni polices). */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="fr">
      <body className="bg-churchy-50">
        <main
          role="alert"
          className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4 text-center"
        >
          <span className="text-2xl text-amber-500" aria-hidden>
            ✦
          </span>
          <h1 className="mt-3 font-serif text-3xl font-bold text-churchy-700">
            Churchy est momentanément indisponible
          </h1>
          <p className="mt-3 text-churchy-900/75">
            Un problème inattendu est survenu. Réessayez dans un instant.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-8 inline-flex h-11 items-center rounded-lg bg-churchy-500 px-5 text-sm font-semibold text-white hover:bg-churchy-700"
          >
            Réessayer
          </button>
        </main>
      </body>
    </html>
  );
}
