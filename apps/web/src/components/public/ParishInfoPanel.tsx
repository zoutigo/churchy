import { Globe, Mail, MapPin, Phone } from 'lucide-react';
import type { PublicParish } from '@churchy/shared';
import { placeLabel, telHref } from '@/lib/format';

/** Informations pratiques d'une paroisse : adresse, téléphone, email, site. */
export function ParishInfoPanel({ parish }: { parish: PublicParish }) {
  const address = [parish.address, placeLabel(parish)].filter(Boolean).join(', ');
  return (
    <section
      aria-labelledby="parish-info-title"
      className="space-y-3 rounded-xl border border-churchy-100 bg-white p-5"
    >
      <h2 id="parish-info-title" className="font-playfair text-lg font-semibold text-churchy-700">
        Informations pratiques
      </h2>
      <ul className="space-y-2 text-sm text-churchy-900">
        <li className="flex gap-2">
          <MapPin size={16} className="mt-0.5 shrink-0 text-amber-500" aria-hidden />
          <span>
            {parish.mainChurch && (
              <strong className="block font-medium">{parish.mainChurch}</strong>
            )}
            {address}
            {parish.addressComplement && (
              <span className="block text-churchy-700">{parish.addressComplement}</span>
            )}
          </span>
        </li>
        {parish.phone && (
          <li className="flex gap-2">
            <Phone size={16} className="mt-0.5 shrink-0 text-amber-500" aria-hidden />
            <a href={telHref(parish.phone)} className="underline-offset-2 hover:underline">
              {parish.phone}
            </a>
          </li>
        )}
        {parish.email && (
          <li className="flex gap-2">
            <Mail size={16} className="mt-0.5 shrink-0 text-amber-500" aria-hidden />
            <a
              href={`mailto:${parish.email}`}
              className="break-all underline-offset-2 hover:underline"
            >
              {parish.email}
            </a>
          </li>
        )}
        {parish.website && (
          <li className="flex gap-2">
            <Globe size={16} className="mt-0.5 shrink-0 text-amber-500" aria-hidden />
            <a
              href={parish.website}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="break-all underline-offset-2 hover:underline"
            >
              {parish.website.replace(/^https?:\/\//, '')}
            </a>
          </li>
        )}
      </ul>
    </section>
  );
}
