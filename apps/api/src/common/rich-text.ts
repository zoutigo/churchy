import sanitizeHtml from 'sanitize-html';
import { toRichHtml } from '@churchy/shared';

const IMG_DATA = /^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i;
const COLOR = [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/i];

/**
 * Nettoie le HTML de l'éditeur (liste blanche) avant stockage : le site public l'affiche tel quel.
 * Un ancien texte brut est converti en HTML. Les images ne peuvent être que des data:image
 * (base64) ou des adresses http(s).
 */
export function sanitizeRichText(value: string): string {
  return sanitizeHtml(toRichHtml(value), {
    allowedTags: [
      'p',
      'br',
      'h1',
      'h2',
      'h3',
      'strong',
      'em',
      'u',
      's',
      'sub',
      'sup',
      'mark',
      'span',
      'ul',
      'ol',
      'li',
      'blockquote',
      'hr',
      'a',
      'img',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'data-width'],
      th: ['colspan', 'rowspan'],
      td: ['colspan', 'rowspan'],
      ol: ['start'],
      mark: ['style', 'data-color'],
      span: ['style'],
      p: ['style'],
      h1: ['style'],
      h2: ['style'],
      h3: ['style'],
    },
    allowedStyles: {
      '*': {
        color: COLOR,
        'background-color': COLOR,
        'text-align': [/^(left|center|right|justify)$/],
      },
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: { img: ['http', 'https', 'data'] },
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer' },
      }),
      img: (tagName, attribs) => {
        const { src = '', ...rest } = attribs;
        const ok = src.startsWith('data:') ? IMG_DATA.test(src) : /^https?:\/\//i.test(src);
        const width = ['25', '50', '75', '100'].includes(rest['data-width'] ?? '')
          ? { 'data-width': rest['data-width'] }
          : {};
        return {
          tagName,
          attribs: ok ? { src, ...(rest.alt ? { alt: rest.alt } : {}), ...width } : {},
        };
      },
    },
    exclusiveFilter: (frame) => frame.tag === 'img' && !frame.attribs.src,
  });
}
