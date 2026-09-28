export const ROLE_LABELS = {
  steady: '稳一点',
  fun: '笑一点',
  explore: '换换口味'
};

const FUN_VIBES = new Set(['funny', 'active']);

function unique(values) {
  return [...new Set(values)];
}

function passesHardFilters(game, preferences) {
  const {
    playerCount,
    venue,
    availableProps = ['none'],
    maxDurationMinutes = Number.POSITIVE_INFINITY,
    useAiHost = false,
    excludeIds = []
  } = preferences;

  if (playerCount < game.minPlayers || playerCount > game.maxPlayers) {
    return false;
  }

  if (venue && !game.venues.includes(venue)) {
    return false;
  }

  const allowedProps = new Set([...availableProps, 'none']);
  const requiredProps = game.props.filter((prop) => prop !== 'none');

  if (requiredProps.some((prop) => !allowedProps.has(prop))) {
    return false;
  }

  if (game.durationMinutes[1] > maxDurationMinutes) {
    return false;
  }

  if (useAiHost && !game.aiHost.supported) {
    return false;
  }

  if (excludeIds.includes(game.id)) {
    return false;
  }

  return true;
}

function scoreGame(game, preferences) {
  const {
    vibe = 'any',
    useAiHost = false,
    recentIds = [],
    maxDurationMinutes = Number.POSITIVE_INFINITY
  } = preferences;

  let score = 0;
  const reasons = [];

  if (vibe !== 'any' && game.vibes.includes(vibe)) {
    score += 50;
    reasons.push('符合你选择的氛围');
  }

  if (useAiHost && game.aiHost.supported) {
    score += 25;
    reasons.push('支持 AI 主持人指令');
  }

  if (recentIds.includes(game.id)) {
    score -= 18;
  } else if (recentIds.length > 0) {
    score += 8;
    reasons.push('最近没有玩过');
  }

  if (Number.isFinite(maxDurationMinutes) && game.durationMinutes[1] <= maxDurationMinutes) {
    score += 10;
  }

  if (game.aiHost.voiceFriendly) {
    score += 4;
  }

  if (game.familiarity.includes('low')) {
    score += 2;
  }

  if (preferences.venue === 'bar' && game.venues.length === 1 && game.venues[0] === 'bar') {
    score += 60;
    reasons.push('酒吧专属玩法');
  }

  return { game, score, reasons };
}

function pickDiverseGames(rankedGames) {
  if (rankedGames.length === 0) {
    return [];
  }

  const selected = [];
  const selectedIds = new Set();

  const take = (entry) => {
    if (!entry || selectedIds.has(entry.game.id)) {
      return false;
    }

    selected.push(entry);
    selectedIds.add(entry.game.id);
    return true;
  };

  take(rankedGames[0]);

  const funChoice = rankedGames.find((entry) => {
    return !selectedIds.has(entry.game.id) && entry.game.vibes.some((vibe) => FUN_VIBES.has(vibe));
  });
  take(funChoice);

  const usedVibes = new Set(selected.flatMap((entry) => entry.game.vibes));
  const exploreChoice =
    rankedGames.find((entry) => {
      return !selectedIds.has(entry.game.id) && entry.game.vibes.every((vibe) => !usedVibes.has(vibe));
    }) ??
    rankedGames.find((entry) => !selectedIds.has(entry.game.id));

  take(exploreChoice);

  for (const entry of rankedGames) {
    if (selected.length >= 3) {
      break;
    }
    take(entry);
  }

  return selected.slice(0, 3);
}

function buildReason(entry, role) {
  const reasons = unique(entry.reasons);

  if (reasons.length > 0) {
    return reasons.join('，');
  }

  if (role === 'fun') {
    return '规则轻快，适合活跃气氛';
  }

  if (role === 'explore') {
    return '和另外两个结果类型不同，可以换换玩法';
  }

  return '和当前人数、场地、时长匹配';
}

export function recommendGames(games, preferences) {
  const rankedGames = games
    .filter((game) => passesHardFilters(game, preferences))
    .map((game) => scoreGame(game, preferences))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.game.name.localeCompare(right.game.name, 'zh-CN');
    });

  const roles = ['steady', 'fun', 'explore'];

  return pickDiverseGames(rankedGames).map((entry, index) => {
    const role = roles[index];
    return {
      role,
      roleLabel: ROLE_LABELS[role],
      game: entry.game,
      score: entry.score,
      reason: buildReason(entry, role)
    };
  });
}
