import { api } from './client';
import type {
  AddEmailDto,
  AdminPinResetDto,
  AuthProvidersDto,
  AuthResponse,
  AuthUserDto,
  ChangePinDto,
  ForgotPasswordDto,
  ForgotPinDto,
  GoogleAuthDto,
  GoogleAuthResponse,
  GoogleLinkDto,
  LinkGoogleDto,
  LoginDto,
  LoginPhoneDto,
  Locale,
  PinResetLinkDto,
  RegisterDto,
  RegisterPhoneDto,
  ResetPasswordDto,
  ResetPinDto,
  SetPasswordDto,
  SetPhonePinDto,
  UnlinkGoogleDto,
  VerifyEmailDto,
} from '@churchy/shared';

interface MessageResponse {
  message?: string;
  ok?: boolean;
}

export const authApi = {
  register: (dto: RegisterDto) => api.post<AuthResponse>('/auth/register', dto),
  login: (dto: LoginDto) => api.post<AuthResponse>('/auth/login', dto),
  registerPhone: (dto: RegisterPhoneDto) => api.post<AuthResponse>('/auth/register/phone', dto),
  loginPhone: (dto: LoginPhoneDto) => api.post<AuthResponse>('/auth/login/phone', dto),
  forgotPin: (dto: ForgotPinDto) => api.post<MessageResponse>('/auth/forgot-pin', dto),
  resetPin: (dto: ResetPinDto) => api.post<MessageResponse>('/auth/reset-pin', dto),
  providers: () => api.get<AuthProvidersDto>('/auth/providers'),
  google: (dto: GoogleAuthDto) => api.post<GoogleAuthResponse>('/auth/google', dto),
  googleLink: (dto: GoogleLinkDto) => api.post<AuthResponse>('/auth/google/link', dto),
  logout: () => api.post<MessageResponse>('/auth/logout'),
  me: () => api.get<AuthUserDto>('/auth/me'),
  updateLocale: (locale: Locale) => api.patch<AuthUserDto>('/auth/me/locale', { locale }),
  forgotPassword: (dto: ForgotPasswordDto) =>
    api.post<MessageResponse>('/auth/forgot-password', dto),
  resetPassword: (dto: ResetPasswordDto) => api.post<MessageResponse>('/auth/reset-password', dto),
  verifyEmail: (dto: VerifyEmailDto) => api.post<MessageResponse>('/auth/verify-email', dto),
  // Sécurité du compte
  addEmail: (dto: AddEmailDto) => api.put<AuthUserDto>('/auth/me/email', dto),
  setPassword: (dto: SetPasswordDto) => api.put<AuthResponse>('/auth/me/password', dto),
  setPhonePin: (dto: SetPhonePinDto) => api.put<AuthResponse>('/auth/me/phone-pin', dto),
  changePin: (dto: ChangePinDto) => api.patch<AuthResponse>('/auth/me/pin', dto),
  linkGoogle: (dto: LinkGoogleDto) => api.put<AuthUserDto>('/auth/me/google', dto),
  unlinkGoogle: (dto: UnlinkGoogleDto) => api.post<AuthUserDto>('/auth/me/google/unlink', dto),
  adminPinResetLink: (dto: AdminPinResetDto) =>
    api.post<PinResetLinkDto>('/admin/auth/pin-reset-link', dto),
  resendVerification: () => api.post<MessageResponse>('/auth/resend-verification'),
};
