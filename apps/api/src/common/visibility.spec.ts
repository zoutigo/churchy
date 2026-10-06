import { ParishDuty, ParishStatus } from '@churchy/shared';
import { canSeeMembersContent } from './visibility';

describe('canSeeMembersContent', () => {
  it.each([
    [{ status: ParishStatus.PARISHIONER, duties: [] }, true],
    [{ status: ParishStatus.PARISH_ADMIN, duties: [] }, true],
    [{ status: ParishStatus.FAITHFUL, duties: [] }, false],
    [{ status: ParishStatus.FAITHFUL, duties: [ParishDuty.READER] }, false],
    ['SUPER_ADMIN', true],
    ['PLATFORM_STAFF', true],
    [undefined, false],
  ] as const)('%j : %s', (role, expected) => {
    expect(canSeeMembersContent(role as never)).toBe(expected);
  });
});
