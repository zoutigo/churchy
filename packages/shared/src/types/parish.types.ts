import { ParishRole } from '../enums/parish-role.enum';

export interface Parish {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  city: string;
  country: string;
  district?: string | null;
  address?: string | null;
  mainChurch?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  imageUrl?: string | null;
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
