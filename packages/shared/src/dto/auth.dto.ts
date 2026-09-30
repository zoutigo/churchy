export type { RegisterDto, LoginDto } from '../schemas/auth.schema';

export interface AuthTokens {
  accessToken: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  tokens: AuthTokens;
}
