import { ParishRole } from '../enums/parish-role.enum';

export interface Parish {
  id: string;
  name: string;
  slug: string;
  description?: string;
  city: string;
  country: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ParishMember {
  id: string;
  userId: string;
  parishId: string;
  role: ParishRole;
  createdAt: Date;
  updatedAt: Date;
}
