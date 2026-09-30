import { api } from './client';
import type {
  AuthResponse,
  AuthUserDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from '@churchy/shared';

interface MessageResponse {
  message?: string;
  ok?: boolean;
}

export const authApi = {
  register: (dto: RegisterDto) => api.post<AuthResponse>('/auth/register', dto),
  login: (dto: LoginDto) => api.post<AuthResponse>('/auth/login', dto),
  logout: () => api.post<MessageResponse>('/auth/logout'),
  me: () => api.get<AuthUserDto>('/auth/me'),
  forgotPassword: (dto: ForgotPasswordDto) =>
    api.post<MessageResponse>('/auth/forgot-password', dto),
  resetPassword: (dto: ResetPasswordDto) => api.post<MessageResponse>('/auth/reset-password', dto),
  verifyEmail: (dto: VerifyEmailDto) => api.post<MessageResponse>('/auth/verify-email', dto),
  resendVerification: () => api.post<MessageResponse>('/auth/resend-verification'),
};
