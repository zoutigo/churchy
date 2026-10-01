interface Props {
  title: string;
  intro?: string;
  /** Texte provisoire à faire valider avant publication (pages légales). */
  provisional?: boolean;
  children: React.ReactNode;
}

/** Page de texte (à propos, légal) : colonne de lecture étroite. */
export function ProsePage({ title, intro, provisional, children }: Props) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="font-playfair text-3xl font-bold text-churchy-700 sm:text-4xl">{title}</h1>
      {intro && <p className="mt-3 text-lg text-churchy-900/85">{intro}</p>}
      {provisional && (
        <p
          role="note"
          className="mt-6 rounded-lg border border-amber-400/50 bg-amber-400/10 p-3 text-sm text-churchy-900"
        >
          Version provisoire : ce texte doit être relu et complété avant la mise en service.
        </p>
      )}
      <div className="mt-8 space-y-6 leading-relaxed text-churchy-900/90 [&_h2]:mb-2 [&_h2]:font-playfair [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-churchy-700 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        {children}
      </div>
    </div>
  );
}
