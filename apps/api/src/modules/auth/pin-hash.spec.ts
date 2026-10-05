import * as bcrypt from 'bcrypt';
import { hashPin, pinHashNeedsUpgrade, verifyPin } from './pin-hash';

const PEPPER = 'p'.repeat(40);
const OTHER = 'q'.repeat(40);

describe('pin-hash', () => {
  it('poivre le PIN : le haché porte le préfixe et ne correspond pas au PIN nu', async () => {
    const hash = await hashPin('482915', PEPPER);
    expect(hash.startsWith('p1$')).toBe(true);
    expect(await bcrypt.compare('482915', hash.slice(3))).toBe(false);
  });

  it('vérifie un PIN poivré, refuse un autre PIN', async () => {
    const hash = await hashPin('482915', PEPPER);
    expect(await verifyPin('482915', hash, PEPPER)).toBe(true);
    expect(await verifyPin('482916', hash, PEPPER)).toBe(false);
  });

  it('une base volée ne suffit pas : mauvais poivre ou poivre absent = refus', async () => {
    const hash = await hashPin('482915', PEPPER);
    expect(await verifyPin('482915', hash, OTHER)).toBe(false);
    expect(await verifyPin('482915', hash, null)).toBe(false);
  });

  it('sans poivre (dev/test), bcrypt nu', async () => {
    const hash = await hashPin('482915', null);
    expect(hash.startsWith('$2')).toBe(true);
    expect(await verifyPin('482915', hash, null)).toBe(true);
  });

  it('accepte un ancien haché nu même avec poivre, et demande sa mise à niveau', async () => {
    const legacy = await bcrypt.hash('482915', 4);
    expect(await verifyPin('482915', legacy, PEPPER)).toBe(true);
    expect(await verifyPin('000001', legacy, PEPPER)).toBe(false);
    expect(pinHashNeedsUpgrade(legacy, PEPPER)).toBe(true);
    expect(pinHashNeedsUpgrade(await hashPin('482915', PEPPER), PEPPER)).toBe(false);
    expect(pinHashNeedsUpgrade(legacy, null)).toBe(false);
  });
});
