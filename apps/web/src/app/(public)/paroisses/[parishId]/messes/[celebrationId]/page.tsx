import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Clock, MapPin } from 'lucide-react';
import { RichContent } from '@/components/rich-text/RichContent';
import { SheetStatusBadge } from '@/components/public/SheetStatusBadge';
import { orNotFound, publicApi } from '@/lib/api/public.api';
import { CELEBRATION_TYPE_LABELS, formatDateLong, formatTime } from '@/lib/format';

interface Props {
  params: { parishId: string; celebrationId: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const c = await publicApi.getCelebration(params.celebrationId);
    return { title: `${c.title} — ${c.parish.name}` };
  } catch {
    return { title: 'Messe — Churchy' };
  }
}

export default async function PublicCelebrationPage({ params }: Props) {
  const c = await orNotFound(publicApi.getCelebration(params.celebrationId));
  // L'URL doit désigner la paroisse de cette célébration.
  if (c.parish.id !== params.parishId) notFound();

  const tz = { timeZone: c.timezone };
  const inPreparation = c.sheetStatus === 'IN_PREPARATION';

  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <p className="text-sm text-churchy-900/75">
          <Link href={`/paroisses/${c.parish.id}`} className="underline-offset-2 hover:underline">
            {c.parish.name}
          </Link>{' '}
          — {c.parish.city}
        </p>
        <h2 className="font-playfair text-3xl font-bold text-churchy-700">{c.title}</h2>
        <ul className="space-y-1.5 text-churchy-900">
          <li className="flex items-center gap-2">
            <Clock size={16} className="text-amber-500" aria-hidden />
            <time dateTime={c.date}>
              {formatDateLong(c.date, tz)} à {formatTime(c.date, tz)}
            </time>
          </li>
          {c.location && (
            <li className="flex items-center gap-2">
              <MapPin size={16} className="text-amber-500" aria-hidden /> {c.location}
            </li>
          )}
          <li className="text-sm text-churchy-900/75">{CELEBRATION_TYPE_LABELS[c.type]}</li>
        </ul>
        {c.cancelled ? (
          <p
            role="status"
            className="rounded-xl border border-red-200 bg-red-50 p-4 font-medium text-red-700"
          >
            Cette célébration est annulée{c.cancelReason ? ` : ${c.cancelReason}` : '.'}
          </p>
        ) : (
          <SheetStatusBadge status={c.sheetStatus} />
        )}
      </header>

      {(c.description || c.occurrenceDescription) && (
        <section aria-label="À propos de cette célébration" className="space-y-3">
          {c.description && <RichContent html={c.description} />}
          {c.occurrenceDescription && (
            <div className="rounded-xl border border-amber-300/60 bg-amber-400/10 p-4">
              <RichContent html={c.occurrenceDescription} />
            </div>
          )}
        </section>
      )}

      {c.cancelled ? null : inPreparation ? (
        <p className="rounded-xl border border-dashed border-churchy-200 bg-white/60 p-5 text-churchy-900/85">
          La paroisse prépare la feuille de cette célébration. Elle sera visible ici dès sa
          publication.
        </p>
      ) : (
        <section aria-labelledby="sheet-title" className="space-y-3">
          <h3 id="sheet-title" className="font-playfair text-xl font-semibold text-churchy-700">
            Déroulement
          </h3>
          {c.steps.map((step) => (
            <div
              key={step.id}
              className="space-y-1.5 rounded-xl border border-churchy-100 bg-white p-4"
            >
              <h4 className="text-sm font-semibold text-churchy-500">{step.title}</h4>
              {step.content ? (
                <>
                  <p className="font-medium">{step.content.title}</p>
                  <RichContent html={step.content.body} />
                </>
              ) : step.customText ? (
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{step.customText}</p>
              ) : (
                <p className="text-sm italic text-churchy-900/60">Contenu à venir</p>
              )}
            </div>
          ))}
        </section>
      )}

      <p className="text-sm text-churchy-900/75">
        Pour suivre la feuille ou préparer votre participation,{' '}
        <Link
          href={`/login?next=${encodeURIComponent(`/paroisses/${c.parish.id}/messes/${c.id}`)}`}
          className="font-medium text-churchy-500 underline"
        >
          connectez-vous
        </Link>
        .
      </p>
    </article>
  );
}
