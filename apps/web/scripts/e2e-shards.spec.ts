import { describe, expect, it } from 'vitest';
import { MAX_SHARDS, TESTS_PER_SHARD, countTests, planShards } from './e2e-shards.mjs';

describe('découpage des tests Playwright', () => {
  it('compte les tests dans les suites imbriquées', () => {
    const report = {
      suites: [
        {
          specs: [{ tests: [{}, {}] }],
          suites: [{ specs: [{ tests: [{}] }, { tests: [{}, {}, {}] }] }],
        },
        { specs: [{ tests: [{}] }] },
      ],
    };
    expect(countTests(report)).toBe(7);
    expect(countTests({})).toBe(0);
  });

  it('un shard au minimum, même pour très peu de tests', () => {
    expect(planShards(1)).toEqual({ count: 1, total: 1, shard: [1] });
    expect(planShards(TESTS_PER_SHARD)).toMatchObject({ total: 1 });
  });

  it('ajoute un shard à chaque tranche de tests supplémentaire', () => {
    expect(planShards(TESTS_PER_SHARD + 1).total).toBe(2);
    expect(planShards(59)).toEqual({ count: 59, total: 3, shard: [1, 2, 3] });
    expect(planShards(TESTS_PER_SHARD * 4 + 1).total).toBe(5);
  });

  it('le nombre de shards est plafonné', () => {
    expect(planShards(100_000).total).toBe(MAX_SHARDS);
    expect(planShards(100_000).shard).toHaveLength(MAX_SHARDS);
  });
});
