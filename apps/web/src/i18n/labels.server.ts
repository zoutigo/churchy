import { getTranslations } from 'next-intl/server';
import { buildLabels } from './labels';

/** Libellés des valeurs de l'API pour les composants serveur asynchrones. */
export const getLabels = async () =>
  buildLabels((await getTranslations('enums')) as unknown as (key: string) => string);
