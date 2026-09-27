const STORAGE_KEY = 'kai-ju:v1';

const DEFAULT_STATE = {
  favoriteGameIds: [],
  recentGameIds: [],
  dislikedGameIds: [],
  lastPreferences: null
};

function getStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function normalizeState(value) {
  return {
    ...DEFAULT_STATE,
    ...(value && typeof value === 'object' ? value : {})
  };
}

export function loadAppState() {
  const storage = getStorage();

  if (!storage) {
    return structuredClone(DEFAULT_STATE);
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);
    return normalizeState(raw ? JSON.parse(raw) : null);
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

export function saveAppState(partialState) {
  const nextState = {
    ...loadAppState(),
    ...partialState
  };

  const storage = getStorage();
  storage?.setItem(STORAGE_KEY, JSON.stringify(nextState));
  return nextState;
}

export function saveLastPreferences(preferences) {
  return saveAppState({ lastPreferences: preferences });
}

function toggleId(list, id) {
  return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
}

export function toggleFavorite(gameId) {
  const state = loadAppState();
  return saveAppState({ favoriteGameIds: toggleId(state.favoriteGameIds, gameId) });
}

export function toggleDisliked(gameId) {
  const state = loadAppState();
  return saveAppState({ dislikedGameIds: toggleId(state.dislikedGameIds, gameId) });
}

export function recordPlayed(gameId) {
  const state = loadAppState();
  const recentGameIds = [gameId, ...state.recentGameIds.filter((id) => id !== gameId)].slice(0, 8);
  return saveAppState({ recentGameIds });
}
