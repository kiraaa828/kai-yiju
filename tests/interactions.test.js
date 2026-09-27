import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chooseRandomInteraction, filterInteractions } from '../src/features/interactions.js';

const interactions = JSON.parse(await readFile(new URL('../src/data/interactions.json', import.meta.url), 'utf8'));

test('互动库可以按类别和强度筛选', () => {
  const results = filterInteractions(interactions, {
    category: 'icebreaker',
    intensity: 1,
    availableProps: ['none']
  });

  assert.ok(results.length > 0);
  assert.ok(results.every((item) => item.category === 'icebreaker' && item.intensity === 1));
});

test('随机抽取会避开最后一次抽到的互动', () => {
  const first = interactions[0];
  const result = chooseRandomInteraction(
    interactions,
    { availableProps: ['none'], lastInteractionId: first.id },
    () => 0
  );

  assert.ok(result);
  assert.notEqual(result.id, first.id);
});

test('不支持的筛选条件返回空结果', () => {
  const results = filterInteractions(interactions, {
    category: 'team',
    intensity: 3,
    availableProps: ['none']
  });

  assert.equal(results.length, 0);
  assert.equal(chooseRandomInteraction(interactions, { category: 'team', intensity: 3 }), null);
});
