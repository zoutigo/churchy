import type { Metadata } from 'next';
import { staticPageMetadata } from '@/lib/seo.server';
import { LegalDocument } from '@/components/public/LegalDocument';

export const generateMetadata = (): Promise<Metadata> =>
  staticPageMetadata('/conditions-generales', 'terms');

export default function Page() {
  return <LegalDocument ns="terms" />;
}
