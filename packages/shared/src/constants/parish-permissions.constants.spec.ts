import { describe, expect, it } from 'vitest';
import { ParishDuty, ParishStatus } from '../enums/parish-status.enum';
import {
  hasParishPermission,
  isParishDuty,
  parishPermissions,
  type ParishPermission,
} from './parish-permissions.constants';

const as = (status: ParishStatus, ...duties: ParishDuty[]) => ({ status, duties });

describe('permissions de paroisse', () => {
  it('un fidèle ne voit que la paroisse', () => {
    expect(parishPermissions(as(ParishStatus.FAITHFUL))).toEqual(['parish.view']);
  });

  it('un fidèle ne cumule jamais de responsabilité', () => {
    expect(parishPermissions(as(ParishStatus.FAITHFUL, ParishDuty.PREPARER))).toEqual([
      'parish.view',
    ]);
  });

  it('un paroissien sans responsabilité voit aussi le réservé aux paroissiens', () => {
    const p = as(ParishStatus.PARISHIONER);
    expect(hasParishPermission(p, 'parish.view.members')).toBe(true);
    expect(hasParishPermission(p, 'parish.internal.read')).toBe(false);
  });

  it.each<[ParishDuty, ParishPermission, boolean]>([
    [ParishDuty.READER, 'parish.internal.read', true],
    [ParishDuty.READER, 'parish.celebrations.write', false],
    [ParishDuty.PREPARER, 'parish.internal.read', true],
    [ParishDuty.PREPARER, 'parish.celebrations.write', true],
    [ParishDuty.PREPARER, 'parish.announcements.write', false],
    [ParishDuty.ANNOUNCER, 'parish.announcements.write', true],
    [ParishDuty.ANNOUNCER, 'parish.internal.read', false],
    [ParishDuty.ANNOUNCER, 'parish.manage', false],
  ])('responsabilité %s, permission %s : %s', (duty, perm, expected) => {
    expect(hasParishPermission(as(ParishStatus.PARISHIONER, duty), perm)).toBe(expected);
  });

  it('les responsabilités se cumulent', () => {
    const p = as(ParishStatus.PARISHIONER, ParishDuty.READER, ParishDuty.ANNOUNCER);
    expect(hasParishPermission(p, 'parish.internal.read')).toBe(true);
    expect(hasParishPermission(p, 'parish.announcements.write')).toBe(true);
    expect(hasParishPermission(p, 'parish.celebrations.write')).toBe(false);
  });

  it("l'administrateur a tout", () => {
    const a = as(ParishStatus.PARISH_ADMIN);
    for (const perm of [
      'parish.view',
      'parish.view.members',
      'parish.internal.read',
      'parish.celebrations.write',
      'parish.announcements.write',
      'parish.manage',
    ] as const) {
      expect(hasParishPermission(a, perm)).toBe(true);
    }
  });

  it('isParishDuty', () => {
    expect(isParishDuty('READER')).toBe(true);
    expect(isParishDuty('ADMIN')).toBe(false);
    expect(isParishDuty(3)).toBe(false);
  });
});
