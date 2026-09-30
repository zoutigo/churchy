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
  createdAt: Date;
  updatedAt: Date;
}
