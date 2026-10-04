import { uniqueStepKeys } from './step-keys';

describe('uniqueStepKeys', () => {
  it('garde la clé existante et dérive celle des nouvelles étapes du titre', () => {
    expect(
      uniqueStepKeys([{ title: 'Autre titre', key: 'entree' }, { title: 'Chant à Marie' }]),
    ).toEqual(['entree', 'chant-a-marie']);
  });

  it('évite une collision avec une clé déjà prise (existante ou nouvelle)', () => {
    expect(
      uniqueStepKeys([
        { title: 'Psaume', key: 'psaume' },
        { title: 'Psaume' },
        { title: 'Psaume' },
      ]),
    ).toEqual(['psaume', 'psaume-2', 'psaume-3']);
  });
});
