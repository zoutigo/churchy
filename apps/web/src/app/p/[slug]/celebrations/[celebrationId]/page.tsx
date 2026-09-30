import { api } from '@/lib/api/client';

interface Props {
  params: { slug: string; celebrationId: string };
}

export default async function PublicCelebrationPage({ params }: Props) {
  const { celebrationId } = params;

  let celebration: any = null;

  try {
    celebration = await api.get(`/public/celebrations/${celebrationId}`);
  } catch {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Célébration introuvable.</p>
      </main>
    );
  }

  const date = new Date(celebration.date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{celebration.parish?.name}</p>
          <h1 className="text-3xl font-bold">{celebration.title}</h1>
          <p className="text-muted-foreground">{date}</p>
          {celebration.location && (
            <p className="text-muted-foreground">{celebration.location}</p>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Déroulement</h2>
          <div className="space-y-3">
            {(celebration.steps ?? []).map((step: any) => (
              <div key={step.id} className="rounded-lg border bg-card p-4 space-y-2">
                <h3 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
                  {step.title}
                </h3>
                {step.content ? (
                  <div>
                    <p className="font-medium">{step.content.title}</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{step.content.body}</p>
                  </div>
                ) : step.customText ? (
                  <p className="text-sm text-foreground whitespace-pre-wrap">{step.customText}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Aucun contenu assigné</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
