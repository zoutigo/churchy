'use client';
import { useState } from 'react';
import { AuthMethodTabs, type AuthMethod } from '@/components/auth/AuthMethodTabs';
import { GoogleAuthSection } from '@/components/auth/GoogleAuthSection';
import { LoginForm } from '@/components/auth/LoginForm';
import { PhoneLoginForm } from '@/components/auth/PhoneLoginForm';

interface Props {
  /** Destination après connexion (déjà validée par safeNextPath). */
  next?: string;
  initialMethod?: AuthMethod;
}

/** Connexion : Google, puis au choix email + mot de passe ou téléphone + PIN. */
export function LoginPanel({ next, initialMethod = 'email' }: Props) {
  const [method, setMethod] = useState<AuthMethod>(initialMethod);
  return (
    <div className="space-y-4">
      <GoogleAuthSection next={next} text="signin_with" />
      <AuthMethodTabs value={method} onChange={setMethod} />
      {method === 'email' ? <LoginForm next={next} /> : <PhoneLoginForm next={next} />}
    </div>
  );
}
