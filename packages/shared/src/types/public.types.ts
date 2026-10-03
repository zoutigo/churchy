import { CelebrationType } from '../enums/celebration-type.enum';
import type { Parish } from './parish.types';

/** Les dates circulent en ISO 8601 (JSON). */

/** « Feuille disponible » = célébration publiée ; « en préparation » = annoncée mais pas encore publiée. */
export type SheetStatus = 'AVAILABLE' | 'IN_PREPARATION';

/** Coordonnées publiques d'une paroisse (jamais de membres ni de données internes). */
export type PublicParish = Pick<
  Parish,
  | 'id'
  | 'name'
  | 'description'
  | 'city'
  | 'country'
  | 'district'
  | 'address'
  | 'addressComplement'
  | 'region'
  | 'mainChurch'
  | 'phone'
  | 'email'
  | 'website'
  | 'imageUrl'
  | 'timezone'
>;

/** Une date de célébration, telle que la voit le public. `id` est l'identifiant de l'occurrence. */
export interface PublicCelebrationSummary {
  id: string;
  /** Série à laquelle appartient cette date. */
  celebrationId: string;
  title: string;
  date: string;
  location: string | null;
  type: CelebrationType;
  sheetStatus: SheetStatus;
  /** Date annulée : elle reste affichée comme telle. */
  cancelled: boolean;
  cancelReason: string | null;
  /** Fuseau de la paroisse, pour afficher l'heure locale. */
  timezone: string;
}

/** Dates visibles d'un mois (« AAAA-MM », dans le fuseau de la paroisse), annulées et passées comprises. */
export interface PublicCalendar {
  month: string;
  timezone: string;
  items: PublicCelebrationSummary[];
}

export interface PublicParishSummary extends Pick<
  PublicParish,
  'id' | 'name' | 'city' | 'country' | 'district' | 'mainChurch'
> {
  nextCelebration: PublicCelebrationSummary | null;
}

export interface PublicParishSearchResult {
  items: PublicParishSummary[];
  total: number;
  page: number;
  limit: number;
}

export interface PublicCelebrationStep {
  id: string;
  title: string;
  order: number;
  customText: string | null;
  content: { title: string; body: string } | null;
}

export interface PublicCelebration extends PublicCelebrationSummary {
  /** Description publique de la série puis, s'il y en a une, précision propre à cette date (HTML). */
  description: string | null;
  occurrenceDescription: string | null;
  parish: Pick<PublicParish, 'id' | 'name' | 'city'>;
  /** Vide tant que la feuille n'est pas publiée. */
  steps: PublicCelebrationStep[];
}

export interface PublicAnnouncement {
  id: string;
  title: string;
  summary: string | null;
  body: string;
  imageUrl: string | null;
  publishedAt: string;
}

export interface PublicActivity {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  location: string | null;
  imageUrl: string | null;
}
