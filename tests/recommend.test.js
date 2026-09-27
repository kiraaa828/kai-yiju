import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { recommendGames } from '../src/features/recommend.js';
import { buildAiHostPrompt } from '../src/features/ai-host.js';

const games = JSON.parse(await readFile(new URL('../src/data/games.json', import.meta.url), 'utf8'));

test('推荐结果最多三个，并且每一项都属于游戏库', () => {
  const results = recommendGames(games, {
    playerCount: 6,
    venue: 'dorm',
    availableProps: ['none'],
    maxDurationMinutes: 20,
    vibe: 'any',
    familiarity: 'medium',
    useAiHost: false
  });

  assert.ok(results.length <= 3);
  assert.ok(results.length > 0);
  assert.ok(results.every((item) => games.some((game) => game.id === item.game.id)));
});

test('选择 AI 主持时会过滤掉不支持 AI 主持的游戏', () => {
  const results = recommendGames(games, {
    playerCount: 6,
    venue: 'dorm',
    availableProps: ['none'],
    maxDurationMinutes: 30,
    vibe: 'any',
    familiarity: 'medium',
    useAiHost: true
  });

  assert.ok(results.length > 0);
  assert.ok(results.every((item) => item.game.aiHost.supported));
});

test('时长和道具条件会参与硬筛选', () => {
  const results = recommendGames(games, {
    playerCount: 6,
    venue: 'dorm',
    availableProps: ['none'],
    maxDurationMinutes: 15,
    vibe: 'any',
    familiarity: 'medium',
    useAiHost: false
  });

  assert.ok(results.length > 0);
  assert.ok(results.every((item) => item.game.durationMinutes[1] <= 15));
  assert.ok(results.every((item) => item.game.props.every((prop) => prop === 'none')));
});

test('AI 主持人指令包含游戏名、暂停口令和安全要求', () => {
  const game = games.find((item) => item.id === 'two-truths-one-lie');
  const prompt = buildAiHostPrompt(game, { playerCount: 6, venue: 'dorm' });

  assert.match(prompt, /两真一假/);
  assert.match(prompt, /暂停/);
  assert.match(prompt, /安全提示/);
  assert.equal(buildAiHostPrompt(games.find((item) => item.id === 'action-relay')), null);
});
