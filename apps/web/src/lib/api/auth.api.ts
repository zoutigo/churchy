import { api } from './client';
import type { RegisterDto, LoginDto, AuthResponse } from '@churchy/shared';

export const authApi = {
  register: (dto: RegisterDto) => api.post<AuthResponse>('/auth/register', dto),
  login: (dto: LoginDto) => api.post<AuthResponse>('/auth/login', dto),
  me: () => api.get<AuthResponse['user']>('/auth/me'),
};
