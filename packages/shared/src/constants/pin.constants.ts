/** Longueur du PIN de connexion par téléphone. */
export const PIN_LENGTH = 6;

export const PIN_REGEX = /^\d{6}$/;

/**
 * PIN trop prévisible : un seul chiffre répété (« 000000 »), suite montante ou descendante (« 123456 »,
 * « 654321 »). Un PIN à 6 chiffres n'a que 10⁶ combinaisons : écarter les plus devinables compte.
 */
export function isWeakPin(pin: string): boolean {
  if (!PIN_REGEX.test(pin)) return false;
  const digits = [...pin].map(Number);
  if (digits.every((d) => d === digits[0])) return true;
  const steps = digits.slice(1).map((d, i) => d - digits[i]);
  return steps.every((s) => s === 1) || steps.every((s) => s === -1);
}
