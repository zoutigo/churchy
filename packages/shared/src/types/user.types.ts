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

export interface UserPublic extends Omit<User, 'role'> {}
