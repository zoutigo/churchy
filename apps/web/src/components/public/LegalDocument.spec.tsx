import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { setTestLocale } from '../../../vitest.setup';
import fr from '../../../messages/fr.json';
import en from '../../../messages/en.json';
import { LegalDocument, type LegalNamespace } from './LegalDocument';

const NAMESPACES: LegalNamespace[] = ['terms', 'privacy', 'legalNotice'];

describe('LegalDocument', () => {
  it.each(NAMESPACES)('%s : titre, sommaire et une section par entrée (français)', (ns) => {
    render(<LegalDocument ns={ns} />);
    const sections = fr[ns].sections;
    expect(screen.getByRole('heading', { level: 1, name: fr[ns].title })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(sections.length);
    const toc = screen.getByRole('navigation', { name: fr[ns].tocTitle });
    expect(within(toc).getAllByRole('link')).toHaveLength(sections.length);
    expect(within(toc).getAllByRole('link')[0]).toHaveAttribute('href', '#section-1');
    expect(document.getElementById(`section-${sections.length}`)).not.toBeNull();
    expect(screen.getByText(fr[ns].updated)).toBeInTheDocument();
  });

  it.each(NAMESPACES)('%s : mêmes sections en anglais, lien Contact localisé', (ns) => {
    setTestLocale('en');
    render(<LegalDocument ns={ns} />);
    expect(screen.getByRole('heading', { level: 1, name: en[ns].title })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(en[ns].sections.length);
    expect(screen.getByRole('link', { name: en[ns].contactLink })).toHaveAttribute(
      'href',
      '/en/contact',
    );
  });

  it('chaque version a autant de paragraphes et de puces dans les deux langues', () => {
    for (const ns of NAMESPACES) {
      const shape = (s: (typeof fr)[typeof ns]['sections']) =>
        s.map((x) => [
          x.title ? 1 : 0,
          (x as { paragraphs?: string[] }).paragraphs?.length ?? 0,
          (x as { items?: string[] }).items?.length ?? 0,
        ]);
      expect(shape(en[ns].sections)).toEqual(shape(fr[ns].sections));
    }
  });
});
