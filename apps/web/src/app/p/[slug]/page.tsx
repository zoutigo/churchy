import { parishesApi } from '@/lib/api/parishes.api';
import type { Celebration, Parish } from '@churchy/shared';
import { celebrationsApi } from '@/lib/api/celebrations.api';
import { CelebrationCard } from '@/components/celebration/CelebrationCard';

interface Props {
  params: { slug: string };
}

export default async function PublicParishPage({ params }: Props) {
  const { slug } = params;

  let parish: Parish | null = null;
  let celebrations: Celebration[] = [];

  try {
    [parish, celebrations] = await Promise.all([
      parishesApi.findBySlug(slug),
      celebrationsApi.findPublishedByParishSlug(slug).catch(() => []),
    ]);
  } catch {
    return (
      <main className="min-h-screen flex items-center justify-center bg-churchy-50">
        <div className="text-center space-y-2">
          <span className="text-churchy-300 text-4xl">✦</span>
          <p className="text-muted-foreground">Paroisse introuvable.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-churchy-50 flex flex-col">
      {/* Hero paroisse */}
      <section className="bg-churchy-700 text-white py-16">
        <div className="max-w-3xl mx-auto px-6 text-center space-y-3">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-churchy-300 text-2xl">✦</span>
            <span className="font-playfair text-xl font-bold tracking-widest uppercase text-white">
              Churchy
            </span>
            <span className="text-churchy-300 text-2xl">✦</span>
          </div>
          <h1 className="font-playfair text-4xl md:text-5xl font-bold text-white">{parish.name}</h1>
          <p className="text-churchy-200 text-lg">
            {parish.city}, {parish.country}
          </p>
          {parish.description && (
            <p className="text-churchy-100/80 max-w-xl mx-auto mt-2 text-sm leading-relaxed">
              {parish.description}
            </p>
          )}
        </div>
      </section>

      {/* Célébrations */}
      <section className="max-w-3xl mx-auto w-full px-6 py-12 space-y-6 flex-1">
        <h2 className="font-playfair text-2xl font-semibold text-churchy-700">
          Prochaines célébrations
        </h2>
        {celebrations.length === 0 ? (
          <div className="bg-white rounded-xl border border-churchy-200 p-8 text-center">
            <span className="text-churchy-300 text-3xl block mb-2">✦</span>
            <p className="text-muted-foreground">Aucune célébration publiée pour l&apos;instant.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {celebrations.map((c) => (
              <CelebrationCard key={c.id} celebration={c} publicSlug={slug} />
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="bg-churchy-900 text-churchy-200 py-6 text-center text-xs font-poppins">
        © 2025 Churchy — Tous droits réservés
      </footer>
    </main>
  );
}
