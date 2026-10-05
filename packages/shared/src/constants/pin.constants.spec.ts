import { describe, expect, it } from 'vitest';
import { PIN_REGEX, isWeakPin } from './pin.constants';

describe('isWeakPin', () => {
  it.each(['000000', '111111', '999999', '123456', '234567', '654321', '987654'])(
    '%s est trop simple',
    (pin) => expect(isWeakPin(pin)).toBe(true),
  );

  it.each(['123457', '135790', '482915', '100000', '121212', '090909'])('%s est accepté', (pin) =>
    expect(isWeakPin(pin)).toBe(false),
  );

  it('ne juge pas ce qui n’est pas un PIN (la forme est vérifiée ailleurs)', () => {
    expect(isWeakPin('12')).toBe(false);
    expect(isWeakPin('abcdef')).toBe(false);
  });
});

describe('PIN_REGEX', () => {
  it('exige exactement 6 chiffres', () => {
    expect(PIN_REGEX.test('482915')).toBe(true);
    expect(PIN_REGEX.test('48291')).toBe(false);
    expect(PIN_REGEX.test('4829156')).toBe(false);
    expect(PIN_REGEX.test('48291a')).toBe(false);
    expect(PIN_REGEX.test(' 482915')).toBe(false);
    expect(PIN_REGEX.test('482915\n')).toBe(false);
  });
});
