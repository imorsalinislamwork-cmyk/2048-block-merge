import { BOARD_COLS, BOARD_ROWS, BoardGrid, TileCell } from '../types/mergeGame';

let nextTileIdCounter = 1000;

export function createTileId(): number {
  nextTileIdCounter += 1;
  return nextTileIdCounter;
}

export function syncTileIdCounter(board: BoardGrid): void {
  let maxId = nextTileIdCounter;
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const cell = board[r]?.[c];
      if (cell && cell.id > maxId) {
        maxId = cell.id;
      }
    }
  }
  nextTileIdCounter = maxId + 1;
}

export function createEmptyBoard(): BoardGrid {
  return Array.from({ length: BOARD_ROWS }, () =>
    Array.from({ length: BOARD_COLS }, () => null)
  );
}

export function cloneBoard(board: BoardGrid): BoardGrid {
  return board.map((row) =>
    row.map((cell) => (cell ? { id: cell.id, value: cell.value, justMerged: false } : null))
  );
}

export function createStarterBoard(): BoardGrid {
  const board = createEmptyBoard();
  // Seed a clean, inviting bottom row of 3 starter blocks that never pre-merge
  const starterVals = [2, 4, 8];
  const cols = [1, 2, 3];
  for (let i = 0; i < cols.length; i++) {
    board[BOARD_ROWS - 1][cols[i]] = {
      id: createTileId(),
      value: starterVals[i],
    };
  }
  return board;
}

export function getHighestTileOnBoard(board: BoardGrid): number {
  let highest = 2;
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const cell = board[r][c];
      if (cell && cell.value > highest) {
        highest = cell.value;
      }
    }
  }
  return highest;
}

/**
 * Progressive spawn pool:
 * Starts with 2, 4, 8, 16.
 * Unlocks 32 at maxTile >= 128, retires 2 at maxTile >= 512, unlocks 64 at maxTile >= 512,
 * and retires 4 at maxTile >= 2048 so late-game merges remain thrilling and fast.
 */
export function getSpawnWeights(maxTile: number): Array<{ value: number; weight: number }> {
  if (maxTile >= 2048) {
    return [
      { value: 8, weight: 22 },
      { value: 16, weight: 30 },
      { value: 32, weight: 28 },
      { value: 64, weight: 14 },
      { value: 128, weight: 6 },
    ];
  }
  if (maxTile >= 512) {
    return [
      { value: 4, weight: 22 },
      { value: 8, weight: 30 },
      { value: 16, weight: 26 },
      { value: 32, weight: 16 },
      { value: 64, weight: 6 },
    ];
  }
  if (maxTile >= 128) {
    return [
      { value: 2, weight: 20 },
      { value: 4, weight: 28 },
      { value: 8, weight: 26 },
      { value: 16, weight: 18 },
      { value: 32, weight: 8 },
    ];
  }
  if (maxTile >= 32) {
    return [
      { value: 2, weight: 32 },
      { value: 4, weight: 32 },
      { value: 8, weight: 24 },
      { value: 16, weight: 12 },
    ];
  }
  return [
    { value: 2, weight: 42 },
    { value: 4, weight: 36 },
    { value: 8, weight: 16 },
    { value: 16, weight: 6 },
  ];
}

export function pickNextBlockValue(maxTile: number): number {
  const pool = getSpawnWeights(maxTile);
  const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const item of pool) {
    roll -= item.weight;
    if (roll <= 0) return item.value;
  }
  return pool[0].value;
}

export function computeLevel(maxTile: number): number {
  if (maxTile >= 4096) return 8;
  if (maxTile >= 2048) return 7;
  if (maxTile >= 1024) return 6;
  if (maxTile >= 512) return 5;
  if (maxTile >= 256) return 4;
  if (maxTile >= 128) return 3;
  if (maxTile >= 64) return 2;
  return 1;
}

export function getNextMilestone(maxTile: number): number {
  const milestones = [64, 128, 256, 512, 1024, 2048, 4096, 8192];
  for (const m of milestones) {
    if (maxTile < m) return m;
  }
  return maxTile * 2;
}

export interface DropTargetResult {
  canDrop: boolean;
  targetRow: number;
  isTopMerge: boolean;
}

/**
 * Finds the landing row in column `col` for a block with `activeValue`.
 * If the column is completely full (row 0 occupied), allows dropping ONLY if
 * the top block in that column matches `activeValue` (top-edge merge).
 */
export function getDropTarget(
  board: BoardGrid,
  col: number,
  activeValue: number
): DropTargetResult {
  if (col < 0 || col >= BOARD_COLS) {
    return { canDrop: false, targetRow: -1, isTopMerge: false };
  }

  // Scan bottom-to-top for lowest empty cell
  for (let r = BOARD_ROWS - 1; r >= 0; r--) {
    if (board[r][col] === null) {
      return { canDrop: true, targetRow: r, isTopMerge: false };
    }
  }

  // Column is full: allow merge with top block if values match
  const topCell = board[0][col];
  if (topCell && topCell.value === activeValue) {
    return { canDrop: true, targetRow: 0, isTopMerge: true };
  }

  return { canDrop: false, targetRow: -1, isTopMerge: false };
}

