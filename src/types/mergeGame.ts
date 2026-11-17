export const BOARD_COLS = 5;
export const BOARD_ROWS = 7;

export type GameScreenState = 'TITLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export type BoosterType = 'hammer' | 'bomb' | 'shuffle' | 'undo';

export interface TileCell {
  id: number;
  value: number;
  justMerged?: boolean;
}

export type BoardGrid = (TileCell | null)[][];

export interface BoosterCounts {
  hammer: number;
  bomb: number;
  shuffle: number;
  undo: number;
}

export interface HistorySnapshot {
  board: BoardGrid;
  score: number;
  activeValue: number;
  nextValue: number;
  maxTile: number;
  level: number;
}

export interface ParticleBurst {
  id: number;
  row: number;
  col: number;
  color: string;
  count: number;
}

export interface ComboBanner {
  id: number;
  row: number;
  col: number;
  combo: number;
  points: number;
  value: number;
}

export interface BestMergeStats {
  bestScore: number;
  highestTile: number;
  maxCombo: number;
  gamesPlayed: number;
}

export interface SavedMergeGame {
  board: BoardGrid;
  score: number;
  activeValue: number;
  nextValue: number;
  maxTile: number;
  level: number;
  boosters: BoosterCounts;
  maxComboThisRun: number;
  reached2048: boolean;
  history: HistorySnapshot[];
  updatedAt: number;
}
