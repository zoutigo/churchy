import { api } from './client';
import type {
  AddOccurrencesDto,
  AddSheetStepDto,
  CancelOccurrenceDto,
  CelebrationDetail,
  CelebrationListItem,
  CelebrationTemplate,
  CelebrationTemplateStep,
  ChangeSheetTemplateDto,
  CreateCelebrationDto,
  CreateCelebrationTemplateDto,
  CreateTemplateStepDto,
  CreateSheetDto,
  OccurrenceDetail,
  OccurrenceView,
  ReorderSheetStepsDto,
  SheetView,
  TemplateChangeReport,
  UpdateCelebrationTemplateDto,
  UpdateCelebrationDto,
  UpdateCelebrationStepDto,
  UpdateOccurrenceDto,
} from '@churchy/shared';

export type TemplateWithSteps = CelebrationTemplate & { steps?: CelebrationTemplateStep[] };

export interface TemplateChangeResult {
  applied: boolean;
  report: TemplateChangeReport;
  sheet: SheetView;
}

export const celebrationsApi = {
  create: (parishId: string, dto: CreateCelebrationDto) =>
    api.post<CelebrationDetail>(`/parishes/${parishId}/celebrations`, dto),
  findByParish: (parishId: string) =>
    api.get<CelebrationListItem[]>(`/parishes/${parishId}/celebrations`),
  findById: (id: string) => api.get<CelebrationDetail>(`/celebrations/${id}`),
  update: (id: string, dto: UpdateCelebrationDto) =>
    api.patch<CelebrationDetail>(`/celebrations/${id}`, dto),
  archive: (id: string) => api.post<CelebrationDetail>(`/celebrations/${id}/archive`, {}),
  unarchive: (id: string) => api.post<CelebrationDetail>(`/celebrations/${id}/unarchive`, {}),
  addOccurrences: (id: string, dto: AddOccurrencesDto) =>
    api.post<CelebrationDetail>(`/celebrations/${id}/occurrences`, dto),

  getOccurrence: (id: string) => api.get<OccurrenceDetail>(`/occurrences/${id}`),
  updateOccurrence: (id: string, dto: UpdateOccurrenceDto) =>
    api.patch<OccurrenceView>(`/occurrences/${id}`, dto),
  cancelOccurrence: (id: string, dto: CancelOccurrenceDto) =>
    api.post<OccurrenceView>(`/occurrences/${id}/cancel`, dto),
  reinstateOccurrence: (id: string) => api.post<OccurrenceView>(`/occurrences/${id}/reinstate`, {}),

  createSheet: (occurrenceId: string, dto: CreateSheetDto) =>
    api.post<SheetView>(`/occurrences/${occurrenceId}/sheet`, dto),
  changeTemplate: (sheetId: string, dto: ChangeSheetTemplateDto) =>
    api.patch<TemplateChangeResult>(`/sheets/${sheetId}/template`, dto),
  addStep: (sheetId: string, dto: AddSheetStepDto) =>
    api.post<SheetView>(`/sheets/${sheetId}/steps`, dto),
  updateStep: (sheetId: string, stepId: string, dto: UpdateCelebrationStepDto) =>
    api.patch<SheetView>(`/sheets/${sheetId}/steps/${stepId}`, dto),
  removeStep: (sheetId: string, stepId: string) =>
    api.delete<SheetView>(`/sheets/${sheetId}/steps/${stepId}`),
  reorderSteps: (sheetId: string, dto: ReorderSheetStepsDto) =>
    api.patch<SheetView>(`/sheets/${sheetId}/steps/order`, dto),
  publishSheet: (sheetId: string) => api.post<SheetView>(`/sheets/${sheetId}/publish`, {}),
  unpublishSheet: (sheetId: string) => api.post<SheetView>(`/sheets/${sheetId}/unpublish`, {}),
};

export const templatesApi = {
  findByParish: (parishId: string) =>
    api.get<TemplateWithSteps[]>(`/parishes/${parishId}/templates`),
  create: (parishId: string, dto: CreateCelebrationTemplateDto) =>
    api.post<CelebrationTemplate>(`/parishes/${parishId}/templates`, dto),
  addStep: (templateId: string, dto: CreateTemplateStepDto) =>
    api.post<CelebrationTemplateStep>(`/templates/${templateId}/steps`, dto),
  update: (templateId: string, dto: UpdateCelebrationTemplateDto) =>
    api.patch<TemplateWithSteps>(`/templates/${templateId}`, dto),
  remove: (templateId: string) => api.delete<void>(`/templates/${templateId}`),
};
