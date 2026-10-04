import type { Parish } from '@churchy/shared';

/** Identité publique d'une paroisse en lecture seule : ce que verront les fidèles. */
export function ParishInfoSummary({ parish }: { parish: Parish }) {
  const place = [parish.address, parish.district, parish.city, parish.country]
    .filter(Boolean)
    .join(', ');
  const rows: { label: string; value?: string | null }[] = [
    { label: 'Présentation', value: parish.description },
    { label: 'Localisation', value: place },
    { label: 'Complément d’adresse', value: parish.addressComplement },
    { label: 'Église principale', value: parish.mainChurch },
    { label: 'Téléphone', value: parish.phone },
    { label: 'Email', value: parish.email },
    { label: 'Site web', value: parish.website },
    { label: 'Photo', value: parish.imageUrl },
  ];
  return (
    <dl className="grid gap-x-8 gap-y-4 md:grid-cols-2">
      {rows.map((r) => (
        <div
          key={r.label}
          className={r.label === 'Présentation' ? 'min-w-0 md:col-span-2' : 'min-w-0'}
        >
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {r.label}
          </dt>
          <dd className="mt-0.5 break-words whitespace-pre-line">
            {r.value || <span className="text-muted-foreground">Non renseigné</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
