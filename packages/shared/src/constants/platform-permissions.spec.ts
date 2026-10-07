import { describe, expect, it } from 'vitest';
import { UserRole } from '../enums/user-role.enum';
import {
  canChangePlatformRole,
  canSuspendAccount,
  hasPlatformPermission,
  isPlatformRole,
  PLATFORM_ROLE_RANK,
} from './platform-permissions.constants';

const { SUPER_ADMIN: SA, ADMIN: AD, MODERATOR: MO, USER: US } = UserRole;

describe('permissions de plateforme', () => {
  it('classe les rôles du plus élevé au plus bas', () => {
    expect(PLATFORM_ROLE_RANK[SA]).toBeGreaterThan(PLATFORM_ROLE_RANK[AD]);
    expect(PLATFORM_ROLE_RANK[AD]).toBeGreaterThan(PLATFORM_ROLE_RANK[MO]);
    expect(PLATFORM_ROLE_RANK[MO]).toBeGreaterThan(PLATFORM_ROLE_RANK[US]);
  });

  it("un compte ordinaire n'a aucune permission ; une valeur inconnue non plus", () => {
    expect(hasPlatformPermission(US, 'platform.access')).toBe(false);
    expect(hasPlatformPermission('HACKER', 'platform.access')).toBe(false);
    expect(hasPlatformPermission(undefined, 'platform.access')).toBe(false);
    expect(isPlatformRole(US)).toBe(false);
    expect([SA, AD, MO].every(isPlatformRole)).toBe(true);
  });

  it('le modérateur entre dans la plateforme mais ne gère ni rôles ni comptes', () => {
    expect(hasPlatformPermission(MO, 'platform.access')).toBe(true);
    expect(hasPlatformPermission(MO, 'platform.contact.read')).toBe(true);
    expect(hasPlatformPermission(MO, 'platform.content.moderate')).toBe(true);
    expect(hasPlatformPermission(MO, 'platform.roles.manage')).toBe(false);
    expect(hasPlatformPermission(MO, 'platform.users.suspend')).toBe(false);
    expect(hasPlatformPermission(MO, 'platform.users.read')).toBe(false);
  });

  describe('canChangePlatformRole', () => {
    it('le SUPER_ADMIN gère tous les rôles', () => {
      for (const target of [SA, AD, MO, US]) {
        for (const next of [SA, AD, MO, US])
          expect(canChangePlatformRole(SA, target, next)).toBe(true);
      }
    });

    it("l'ADMIN gère seulement MODERATOR et USER", () => {
      expect(canChangePlatformRole(AD, US, MO)).toBe(true);
      expect(canChangePlatformRole(AD, MO, US)).toBe(true);
    });

    it("l'ADMIN ne touche ni au SUPER_ADMIN, ni à un ADMIN, et ne crée pas d'ADMIN", () => {
      expect(canChangePlatformRole(AD, SA, US)).toBe(false);
      expect(canChangePlatformRole(AD, AD, US)).toBe(false);
      expect(canChangePlatformRole(AD, US, AD)).toBe(false);
      expect(canChangePlatformRole(AD, US, SA)).toBe(false);
      expect(canChangePlatformRole(AD, MO, SA)).toBe(false);
    });

    it("le modérateur et l'utilisateur ne gèrent aucun rôle", () => {
      expect(canChangePlatformRole(MO, US, MO)).toBe(false);
      expect(canChangePlatformRole(US, US, MO)).toBe(false);
    });
  });

  describe('canSuspendAccount', () => {
    it('le SUPER_ADMIN suspend tout le monde sauf lui-même', () => {
      expect(canSuspendAccount(SA, AD, false)).toBe(true);
      expect(canSuspendAccount(SA, SA, false)).toBe(true);
      expect(canSuspendAccount(SA, SA, true)).toBe(false);
    });

    it("l'ADMIN suspend MODERATOR et USER seulement", () => {
      expect(canSuspendAccount(AD, MO, false)).toBe(true);
      expect(canSuspendAccount(AD, US, false)).toBe(true);
      expect(canSuspendAccount(AD, AD, false)).toBe(false);
      expect(canSuspendAccount(AD, SA, false)).toBe(false);
      expect(canSuspendAccount(AD, MO, true)).toBe(false);
    });

    it("le modérateur et l'utilisateur ne suspendent personne", () => {
      expect(canSuspendAccount(MO, US, false)).toBe(false);
      expect(canSuspendAccount(US, US, false)).toBe(false);
    });
  });
});
