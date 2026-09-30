import Link from 'next/link';

interface Props {
  params: { parishId: string };
}

export default function ParishDetailPage({ params }: Props) {
  const { parishId } = params;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Paroisse</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href={`/dashboard/parishes/${parishId}/contents`} className="block rounded-lg border bg-card p-5 hover:shadow-md transition-shadow">
          <h2 className="font-semibold">Bibliothèque</h2>
          <p className="text-sm text-muted-foreground mt-1">Chants, psaumes, lectures, prières</p>
        </Link>
        <Link href={`/dashboard/parishes/${parishId}/templates`} className="block rounded-lg border bg-card p-5 hover:shadow-md transition-shadow">
          <h2 className="font-semibold">Modèles</h2>
          <p className="text-sm text-muted-foreground mt-1">Modèles de célébration</p>
        </Link>
        <Link href={`/dashboard/parishes/${parishId}/celebrations`} className="block rounded-lg border bg-card p-5 hover:shadow-md transition-shadow">
          <h2 className="font-semibold">Célébrations</h2>
          <p className="text-sm text-muted-foreground mt-1">Préparer et publier les messes</p>
        </Link>
      </div>
    </div>
  );
}
