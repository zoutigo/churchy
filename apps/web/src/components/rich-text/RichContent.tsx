import { cn } from '@/lib/utils';
import { isRichHtml } from '@churchy/shared';

/**
 * Affiche un texte riche. Le HTML vient de l'API, qui le nettoie (liste blanche) avant stockage ;
 * un ancien texte brut est affiché tel quel, sans interprétation.
 */
export function RichContent({ html, className }: { html: string; className?: string }) {
  if (!isRichHtml(html)) {
    return <div className={cn('rich-content whitespace-pre-wrap', className)}>{html}</div>;
  }
  return (
    <div className={cn('rich-content', className)} dangerouslySetInnerHTML={{ __html: html }} />
  );
}
