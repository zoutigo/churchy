import { useTranslations } from 'next-intl';
import type { CelebrationType, ContactTopic, ContentType, SheetStatus } from '@churchy/shared';

/** Libellés des valeurs de l'API (types de célébration, de contenu, état de la feuille…), dans la langue courante. */
type T = (key: string) => string;
export const buildLabels = (t: T) => ({
  celebrationType: (v: CelebrationType) => t(`celebrationType.${v}`),
  contentType: (v: ContentType) => t(`contentType.${v}`),
  sheetStatus: (v: SheetStatus) => t(`sheetStatus.${v}`),
  contactTopic: (v: ContactTopic) => t(`contactTopic.${v}`),
});

/** Composants (client, ou serveur non asynchrones). Les composants serveur asynchrones : `getLabels` (labels.server.ts). */
export const useLabels = () => buildLabels(useTranslations('enums') as unknown as T);