export function hasAnyValidMove(board: BoardGrid, activeValue: number): boolean {
  for (let c = 0; c < BOARD_COLS; c++) {
    if (getDropTarget(board, c, activeValue).canDrop) {
      return true;
    }
  }
  return false;
}

export function countOccupiedCells(board: BoardGrid): number {
  let count = 0;
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      if (board[r][c] !== null) count++;
    }
  }
  return count;
}

export interface Coord {
  row: number;
  col: number;
}

const ORTHOGONAL_DIRS: Coord[] = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
];

export function getMatchingNeighbors(board: BoardGrid, row: number, col: number): Coord[] {
  const cell = board[row]?.[col];
  if (!cell) return [];
  const matches: Coord[] = [];
  for (const d of ORTHOGONAL_DIRS) {
    const nr = row + d.row;
    const nc = col + d.col;
    if (nr >= 0 && nr < BOARD_ROWS && nc >= 0 && nc < BOARD_COLS) {
      const neighbor = board[nr][nc];
      if (neighbor && neighbor.value === cell.value) {
        matches.push({ row: nr, col: nc });
      }
    }
  }
  return matches;
}

export interface MergeWaveResult {
  merged: boolean;
  board: BoardGrid;
  anchor: Coord | null;
  newValue: number;
  consumedCount: number;
}

/**
 * Resolves a single merge step prioritizing `priorityCoords` first, then scanning bottom-to-top.
 * Consumes orthogonal matching neighbors into a single higher-value tile.
 */
export function resolveSingleMergeStep(
  inputBoard: BoardGrid,
  priorityCoords: Coord[] = []
): MergeWaveResult {
  const board = cloneBoard(inputBoard);

  const candidates: Coord[] = [...priorityCoords];
  for (let r = BOARD_ROWS - 1; r >= 0; r--) {
    for (let c = 0; c < BOARD_COLS; c++) {
      candidates.push({ row: r, col: c });
    }
  }

  for (const coord of candidates) {
    const cell = board[coord.row]?.[coord.col];
    if (!cell) continue;

    const neighbors = getMatchingNeighbors(board, coord.row, coord.col);
    if (neighbors.length === 0) continue;

    // If matching ONLY vertically below, anchor at the lower cell to prevent unnecessary float gap
    const onlyBelow =
      neighbors.length === 1 &&
      neighbors[0].col === coord.col &&
      neighbors[0].row === coord.row + 1;

    const anchorRow = onlyBelow ? neighbors[0].row : coord.row;
    const anchorCol = onlyBelow ? neighbors[0].col : coord.col;
    const targetTile = board[anchorRow][anchorCol]!;

    const newValue = cell.value * Math.pow(2, neighbors.length);

    if (onlyBelow) {
      board[coord.row][coord.col] = null;
    } else {
      for (const n of neighbors) {
        board[n.row][n.col] = null;
      }
    }

    board[anchorRow][anchorCol] = {
      id: targetTile.id,
      value: newValue,
      justMerged: true,
    };

    return {
      merged: true,
      board,
      anchor: { row: anchorRow, col: anchorCol },
      newValue,
      consumedCount: neighbors.length,
    };
  }

  return {
    merged: false,
    board,
    anchor: null,
    newValue: 0,
    consumedCount: 0,
  };
}

export interface GravityResult {
  moved: boolean;
  board: BoardGrid;
  movedCoords: Coord[];
}

/**
 * Collapses all floating blocks downward to rest on the bottom floor or stacked blocks.
 */
export function applyGravity(inputBoard: BoardGrid): GravityResult {
  const board = cloneBoard(inputBoard);
  const movedCoords: Coord[] = [];
  let moved = false;

  for (let c = 0; c < BOARD_COLS; c++) {
    let writeRow = BOARD_ROWS - 1;
    for (let r = BOARD_ROWS - 1; r >= 0; r--) {
      const cell = board[r][c];
      if (cell !== null) {
        if (r !== writeRow) {
          board[writeRow][c] = { id: cell.id, value: cell.value, justMerged: false };
          board[r][c] = null;
          movedCoords.push({ row: writeRow, col: c });
          moved = true;
        }
        writeRow--;
      }
    }
  }

  return { moved, board, movedCoords };
}

/**
 * Rearranges all existing blocks across the bottom positions of the 5 columns.
 */
