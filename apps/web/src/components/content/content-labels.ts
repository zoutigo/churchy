import { ContentType } from '@churchy/shared';

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  [ContentType.SONG]: 'Chant',
  [ContentType.PSALM]: 'Psaume',
  [ContentType.GOSPEL]: 'Évangile',
  [ContentType.READING]: 'Lecture',
  [ContentType.PRAYER]: 'Prière',
  [ContentType.UNIVERSAL_PRAYER]: 'Prière universelle',
  [ContentType.ANNOUNCEMENT]: 'Annonce',
  [ContentType.FREE_TEXT]: 'Texte libre',
};
