export function saveSession(token: string) {
  localStorage.setItem('churchy_token', token);
}

export function clearSession() {
  localStorage.removeItem('churchy_token');
}

export function getSession(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('churchy_token');
}

export function isAuthenticated(): boolean {
  return !!getSession();
}