export function shuffleBoardBlocks(inputBoard: BoardGrid): BoardGrid {
  const tiles: TileCell[] = [];
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      const cell = inputBoard[r][c];
      if (cell) {
        tiles.push({ id: cell.id, value: cell.value, justMerged: false });
      }
    }
  }

  if (tiles.length <= 1) return cloneBoard(inputBoard);

  // Collect all currently occupied slots so column heights remain intact and balanced
  const occupiedSlots: Coord[] = [];
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      if (inputBoard[r][c] !== null) {
        occupiedSlots.push({ row: r, col: c });
      }
    }
  }

  for (let attempt = 0; attempt < 10; attempt++) {
    const shuffled = [...tiles];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const next = createEmptyBoard();
    let changed = false;
    for (let i = 0; i < occupiedSlots.length; i++) {
      const { row, col } = occupiedSlots[i];
      next[row][col] = shuffled[i];
      if (inputBoard[row][col]?.value !== shuffled[i].value) {
        changed = true;
      }
    }
    if (changed || attempt === 9) {
      return next;
    }
  }

  return cloneBoard(inputBoard);
}

/**
 * Returns tile styling metadata for colorful neon block rendering.
 */
export function getTilePalette(value: number): {
  bg: string;
  border: string;
  shadow: string;
  text: string;
  particleColor: string;
} {
  switch (value) {
    case 2:
      return {
        bg: 'from-cyan-400 to-sky-600',
        border: 'border-cyan-300/80',
        shadow: 'shadow-[0_4px_0_0_#0369a1,0_0_14px_rgba(34,211,238,0.28)]',
        text: 'text-white',
        particleColor: '#22d3ee',
      };
    case 4:
      return {
        bg: 'from-emerald-400 to-teal-600',
        border: 'border-emerald-300/80',
        shadow: 'shadow-[0_4px_0_0_#0f766e,0_0_14px_rgba(52,211,153,0.28)]',
        text: 'text-white',
        particleColor: '#34d399',
      };
    case 8:
      return {
        bg: 'from-amber-400 to-orange-500',
        border: 'border-amber-200/85',
        shadow: 'shadow-[0_4px_0_0_#c2410c,0_0_14px_rgba(251,191,36,0.3)]',
        text: 'text-slate-950',
        particleColor: '#fbbf24',
      };
    case 16:
      return {
        bg: 'from-orange-500 to-red-600',
        border: 'border-orange-300/80',
        shadow: 'shadow-[0_4px_0_0_#991b1b,0_0_16px_rgba(249,115,22,0.32)]',
        text: 'text-white',
        particleColor: '#fb923c',
      };
    case 32:
      return {
        bg: 'from-rose-500 to-pink-600',
        border: 'border-rose-300/80',
        shadow: 'shadow-[0_4px_0_0_#9d174d,0_0_16px_rgba(244,63,94,0.34)]',
        text: 'text-white',
        particleColor: '#fb7185',
      };
    case 64:
      return {
        bg: 'from-violet-500 to-purple-700',
        border: 'border-violet-300/80',
        shadow: 'shadow-[0_4px_0_0_#581c87,0_0_18px_rgba(168,85,247,0.38)]',
        text: 'text-white',
        particleColor: '#c084fc',
      };
    case 128:
      return {
        bg: 'from-blue-500 to-indigo-700',
        border: 'border-blue-300/85',
        shadow: 'shadow-[0_4px_0_0_#312e81,0_0_18px_rgba(59,130,246,0.38)]',
        text: 'text-white',
        particleColor: '#60a5fa',
      };
    case 256:
      return {
        bg: 'from-lime-400 to-green-600',
        border: 'border-lime-200/85',
        shadow: 'shadow-[0_4px_0_0_#15803d,0_0_18px_rgba(132,204,22,0.36)]',
        text: 'text-slate-950',
        particleColor: '#a3e635',
      };
    case 512:
      return {
        bg: 'from-fuchsia-500 to-purple-800',
        border: 'border-fuchsia-300/85',
        shadow: 'shadow-[0_4px_0_0_#6b21a8,0_0_20px_rgba(217,70,239,0.42)]',
        text: 'text-white',
        particleColor: '#e879f9',
      };
    case 1024:
      return {
        bg: 'from-red-500 to-rose-800',
        border: 'border-red-300/85',
        shadow: 'shadow-[0_4px_0_0_#881337,0_0_20px_rgba(239,68,68,0.45)]',
        text: 'text-white',
        particleColor: '#f87171',
      };
    case 2048:
      return {
        bg: 'from-yellow-300 via-amber-400 to-orange-500',
        border: 'border-yellow-100',
        shadow: 'shadow-[0_4px_0_0_#b45309,0_0_24px_rgba(250,204,21,0.55)]',
        text: 'text-slate-950',
        particleColor: '#fde047',
      };
    default:
      return {
        bg: 'from-sky-300 via-fuchsia-400 to-amber-300',
        border: 'border-white',
        shadow: 'shadow-[0_4px_0_0_#7e22ce,0_0_26px_rgba(244,114,182,0.6)]',
        text: 'text-slate-950',
        particleColor: '#f472b6',
      };
  }
}
