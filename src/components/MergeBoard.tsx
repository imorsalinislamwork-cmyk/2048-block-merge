import React, { useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  BOARD_COLS,
  BOARD_ROWS,
  BoardGrid,
  ComboBanner,
  ParticleBurst,
  TileCell,
} from '../types/mergeGame';
import { getDropTarget } from '../utils/mergeEngine';
import { ParticleLayer } from './ParticleLayer';
import { TileBlock } from './TileBlock';

interface MergeBoardProps {
  board: BoardGrid;
  activeValue: number;
  aimedCol: number;
  onChangeAimCol: (col: number) => void;
  onDropColumn: (col: number) => void;
  activeTargeting: 'hammer' | 'bomb' | null;
  onSelectBoosterCell: (row: number, col: number) => void;
  bursts: ParticleBurst[];
  combos: ComboBanner[];
  invalidCol: number | null;
  isBusy: boolean;
  disabled: boolean;
}

const COL_INDICES = Array.from({ length: BOARD_COLS }, (_, i) => i);
const CELL_INDICES = Array.from({ length: BOARD_ROWS * BOARD_COLS }, (_, i) => i);

export function MergeBoard({
  board,
  activeValue,
  aimedCol,
  onChangeAimCol,
  onDropColumn,
  activeTargeting,
  onSelectBoosterCell,
  bursts,
  combos,
  invalidCol,
  isBusy,
  disabled,
}: MergeBoardProps) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);

  const getCoordsFromClient = (clientX: number, clientY: number) => {
    const el = gridRef.current;
    if (!el) return { row: 0, col: aimedCol };
    const rect = el.getBoundingClientRect();
    const relX = Math.max(0, Math.min(rect.width - 1, clientX - rect.left));
    const relY = Math.max(0, Math.min(rect.height - 1, clientY - rect.top));
    const col = Math.max(0, Math.min(BOARD_COLS - 1, Math.floor((relX / rect.width) * BOARD_COLS)));
    const row = Math.max(0, Math.min(BOARD_ROWS - 1, Math.floor((relY / rect.height) * BOARD_ROWS)));
    return { row, col };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || isBusy) return;
    const { row, col } = getCoordsFromClient(e.clientX, e.clientY);

    if (activeTargeting !== null) {
      if (board[row]?.[col]) {
        onSelectBoosterCell(row, col);
      }
      return;
    }

    setIsDragging(true);
    onChangeAimCol(col);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore if capture unsupported
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    const { row, col } = getCoordsFromClient(e.clientX, e.clientY);

    if (activeTargeting !== null) {
      setHoveredCell(board[row]?.[col] ? { row, col } : null);
      return;
    }

    if (isDragging || e.pointerType === 'mouse') {
      if (col !== aimedCol) {
        onChangeAimCol(col);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    if (disabled || isBusy || activeTargeting !== null) return;
    const { col } = getCoordsFromClient(e.clientX, e.clientY);
    onChangeAimCol(col);
    onDropColumn(col);
  };

  const handlePointerCancel = () => {
    setIsDragging(false);
    setHoveredCell(null);
  };

  // Flatten all active tiles sorted stably by id so CSS transforms animate smoothly
  const flatTiles = useMemo(() => {
    const list: Array<{ tile: TileCell; row: number; col: number }> = [];
    for (let r = 0; r < BOARD_ROWS; r++) {
      for (let c = 0; c < BOARD_COLS; c++) {
        const cell = board[r][c];
        if (cell) {
          list.push({ tile: cell, row: r, col: c });
        }
      }
    }
    list.sort((a, b) => a.tile.id - b.tile.id);
    return list;
  }, [board]);

  const dropTarget = useMemo(
    () => getDropTarget(board, aimedCol, activeValue),
    [board, aimedCol, activeValue]
  );

  // Highlight cells adjacent to landing position that would merge immediately
  const matchPreviewSet = useMemo(() => {
    const set = new Set<string>();
    if (activeTargeting !== null || isBusy || !dropTarget.canDrop) return set;

    if (dropTarget.isTopMerge) {
      set.add(`0-${aimedCol}`);
      return set;
    }

    const r = dropTarget.targetRow;
    const c = aimedCol;
    const dirs = [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
    ];
    for (const [nr, nc] of dirs) {
      if (nr >= 0 && nr < BOARD_ROWS && nc >= 0 && nc < BOARD_COLS) {
        if (board[nr][nc]?.value === activeValue) {
          set.add(`${nr}-${nc}`);
        }
      }
    }
    return set;
  }, [activeTargeting, activeValue, aimedCol, board, dropTarget, isBusy]);

  const isCellBoosterTarget = (r: number, c: number): boolean => {
    if (!activeTargeting || !board[r][c]) return false;
    if (!hoveredCell) return true; // on touchscreens without hover, highlight all valid targets
    if (activeTargeting === 'hammer') {
      return hoveredCell.row === r && hoveredCell.col === c;
    }
    return Math.abs(hoveredCell.row - r) <= 1 && Math.abs(hoveredCell.col - c) <= 1;
  };

  return (
    <div className="w-full flex flex-col items-center gap-1.5 select-none">
      {/* Top Drop Aiming Rail */}
      <div
        className="w-full px-2.5 sm:px-3"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <div className="relative w-full h-[54px] sm:h-[62px] [--cell-gap:6px] sm:[--cell-gap:8px]">
          {activeTargeting === null ? (
            <div
              className="merge-tile absolute top-0 left-0 h-full flex flex-col items-center justify-center"
              style={{
                width: 'calc((100% - 4 * var(--cell-gap)) / 5)',
                transform: `translate3d(calc(${aimedCol} * 100% + ${aimedCol} * var(--cell-gap)), 0, 0)`,
              }}
            >
              <div className="w-full h-[44px] sm:h-[50px]">
                <TileBlock
                  value={activeValue}
                  compact
                  isInvalidShake={invalidCol === aimedCol}
                />
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 -mt-0.5 ${
                  dropTarget.canDrop ? 'text-cyan-300' : 'text-rose-400'
                }`}
                strokeWidth={3}
              />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div
                className={`px-4 py-1.5 rounded-xl border text-xs sm:text-sm font-semibold ${
                  activeTargeting === 'hammer'
                    ? 'bg-amber-500/20 border-amber-400/60 text-amber-200'
                    : 'bg-rose-500/20 border-rose-400/60 text-rose-200'
                }`}
              >
                {activeTargeting === 'hammer'
                  ? 'Tap any block on the board to smash it'
                  : 'Tap any block to detonate a 3×3 blast'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main 5x7 Cosmic Neon Board */}
      <div
        className={`relative w-full aspect-[5/7] p-2.5 sm:p-3 rounded-2xl bg-[#14072b]/95 border shadow-[0_12px_40px_rgba(6,2,18,0.75),inset_0_0_24px_rgba(139,92,246,0.12)] touch-none ${
          activeTargeting === 'hammer'
            ? 'border-amber-400/70'
            : activeTargeting === 'bomb'
            ? 'border-rose-400/70'
            : 'border-purple-500/35'
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={() => setHoveredCell(null)}
        role="grid"
        aria-label="5 column 2048 block merge board"
      >
        <div
          ref={gridRef}
          className="relative w-full h-full [--cell-gap:6px] sm:[--cell-gap:8px]"
        >
          {/* Column Lane Highlight Guides */}
          <div
            className="absolute inset-0 grid grid-cols-5 pointer-events-none"
            style={{ gap: 'var(--cell-gap)' }}
            aria-hidden="true"
          >
            {COL_INDICES.map((col) => {
              const isAimed = activeTargeting === null && col === aimedCol;
              const isInvalid = invalidCol === col;
              return (
                <div
                  key={col}
                  className={`h-full rounded-xl transition-colors duration-100 ${
                    isInvalid
                      ? 'bg-rose-500/18'
                      : isAimed
                      ? dropTarget.canDrop
                        ? 'bg-purple-400/12'
                        : 'bg-rose-500/12'
                      : 'bg-purple-950/25'
                  }`}
                />
              );
            })}
          </div>

          {/* 35 Recessed Cell Wells */}
          <div
            className="grid grid-cols-5 grid-rows-7 w-full h-full pointer-events-none"
            style={{ gap: 'var(--cell-gap)' }}
            aria-hidden="true"
          >
            {CELL_INDICES.map((idx) => (
              <div
                key={idx}
                className="rounded-xl bg-[#0d041e]/65 border border-purple-500/12"
              />
            ))}
          </div>

          {/* Ghost Landing Preview */}
          {activeTargeting === null &&
            !isBusy &&
            dropTarget.canDrop &&
            !dropTarget.isTopMerge && (
              <div
                className="merge-tile absolute top-0 left-0 pointer-events-none z-10"
                style={{
                  width: 'calc((100% - 4 * var(--cell-gap)) / 5)',
                  height: 'calc((100% - 6 * var(--cell-gap)) / 7)',
                  transform: `translate3d(calc(${aimedCol} * 100% + ${aimedCol} * var(--cell-gap)), calc(${dropTarget.targetRow} * 100% + ${dropTarget.targetRow} * var(--cell-gap)), 0)`,
                }}
              >
                <TileBlock value={activeValue} isGhost />
              </div>
            )}

          {/* Active Placed & Falling Blocks (Keyed by stable tile.id) */}
          {flatTiles.map(({ tile, row, col }) => (
            <div
              key={tile.id}
              className="merge-tile absolute top-0 left-0 z-20 pointer-events-none"
              style={{
                width: 'calc((100% - 4 * var(--cell-gap)) / 5)',
                height: 'calc((100% - 6 * var(--cell-gap)) / 7)',
                transform: `translate3d(calc(${col} * 100% + ${col} * var(--cell-gap)), calc(${row} * 100% + ${row} * var(--cell-gap)), 0)`,
              }}
            >
              <TileBlock
                value={tile.value}
                justMerged={tile.justMerged}
                isMatchHighlight={matchPreviewSet.has(`${row}-${col}`)}
                isBoosterTarget={isCellBoosterTarget(row, col)}
              />
            </div>
          ))}

          {/* Floating Combo Multipliers */}
          {combos.map((combo) => (
            <div
              key={combo.id}
              className="animate-combo-rise absolute z-40 pointer-events-none text-center whitespace-nowrap"
              style={{
                left: `${((combo.col + 0.5) / BOARD_COLS) * 100}%`,
                top: `${((combo.row + 0.25) / BOARD_ROWS) * 100}%`,
              }}
            >
              <div className="font-display font-extrabold text-sm sm:text-base text-yellow-300 drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">
                {combo.combo > 1 ? `COMBO ×${combo.combo}!` : `+${combo.points}`}
              </div>
              {combo.combo > 1 && (
                <div className="font-mono-num text-xs font-bold text-cyan-200 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
                  +{combo.points}
                </div>
              )}
            </div>
          ))}

          {/* Neon Canvas Particle Bursts */}
          <ParticleLayer bursts={bursts} />
        </div>
      </div>
    </div>
  );
}
