import { ContentType } from '../enums/content-type.enum';

export interface Content {
  id: string;
  parishId: string;
  title: string;
  type: ContentType;
  body: string;
  language: string;
  tags: string[];
  createdById: string;
  /** Auteur (présent dans les réponses de lecture de l'API). */
  createdBy?: { id: string; firstName: string; lastName: string };
  createdAt: Date;
  updatedAt: Date;
}
