import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_PATH = path.join(ROOT, 'src', 'data', 'games.json');

const allowed = {
  venues: new Set(['dorm', 'livingRoom', 'restaurant', 'outdoor', 'bar']),
  props: new Set(['none', 'paperPen', 'cards', 'dice']),
  vibes: new Set(['icebreaker', 'funny', 'thinking', 'active', 'chat']),
  familiarity: new Set(['low', 'medium', 'high']),
  sourceTypes: new Set(['original', 'traditional', 'adapted'])
};

const failures = [];

function check(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStringArray(value) {
  return Array.isArray(value) && value.length > 0 && value.every(isNonEmptyString);
}

const games = JSON.parse(await readFile(DATA_PATH, 'utf8'));

check(Array.isArray(games), 'games.json 必须是数组。');

if (Array.isArray(games)) {
  const ids = new Set();

  games.forEach((game, index) => {
    const label = game?.id || `第 ${index + 1} 个游戏`;

    check(isNonEmptyString(game.id), `${label}: id 不能为空。`);
    check(!ids.has(game.id), `${label}: id 重复。`);
    ids.add(game.id);

    check(isNonEmptyString(game.name), `${label}: name 不能为空。`);
    check(isNonEmptyString(game.pitch), `${label}: pitch 不能为空。`);
    check(Number.isInteger(game.minPlayers) && game.minPlayers >= 2, `${label}: minPlayers 必须是大于等于 2 的整数。`);
    check(Number.isInteger(game.maxPlayers) && game.maxPlayers >= game.minPlayers, `${label}: maxPlayers 必须大于等于 minPlayers。`);

    check(
      Array.isArray(game.durationMinutes) &&
        game.durationMinutes.length === 2 &&
        game.durationMinutes.every(Number.isFinite) &&
        game.durationMinutes[0] > 0 &&
        game.durationMinutes[1] >= game.durationMinutes[0],
      `${label}: durationMinutes 必须是有效的 [min, max]。`
    );

    check(isStringArray(game.venues) && game.venues.every((value) => allowed.venues.has(value)), `${label}: venues 包含未知值。`);
    check(isStringArray(game.props) && game.props.every((value) => allowed.props.has(value)), `${label}: props 包含未知值。`);
    check(isStringArray(game.vibes) && game.vibes.every((value) => allowed.vibes.has(value)), `${label}: vibes 包含未知值。`);
    check(
      isStringArray(game.familiarity) && game.familiarity.every((value) => allowed.familiarity.has(value)),
      `${label}: familiarity 包含未知值。`
    );

    check(typeof game.aiHost === 'object' && game.aiHost !== null, `${label}: aiHost 缺失。`);
    check(typeof game.aiHost?.supported === 'boolean', `${label}: aiHost.supported 必须是布尔值。`);
    check(typeof game.aiHost?.voiceFriendly === 'boolean', `${label}: aiHost.voiceFriendly 必须是布尔值。`);

    check(isStringArray(game.rules) && game.rules.length <= 5, `${label}: rules 必须是 1～5 条非空字符串。`);
    check(isStringArray(game.hostSteps), `${label}: hostSteps 不能为空。`);
    check(isStringArray(game.safety), `${label}: safety 不能为空。`);
    check(Array.isArray(game.variations), `${label}: variations 必须是数组。`);

    check(typeof game.source === 'object' && game.source !== null, `${label}: source 缺失。`);
    check(allowed.sourceTypes.has(game.source?.type), `${label}: source.type 无效。`);
  });
}

if (failures.length > 0) {
  console.error(`数据校验失败，共 ${failures.length} 个问题：`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`数据校验通过：共 ${games.length} 个游戏。`);
}
