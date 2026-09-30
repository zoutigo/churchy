import Link from 'next/link';

const features = [
  {
    icon: '✦',
    title: 'Préparation simplifiée',
    description:
      'Composez vos célébrations avec des modèles adaptés à chaque type de rite — messe, mariage, baptême, funérailles.',
  },
  {
    icon: '✦',
    title: 'Publication instantanée',
    description:
      'Partagez vos programmes avec les fidèles via une page publique dédiée à votre paroisse.',
  },
  {
    icon: '✦',
    title: 'Gestion centralisée',
    description:
      'Invitez vos collaborateurs, gérez les rôles et gardez un historique de toutes vos célébrations.',
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="bg-churchy-700 text-white min-h-[65vh] flex items-center">
        <div className="max-w-4xl mx-auto px-6 py-24 text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <span className="text-churchy-300 text-3xl">✦</span>
            <span className="font-playfair text-3xl font-bold tracking-widest uppercase text-white">
              Churchy
            </span>
            <span className="text-churchy-300 text-3xl">✦</span>
          </div>
          <h1 className="font-playfair text-5xl md:text-6xl font-bold leading-tight mb-6 text-white">
            Préparez et publiez
            <br />
            vos célébrations
          </h1>
          <p className="text-churchy-200 text-xl mb-10 max-w-2xl mx-auto font-poppins">
            Messes, mariages, baptêmes et funérailles — gérez tout en un seul endroit, en toute
            sérénité.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/register"
              className="bg-amber-500 hover:bg-amber-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors shadow-md"
            >
              Commencer gratuitement
            </Link>
            <Link
              href="/login"
              className="border border-churchy-200 text-churchy-100 hover:bg-churchy-500 px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Se connecter
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-churchy-50 py-20 flex-1">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="font-playfair text-3xl text-center text-churchy-700 mb-4">
            Simple, accessible, sécurisé
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
            Tout ce dont votre communauté a besoin pour préparer et partager ses moments de foi.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-xl border border-churchy-200 p-6 shadow-sm hover:shadow-md transition-shadow space-y-3"
              >
                <span className="text-amber-500 text-2xl">{f.icon}</span>
                <h3 className="font-playfair text-lg font-semibold text-churchy-700">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-churchy-900 text-churchy-200 py-8 text-center text-sm font-poppins">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-churchy-300">✦</span>
          <span className="font-playfair font-bold tracking-wider">Churchy</span>
          <span className="text-churchy-300">✦</span>
        </div>
        © 2025 Churchy — Tous droits réservés
      </footer>
    </main>
  );
}
