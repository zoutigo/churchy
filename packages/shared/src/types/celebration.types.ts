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

export interface Celebration {
  id: string;
  parishId: string;
  templateId: string;
  title: string;
  date: Date;
  location?: string;
  status: CelebrationStatus;
  createdById: string;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CelebrationStep {
  id: string;
  celebrationId: string;
  templateStepId: string;
  title: string;
  order: number;
  contentId?: string;
  customText?: string;
}
