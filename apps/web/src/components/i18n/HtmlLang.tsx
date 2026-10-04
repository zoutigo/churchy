'use client';
import { useEffect } from 'react';
import { useLocale } from 'next-intl';

/**
 * Le `<html lang>` est posé par le layout racine au chargement ; il ne se refait pas quand on change de
 * langue par navigation (le layout racine est conservé). Ce composant le tient à jour.
 */
export function HtmlLang() {
  const locale = useLocale();
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
