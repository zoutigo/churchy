import type { ReactNode } from 'react';
import { Compass, ServerCrash, ShieldAlert, type LucideIcon } from 'lucide-react';

export type ErrorKind = 'not-found' | 'server' | 'forbidden';

const ICONS: Record<ErrorKind, LucideIcon> = {
  'not-found': Compass,
  server: ServerCrash,
  forbidden: ShieldAlert,
};

interface Props {
  kind: ErrorKind;
  /** Code affiché en filigrane (404, 500…). */
  code: string;
  title: string;
  message: string;
  /** Boutons / liens d'action (voir `errorButtonClass`). */
  children?: ReactNode;
  /** `page` : page entière (padding généreux) ; `inline` : à l'intérieur d'un panneau déjà mis en page. */
  size?: 'page' | 'inline';
}

export const errorButtonClass =
  'inline-flex h-11 items-center justify-center rounded-lg bg-churchy-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-churchy-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-churchy-500 focus-visible:ring-offset-2';
export const errorSecondaryButtonClass =
  'inline-flex h-11 items-center justify-center rounded-lg border border-churchy-200 bg-white px-5 text-sm font-semibold text-churchy-700 transition-colors hover:bg-churchy-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-churchy-500 focus-visible:ring-offset-2';

/** Page d'erreur de l'application (introuvable, panne, accès refusé) : un seul gabarit, public comme privé. */
export function ErrorPage({ kind, code, title, message, children, size = 'page' }: Props) {
  const Icon = ICONS[kind];
  return (
    <section
      role={kind === 'not-found' ? undefined : 'alert'}
      data-testid="error-page"
      data-kind={kind}
      className={`mx-auto flex w-full max-w-xl flex-col items-center px-4 text-center ${
        size === 'page' ? 'py-16 sm:py-24' : 'py-10'
      }`}
    >
      <div
        className="relative mb-6 flex h-32 w-full items-center justify-center sm:h-40"
        aria-hidden
      >
        <span className="select-none font-playfair text-[7rem] font-bold leading-none text-churchy-200 sm:text-[9rem]">
          {code}
        </span>
        <span className="absolute flex h-16 w-16 items-center justify-center rounded-full border border-churchy-200 bg-white text-churchy-500 shadow-sm sm:h-20 sm:w-20">
          <Icon className="h-8 w-8 sm:h-10 sm:w-10" strokeWidth={1.5} />
        </span>
        <span className="absolute left-[12%] top-4 text-xl text-amber-500">✦</span>
        <span className="absolute bottom-3 right-[14%] text-sm text-amber-500">✦</span>
      </div>
      <h1 className="font-playfair text-2xl font-bold text-churchy-700 sm:text-3xl">{title}</h1>
      <p className="mt-3 max-w-md text-churchy-900/75">{message}</p>
      {children && (
        <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-center">
          {children}
        </div>
      )}
    </section>
  );
}
