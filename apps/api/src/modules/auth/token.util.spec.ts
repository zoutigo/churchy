import { generateToken, hashToken } from './token.util';

describe('token.util', () => {
  it('génère des jetons opaques, longs et uniques', () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(43); // 32 octets en base64url
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('hache de façon déterministe, sans jamais renvoyer le jeton', () => {
    const token = generateToken();
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).not.toContain(token);
    expect(hashToken(token)).toMatch(/^[0-9a-f]{64}$/);
  });
});
