import { CelebrationType } from '../enums/celebration-type.enum';
import { CelebrationStatus } from '../enums/celebration-status.enum';
import { ContentType } from '../enums/content-type.enum';

export interface CelebrationTemplate {
  id: string;
  parishId: string;
  name: string;
  type: CelebrationType;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CelebrationTemplateStep {
  id: string;
  templateId: string;
  title: string;
  key: string;
  order: number;
  expectedContentType?: ContentType;
  isRequired: boolean;
}

/** Série de célébrations (ex. « Messe du dimanche ») : porte les informations communes à toutes ses dates. */
export interface Celebration {
  id: string;
  parishId: string;
  title: string;
  type: CelebrationType;
  location?: string | null;
  /** Description publique (HTML). */
  description?: string | null;
  /** Note interne à l'équipe de préparation : jamais exposée au public. */
  internalNote?: string | null;
  /** Visible du public (toutes les dates). */
  announced: boolean;
  defaultTemplateId?: string | null;
  archivedAt?: Date | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export type OccurrenceStatus = 'SCHEDULED' | 'CANCELLED';

/** Une date d'une série. Le passé est immuable. */
export interface CelebrationOccurrence {
  id: string;
  celebrationId: string;
  parishId: string;
  startsAt: Date;
  description?: string | null;
  internalNote?: string | null;
  status: OccurrenceStatus;
  cancelReason?: string | null;
}

/** Feuille de préparation d'une date (créée à la demande, depuis un modèle ou à la volée). */
export interface PreparationSheet {
  id: string;
  occurrenceId: string;
  templateId?: string | null;
  status: CelebrationStatus;
  publishedAt?: Date | null;
}

export interface CelebrationStep {
  id: string;
  sheetId: string;
  templateStepId?: string | null;
  key: string;
  title: string;
  order: number;
  contentId?: string | null;
  customText?: string | null;
}

/* ------------------------------------------------------------------------------------------------
 * Réponses de l'API (dates en ISO 8601). `internalNote` est absente pour les rôles qui n'ont pas
 * accès aux notes internes (lecteur, spectateur).
 * ---------------------------------------------------------------------------------------------- */

export interface SheetStepView {
  id: string;
  key: string;
  title: string;
  order: number;
  /** Null pour une étape libre (ajoutée à la volée ou conservée après un changement de modèle). */
  templateStepId: string | null;
  contentId: string | null;
  customText: string | null;
  content: { id: string; title: string; type: string } | null;
}

export interface SheetView {
  id: string;
  occurrenceId: string;
  templateId: string | null;
  status: CelebrationStatus;
  publishedAt: string | null;
  steps: SheetStepView[];
}

export interface OccurrenceSheetSummary {
  id: string;
  status: CelebrationStatus;
  publishedAt: string | null;
  stepCount: number;
  filledCount: number;
}

export interface OccurrenceView {
  id: string;
  celebrationId: string;
  startsAt: string;
  /** Passée : plus aucune modification possible. */
  isPast: boolean;
  status: OccurrenceStatus;
  cancelReason: string | null;
  description: string | null;
  internalNote?: string | null;
  sheet: OccurrenceSheetSummary | null;
}

export interface CelebrationListItem {
  id: string;
  title: string;
  type: CelebrationType;
  location: string | null;
  announced: boolean;
  archivedAt: string | null;
  defaultTemplate: { id: string; name: string } | null;
  occurrenceCount: number;
  upcomingCount: number;
  nextOccurrence: { id: string; startsAt: string; status: OccurrenceStatus } | null;
  lastOccurrenceAt: string | null;
  /** La dernière date approche (moins de 30 jours) : il faut penser à prolonger la série. */
  endingSoon: boolean;
}

export interface CelebrationDetail {
  id: string;
  parishId: string;
  title: string;
  type: CelebrationType;
  location: string | null;
  description: string | null;
  internalNote?: string | null;
  announced: boolean;
  archivedAt: string | null;
  defaultTemplate: { id: string; name: string } | null;
  timezone: string;
  lastOccurrenceAt: string | null;
  endingSoon: boolean;
  occurrences: OccurrenceView[];
}

export interface OccurrenceDetail extends OccurrenceView {
  parishId: string;
  timezone: string;
  celebration: {
    id: string;
    title: string;
    type: CelebrationType;
    location: string | null;
    description: string | null;
    internalNote?: string | null;
    announced: boolean;
    defaultTemplate: { id: string; name: string } | null;
  };
  sheet: (OccurrenceSheetSummary & SheetView) | null;
}

export interface TemplateStepRef {
  key: string;
  title: string;
}

/** Ce que ferait (ou a fait) un changement de modèle sur une feuille. Rien n'est perdu en silence. */
export interface TemplateChangeReport {
  /** Étapes qui ont un équivalent dans le nouveau modèle : contenu conservé. */
  kept: TemplateStepRef[];
  /** Étapes du nouveau modèle ajoutées, vides. */
  added: TemplateStepRef[];
  /** Étapes vides sans équivalent : retirées. */
  removed: TemplateStepRef[];
  /** Étapes remplies sans équivalent : conservées comme étapes libres (à retirer à la main si besoin). */
  keptAsFree: TemplateStepRef[];
}
