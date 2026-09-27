export const INTERACTION_CATEGORY_LABELS = {
  icebreaker: '破冰',
  performance: '表演',
  creative: '创意',
  team: '团队',
  talk: '轻聊'
};

export const INTERACTION_INTENSITY_LABELS = {
  1: '轻轻玩',
  2: '有笑点',
  3: '高能'
};

function allowsProps(item, availableProps) {
  const allowed = new Set([...availableProps, 'none']);
  return item.props.every((prop) => allowed.has(prop));
}

export function filterInteractions(interactions, filters = {}) {
  const {
    category = 'any',
    intensity = 'any',
    availableProps = ['none'],
    excludeIds = []
  } = filters;

  return interactions.filter((item) => {
    if (category !== 'any' && item.category !== category) {
      return false;
    }

    if (intensity !== 'any' && item.intensity !== Number(intensity)) {
      return false;
    }

    if (!allowsProps(item, availableProps)) {
      return false;
    }

    return !excludeIds.includes(item.id);
  });
}

export function chooseRandomInteraction(interactions, filters = {}, random = Math.random) {
  const excludedIds = new Set(filters.excludeIds ?? []);

  if (filters.lastInteractionId) {
    excludedIds.add(filters.lastInteractionId);
  }

  let candidates = filterInteractions(interactions, {
    ...filters,
    excludeIds: [...excludedIds]
  });

  if (candidates.length === 0 && filters.lastInteractionId) {
    candidates = filterInteractions(interactions, {
      ...filters,
      excludeIds: filters.excludeIds ?? []
    });
  }

  if (candidates.length === 0) {
    return null;
  }

  const index = Math.min(candidates.length - 1, Math.floor(random() * candidates.length));
  return candidates[index];
}
