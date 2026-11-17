import {
  BestMergeStats,
  BOARD_COLS,
  BOARD_ROWS,
  SavedMergeGame,
} from '../types/mergeGame';

const KEYS = {
  STATS: 'block_merge_2048_stats_v1',
  SAVED: 'block_merge_2048_saved_v1',
  MUTED: 'block_merge_2048_muted_v1',
};

const DEFAULT_STATS: BestMergeStats = {
  bestScore: 0,
  highestTile: 0,
  maxCombo: 0,
  gamesPlayed: 0,
};

export function loadMergeStats(): BestMergeStats {
  try {
    const raw = localStorage.getItem(KEYS.STATS);
    if (!raw) return { ...DEFAULT_STATS };
    const parsed = JSON.parse(raw) as Partial<BestMergeStats>;
    return {
      bestScore: typeof parsed.bestScore === 'number' ? parsed.bestScore : 0,
      highestTile: typeof parsed.highestTile === 'number' ? parsed.highestTile : 0,
      maxCombo: typeof parsed.maxCombo === 'number' ? parsed.maxCombo : 0,
      gamesPlayed: typeof parsed.gamesPlayed === 'number' ? parsed.gamesPlayed : 0,
    };
  } catch {
    return { ...DEFAULT_STATS };
  }
}

export function saveMergeStats(stats: BestMergeStats): void {
  try {
    localStorage.setItem(KEYS.STATS, JSON.stringify(stats));
  } catch {
    // ignore storage errors
  }
}

export function loadMergeMuted(): boolean {
  try {
    return localStorage.getItem(KEYS.MUTED) === 'true';
  } catch {
    return false;
  }
}

export function saveMergeMuted(muted: boolean): void {
  try {
    localStorage.setItem(KEYS.MUTED, String(muted));
  } catch {
    // ignore
  }
}

export function loadSavedMergeGame(): SavedMergeGame | null {
  try {
    const raw = localStorage.getItem(KEYS.SAVED);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedMergeGame;
    if (
      !parsed ||
      !Array.isArray(parsed.board) ||
      parsed.board.length !== BOARD_ROWS ||
      parsed.board.some((r) => !Array.isArray(r) || r.length !== BOARD_COLS) ||
      typeof parsed.score !== 'number' ||
      typeof parsed.activeValue !== 'number' ||
      typeof parsed.nextValue !== 'number'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveMergeGame(saved: SavedMergeGame): void {
  try {
    localStorage.setItem(KEYS.SAVED, JSON.stringify(saved));
  } catch {
    // ignore
  }
}

export function clearSavedMergeGame(): void {
  try {
    localStorage.removeItem(KEYS.SAVED);
  } catch {
    // ignore
  }
}
