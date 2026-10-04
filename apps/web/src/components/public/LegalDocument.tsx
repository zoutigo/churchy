import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/link';
import { ProsePage } from './ProsePage';

export type LegalNamespace = 'terms' | 'privacy' | 'legalNotice';

interface LegalSection {
  title: string;
  paragraphs?: string[];
  items?: string[];
  after?: string[];
}

/**
 * Page légale longue : introduction, sommaire cliquable puis sections numérotées. Le contenu vient des
 * messages (`<ns>.sections`, un tableau de { title, paragraphs?, items?, after? }) pour rester identique
 * en français et en anglais.
 */
export function LegalDocument({ ns }: { ns: LegalNamespace }) {
  const t = useTranslations(ns);
  const sections = t.raw('sections') as LegalSection[];
  return (
    <ProsePage title={t('title')} intro={t('intro')} updated={t('updated')} provisional>
      <nav aria-label={t('tocTitle')} className="rounded-lg border border-churchy-700/15 p-4">
        <p className="mb-2 font-playfair text-lg font-semibold text-churchy-700">{t('tocTitle')}</p>
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          {sections.map((s, i) => (
            <li key={i}>
              <a href={`#section-${i + 1}`} className="underline-offset-2 hover:underline">
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      {sections.map((s, i) => (
        <section key={i} id={`section-${i + 1}`} className="scroll-mt-24">
          <h2>
            {i + 1}. {s.title}
          </h2>
          <div className="space-y-3">
            {s.paragraphs?.map((p, j) => (
              <p key={j}>{p}</p>
            ))}
            {s.items && (
              <ul>
                {s.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            )}
            {s.after?.map((p, j) => (
              <p key={`a${j}`}>{p}</p>
            ))}
          </div>
        </section>
      ))}
      <p>
        <Link href="/contact" className="font-medium text-churchy-700 underline underline-offset-2">
          {t('contactLink')}
        </Link>
      </p>
    </ProsePage>
  );
}
