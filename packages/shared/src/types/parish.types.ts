import { ParishRole } from '../enums/parish-role.enum';

export interface Parish {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  city: string;
  country: string;
  region?: string | null;
  district?: string | null;
  address?: string | null;
  /** Indication pour retrouver l'église (« en face de la poste centrale »). */
  addressComplement?: string | null;
  mainChurch?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  imageUrl?: string | null;
  /** Fuseau horaire IANA : les heures des célébrations sont celles de ce fuseau. */
  timezone: string;
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
