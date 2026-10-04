import { useTranslations } from 'next-intl';
import { countryLabel, type Parish } from '@churchy/shared';
import { useAppLocale } from '@/i18n/locale';

/** Identité publique d'une paroisse en lecture seule : ce que verront les fidèles. */
export function ParishInfoSummary({ parish }: { parish: Parish }) {
  const t = useTranslations('parishSummary');
  const locale = useAppLocale();
  const place = [parish.address, parish.district, parish.city, countryLabel(parish.country, locale)]
    .filter(Boolean)
    .join(', ');
  const rows: { key: string; label: string; value?: string | null }[] = [
    { key: 'description', label: t('description'), value: parish.description },
    { key: 'place', label: t('place'), value: place },
    { key: 'addressComplement', label: t('addressComplement'), value: parish.addressComplement },
    { key: 'mainChurch', label: t('mainChurch'), value: parish.mainChurch },
    { key: 'phone', label: t('phone'), value: parish.phone },
    { key: 'email', label: t('email'), value: parish.email },
    { key: 'website', label: t('website'), value: parish.website },
    { key: 'photo', label: t('photo'), value: parish.imageUrl },
  ];
  return (
    <dl className="grid gap-x-8 gap-y-4 md:grid-cols-2">
      {rows.map((r) => (
        <div key={r.key} className={r.key === 'description' ? 'min-w-0 md:col-span-2' : 'min-w-0'}>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {r.label}
          </dt>
          <dd className="mt-0.5 break-words whitespace-pre-line">
            {r.value || <span className="text-muted-foreground">{t('notSet')}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
