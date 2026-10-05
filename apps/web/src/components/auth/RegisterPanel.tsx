'use client';
import { useState } from 'react';
import { AuthMethodTabs, type AuthMethod } from '@/components/auth/AuthMethodTabs';
import { GoogleAuthSection } from '@/components/auth/GoogleAuthSection';
import { PhoneRegisterForm } from '@/components/auth/PhoneRegisterForm';
import { RegisterForm } from '@/components/auth/RegisterForm';

/** Inscription : Google, puis au choix email + mot de passe ou téléphone + PIN. */
export function RegisterPanel() {
  const [method, setMethod] = useState<AuthMethod>('email');
  return (
    <div className="space-y-4">
      <GoogleAuthSection text="signup_with" />
      <AuthMethodTabs value={method} onChange={setMethod} />
      {method === 'email' ? <RegisterForm /> : <PhoneRegisterForm />}
    </div>
  );
}
