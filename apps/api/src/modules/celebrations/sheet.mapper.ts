import type {
  CelebrationStatus,
  OccurrenceSheetSummary,
  SheetStepView,
  SheetView,
} from '@churchy/shared';

/** Feuille avec ses étapes ordonnées et le contenu lié (titre seulement : le corps reste côté bibliothèque). */
export const SHEET_INCLUDE = {
  steps: {
    orderBy: { order: 'asc' },
    include: { content: { select: { id: true, title: true, type: true } } },
  },
} as const;

type StepFill = { contentId: string | null; customText: string | null };

export const isStepFilled = (step: StepFill): boolean =>
  Boolean(step.contentId) || Boolean(step.customText?.trim());

interface SheetRow {
  id: string;
  status: string;
  publishedAt: Date | null;
  steps: StepFill[];
}

export function toSheetSummary(sheet: SheetRow): OccurrenceSheetSummary {
  return {
    id: sheet.id,
    status: sheet.status as CelebrationStatus,
    publishedAt: sheet.publishedAt ? sheet.publishedAt.toISOString() : null,
    stepCount: sheet.steps.length,
    filledCount: sheet.steps.filter(isStepFilled).length,
  };
}

interface SheetViewRow extends SheetRow {
  occurrenceId: string;
  templateId: string | null;
  steps: (StepFill & {
    id: string;
    key: string;
    title: string;
    order: number;
    templateStepId: string | null;
    content?: { id: string; title: string; type: string } | null;
  })[];
}

export function toSheetView(sheet: SheetViewRow): SheetView {
  return {
    id: sheet.id,
    occurrenceId: sheet.occurrenceId,
    templateId: sheet.templateId,
    status: sheet.status as CelebrationStatus,
    publishedAt: sheet.publishedAt ? sheet.publishedAt.toISOString() : null,
    steps: sheet.steps.map((s): SheetStepView => ({
      id: s.id,
      key: s.key,
      title: s.title,
      order: s.order,
      templateStepId: s.templateStepId,
      contentId: s.contentId,
      customText: s.customText,
      content: s.content ?? null,
    })),
  };
}
