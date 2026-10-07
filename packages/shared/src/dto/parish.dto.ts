import type { ParishDuty, ParishStatus } from '../enums/parish-status.enum';
export type {
  CreateParishDto,
  UpdateParishDto,
  UpdateMemberDto,
  ListParishMembersQuery,
  SearchParishesQuery,
} from '../schemas/parish.schema';

/** Appartenance de l'appelant à une paroisse (`status` vide : ni fidèle ni membre). */
export interface ParishMembershipDto {
  status: ParishStatus | null;
  duties: ParishDuty[];
}

/** Ce que l'administrateur voit d'un membre : jamais d'email ni de téléphone. */
export interface ParishMemberDto {
  userId: string;
  firstName: string;
  lastName: string;
  status: ParishStatus;
  duties: ParishDuty[];
  joinedAt: string;
}

export interface ParishMembersPageDto {
  items: ParishMemberDto[];
  total: number;
  page: number;
  pageSize: number;
}
