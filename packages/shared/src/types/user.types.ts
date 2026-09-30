import { UserRole } from '../enums/user-role.enum';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export type UserPublic = Omit<User, 'role'>;
