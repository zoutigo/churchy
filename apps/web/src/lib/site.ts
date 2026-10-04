/** URL publique du site (sans barre finale) : sitemap, robots, métadonnées. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://churchy.tigilabs.com'
).replace(/\/+$/, '');
