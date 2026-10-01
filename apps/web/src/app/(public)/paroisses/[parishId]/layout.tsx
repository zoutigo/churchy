import type { Metadata } from 'next';
import { MapPin } from 'lucide-react';
import { ParishInfoPanel } from '@/components/public/ParishInfoPanel';
import { ParishTabs } from '@/components/public/ParishTabs';
import { orNotFound, publicApi } from '@/lib/api/public.api';
import { placeLabel } from '@/lib/format';

const WRAP = 'mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8';

interface Props {
  children: React.ReactNode;
  params: { parishId: string };
}

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  try {
    const parish = await publicApi.getParish(params.parishId);
    return {
      title: `${parish.name} — Churchy`,
      description:
        parish.description ?? `Messes, annonces et activités de ${parish.name} (${parish.city}).`,
    };
  } catch {
    return { title: 'Paroisse — Churchy' };
  }
}

/** Mini-site d'une paroisse : bandeau d'identité, onglets, contenu, et fiche pratique à droite sur desktop. */
export default async function ParishLayout({ children, params }: Props) {
  const parish = await orNotFound(publicApi.getParish(params.parishId));

  return (
    <>
      <div className="bg-churchy-700 text-white">
        <div className={`${WRAP} pt-8 sm:pt-12`}>
          <div className="flex flex-col gap-6 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <h1 className="font-playfair text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
                {parish.name}
              </h1>
              <p className="flex items-center gap-1.5 text-churchy-100">
                <MapPin size={16} aria-hidden /> {placeLabel(parish)}, {parish.country}
              </p>
            </div>
            {parish.imageUrl && (
              <img
                src={parish.imageUrl}
                alt={`Photo de ${parish.name}`}
                className="h-28 w-full rounded-xl object-cover sm:h-32 sm:w-56"
              />
            )}
          </div>
          <ParishTabs parishId={parish.id} />
        </div>
      </div>

      <div className={`${WRAP} grid gap-8 py-8 lg:grid-cols-[1fr_20rem] lg:py-12`}>
        <div className="min-w-0 space-y-10">{children}</div>
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <ParishInfoPanel parish={parish} />
          </div>
        </aside>
      </div>
    </>
  );
}
