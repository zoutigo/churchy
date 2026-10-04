import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { disallowedPaths } from '@/lib/sitemap';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: disallowedPaths() },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
