import { Link } from '@/i18n/link';

interface Props {
  title: string;
  hint?: string;
  action?: { href: string; label: string };
}

/** Liste vide : dit ce qui se passe et propose une suite. */
export function EmptyState({ title, hint, action }: Props) {
  return (
    <div className="rounded-xl border border-dashed border-churchy-200 bg-white/60 p-8 text-center">
      <p className="font-playfair text-lg text-churchy-700">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-md text-sm text-churchy-900/70">{hint}</p>}
      {action && (
        <Link
          href={action.href}
          className="mt-4 inline-flex h-11 items-center rounded-lg bg-churchy-500 px-5 text-sm font-semibold text-white hover:bg-churchy-700"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
