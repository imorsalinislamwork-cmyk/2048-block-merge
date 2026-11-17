import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Award,
  Flame,
  Home,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { BoosterBar } from './components/BoosterBar';
import { MergeBoard } from './components/MergeBoard';
import { TileBlock } from './components/TileBlock';
import { TitleScreen } from './components/TitleScreen';
import {
  BestMergeStats,
  BOARD_COLS,
  BOARD_ROWS,
  BoardGrid,
  BoosterCounts,
  BoosterType,
  ComboBanner,
  GameScreenState,
  HistorySnapshot,
  ParticleBurst,
} from './types/mergeGame';
import {
  applyGravity,
  cloneBoard,
  computeLevel,
  Coord,
  countOccupiedCells,
  createStarterBoard,
  createTileId,
  getDropTarget,
  getHighestTileOnBoard,
  getNextMilestone,
  getTilePalette,
  hasAnyValidMove,
  pickNextBlockValue,
  resolveSingleMergeStep,
  shuffleBoardBlocks,
  syncTileIdCounter,
} from './utils/mergeEngine';
import { mergeSound } from './utils/mergeSound';
import {
  clearSavedMergeGame,
  loadMergeMuted,
  loadMergeStats,
  loadSavedMergeGame,
  saveMergeGame,
  saveMergeMuted,
  saveMergeStats,
} from './utils/mergeStorage';
import { initNativeAndroidUI, registerAndroidBackButton } from './utils/nativePlatform';

const INITIAL_BOOSTERS: BoosterCounts = {
  hammer: 2,
  bomb: 2,
  shuffle: 2,
  undo: 3,
};

const MAX_HISTORY = 25;

let eventSeq = 1;
function nextEventId(): number {
  eventSeq += 1;
  return eventSeq;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function App() {
  const [muted, setMuted] = useState<boolean>(() => {
    const m = loadMergeMuted();
    mergeSound.setMuted(m);
    return m;
  });

  const [stats, setStats] = useState<BestMergeStats>(() => loadMergeStats());
  const [savedGame, setSavedGame] = useState(() => loadSavedMergeGame());

  const [screen, setScreen] = useState<GameScreenState>('TITLE');
  const [board, setBoard] = useState<BoardGrid>(() => createStarterBoard());
  const [score, setScore] = useState<number>(0);
  const [activeValue, setActiveValue] = useState<number>(2);
  const [nextValue, setNextValue] = useState<number>(4);
  const [aimedCol, setAimedCol] = useState<number>(2);
  const [maxTile, setMaxTile] = useState<number>(8);
  const [level, setLevel] = useState<number>(1);
  const [boosters, setBoosters] = useState<BoosterCounts>({ ...INITIAL_BOOSTERS });
  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [maxComboThisRun, setMaxComboThisRun] = useState<number>(1);
  const [reached2048, setReached2048] = useState<boolean>(false);

  const [activeTargeting, setActiveTargeting] = useState<'hammer' | 'bomb' | null>(null);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [invalidCol, setInvalidCol] = useState<number | null>(null);
  const [bursts, setBursts] = useState<ParticleBurst[]>([]);
  const [combos, setCombos] = useState<ComboBanner[]>([]);
  const [milestoneToast, setMilestoneToast] = useState<string | null>(null);
  const [isNewBestScore, setIsNewBestScore] = useState<boolean>(false);

  // Refs to guard async cascade sequences against stale state or restarts
  const cascadeIdRef = useRef<number>(0);
  const boardRef = useRef(board);
  boardRef.current = board;
  const scoreRef = useRef(score);
  scoreRef.current = score;
  const maxTileRef = useRef(maxTile);
  maxTileRef.current = maxTile;
  const reached2048Ref = useRef(reached2048);
  reached2048Ref.current = reached2048;

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      mergeSound.setMuted(next);
      saveMergeMuted(next);
      if (!next) mergeSound.playClick();
      return next;
    });
  }, []);

  const emitBurst = useCallback((row: number, col: number, color: string, count = 16) => {
    const id = nextEventId();
    setBursts((prev) => [...prev.slice(-18), { id, row, col, color, count }]);
  }, []);

  const emitCombo = useCallback((row: number, col: number, combo: number, points: number, value: number) => {
    const id = nextEventId();
    setCombos((prev) => [...prev.slice(-6), { id, row, col, combo, points, value }]);
    window.setTimeout(() => {
      setCombos((prev) => prev.filter((item) => item.id !== id));
    }, 960);
  }, []);

  const showToast = useCallback((text: string) => {
    setMilestoneToast(text);
    window.setTimeout(() => {
      setMilestoneToast((cur) => (cur === text ? null : cur));
    }, 2600);
  }, []);

  // Update high score & persistent saved game whenever playing
  useEffect(() => {
    if (screen !== 'PLAYING' && screen !== 'PAUSED') return;

    if (score > stats.bestScore || maxTile > stats.highestTile || maxComboThisRun > stats.maxCombo) {
      setStats((prev) => {
        const updated: BestMergeStats = {
          bestScore: Math.max(prev.bestScore, score),
          highestTile: Math.max(prev.highestTile, maxTile),
          maxCombo: Math.max(prev.maxCombo, maxComboThisRun),
          gamesPlayed: prev.gamesPlayed,
        };
        saveMergeStats(updated);
        return updated;
      });
    }

    if (!isBusy) {
      const snapshot = {
        board,
        score,
        activeValue,
        nextValue,
        maxTile,
        level,
        boosters,
        maxComboThisRun,
        reached2048,
        history,
        updatedAt: Date.now(),
      };
      saveMergeGame(snapshot);
      setSavedGame(snapshot);
    }
  }, [
    activeValue,
    board,
    boosters,
    isBusy,
    level,
    maxComboThisRun,
    maxTile,
    nextValue,
    reached2048,
    score,
    screen,
    stats.bestScore,
    stats.highestTile,
    stats.maxCombo,
    history,
  ]);

  const finishGameOver = useCallback(
    (finalScore: number, finalMaxTile: number, finalMaxCombo: number) => {
      mergeSound.playGameOver();
      clearSavedMergeGame();
      setSavedGame(null);

      setStats((prev) => {
        const beatBest = finalScore > prev.bestScore && finalScore > 0;
        setIsNewBestScore(beatBest);
        const updated: BestMergeStats = {
          bestScore: Math.max(prev.bestScore, finalScore),
          highestTile: Math.max(prev.highestTile, finalMaxTile),
          maxCombo: Math.max(prev.maxCombo, finalMaxCombo),
          gamesPlayed: prev.gamesPlayed + 1,
        };
        saveMergeStats(updated);
        return updated;
      });
      setScreen('GAME_OVER');
    },
    []
  );

  const rewardMilestoneIfReached = useCallback(
    (newVal: number, prevMax: number) => {
      if (newVal <= prevMax) return;

      if (newVal >= 256 && prevMax < 256) {
        setBoosters((b) => ({ ...b, hammer: b.hammer + 1 }));
        mergeSound.playMilestone();
        showToast('256 Reached! +1 Hammer');
      } else if (newVal >= 512 && prevMax < 512) {
        setBoosters((b) => ({ ...b, bomb: b.bomb + 1 }));
        mergeSound.playMilestone();
        showToast('512 Reached! +1 Bomb');
      } else if (newVal >= 1024 && prevMax < 1024) {
        setBoosters((b) => ({ ...b, shuffle: b.shuffle + 1 }));
        mergeSound.playMilestone();
        showToast('1024 Reached! +1 Shuffle');
      } else if (newVal >= 2048 && !reached2048Ref.current) {
        reached2048Ref.current = true;
        setReached2048(true);
        setBoosters((b) => ({ ...b, hammer: b.hammer + 1, bomb: b.bomb + 1 }));
        mergeSound.playMilestone();
        showToast('2048 ACHIEVED! +1 Hammer & Bomb');
      } else if (newVal >= 4096 && prevMax < 4096) {
        setBoosters((b) => ({ ...b, bomb: b.bomb + 1 }));
        mergeSound.playMilestone();
        showToast(`${newVal} UNLOCKED! +1 Bomb`);
      }
    },
    [showToast]
  );

  const runCascadeLoop = useCallback(
    async (
      startBoard: BoardGrid,
      initialPriority: Coord[],
      startingCombo: number,
      runToken: number
    ): Promise<{ finalBoard: BoardGrid; finalMaxTile: number }> => {
      let workingBoard = cloneBoard(startBoard);
      let priority = [...initialPriority];
      let combo = startingCombo;
      let localMaxTile = maxTileRef.current;

      while (true) {
        if (cascadeIdRef.current !== runToken) {
          return { finalBoard: workingBoard, finalMaxTile: localMaxTile };
        }

        const mergeRes = resolveSingleMergeStep(workingBoard, priority);
        if (!mergeRes.merged || !mergeRes.anchor) {
          break;
        }

        combo += 1;
        const points = mergeRes.newValue * combo;
        workingBoard = mergeRes.board;
        setBoard(workingBoard);

        const nextScore = scoreRef.current + points;
        scoreRef.current = nextScore;
        setScore(nextScore);

        setMaxComboThisRun((prev) => Math.max(prev, combo));

        if (mergeRes.newValue > localMaxTile) {
          const oldMax = localMaxTile;
          localMaxTile = mergeRes.newValue;
          maxTileRef.current = localMaxTile;
          setMaxTile(localMaxTile);
          setLevel(computeLevel(localMaxTile));
          rewardMilestoneIfReached(localMaxTile, oldMax);
        }

        const palette = getTilePalette(mergeRes.newValue);
        emitBurst(mergeRes.anchor.row, mergeRes.anchor.col, palette.particleColor, combo > 1 ? 22 : 16);
        emitCombo(mergeRes.anchor.row, mergeRes.anchor.col, combo, points, mergeRes.newValue);
        mergeSound.playMerge(combo, mergeRes.newValue);

        await sleep(175);
        if (cascadeIdRef.current !== runToken) {
          return { finalBoard: workingBoard, finalMaxTile: localMaxTile };
        }

        const grav = applyGravity(workingBoard);
        if (grav.moved) {
          workingBoard = grav.board;
          setBoard(workingBoard);
          priority = [...grav.movedCoords, mergeRes.anchor];
          await sleep(145);
        } else {
          priority = [mergeRes.anchor];
        }
      }

      return { finalBoard: workingBoard, finalMaxTile: localMaxTile };
    },
    [emitBurst, emitCombo, rewardMilestoneIfReached]
  );

  const handleDropColumn = useCallback(
    async (col: number) => {
      if (screen !== 'PLAYING' || isBusy || activeTargeting !== null) return;

      const curBoard = boardRef.current;
      const target = getDropTarget(curBoard, col, activeValue);

      if (!target.canDrop) {
        mergeSound.playInvalid();
        setInvalidCol(col);
        window.setTimeout(() => setInvalidCol(null), 240);
        return;
      }

      // Save undo snapshot before move
      const snapshot: HistorySnapshot = {
        board: cloneBoard(curBoard),
        score: scoreRef.current,
        activeValue,
        nextValue,
        maxTile: maxTileRef.current,
        level,
      };
      setHistory((prev) => [...prev.slice(-(MAX_HISTORY - 1)), snapshot]);

      setIsBusy(true);
      const runToken = ++cascadeIdRef.current;

      let workingBoard = cloneBoard(curBoard);
      let startingCombo = 0;
      let priority: Coord[] = [];

      if (target.isTopMerge) {
        // Top-edge merge into full column
        const topTile = workingBoard[0][col]!;
        const mergedVal = activeValue * 2;
        workingBoard[0][col] = {
          id: topTile.id,
          value: mergedVal,
          justMerged: true,
        };
        setBoard(workingBoard);

        startingCombo = 1;
        const pts = mergedVal;
        const nextScore = scoreRef.current + pts;
        scoreRef.current = nextScore;
        setScore(nextScore);

        if (mergedVal > maxTileRef.current) {
          const oldMax = maxTileRef.current;
          maxTileRef.current = mergedVal;
          setMaxTile(mergedVal);
          setLevel(computeLevel(mergedVal));
          rewardMilestoneIfReached(mergedVal, oldMax);
        }

        const palette = getTilePalette(mergedVal);
        emitBurst(0, col, palette.particleColor, 18);
        emitCombo(0, col, 1, pts, mergedVal);
        mergeSound.playMerge(1, mergedVal);

        await sleep(175);
        priority = [{ row: 0, col }];
      } else {
        const newTileId = createTileId();

        if (target.targetRow > 0) {
          // Mount briefly at row 0 so the tile visibly drops down the column
          const startDropBoard = cloneBoard(workingBoard);
          startDropBoard[0][col] = { id: newTileId, value: activeValue };
          setBoard(startDropBoard);

          await sleep(22);
          if (cascadeIdRef.current !== runToken) return;
        }

        workingBoard[target.targetRow][col] = { id: newTileId, value: activeValue };
        setBoard(workingBoard);
        mergeSound.playDrop();

        await sleep(target.targetRow > 0 ? 145 : 75);
        priority = [{ row: target.targetRow, col }];
      }

      if (cascadeIdRef.current !== runToken) return;

      const { finalBoard, finalMaxTile } = await runCascadeLoop(
        workingBoard,
        priority,
        startingCombo,
        runToken
      );

      if (cascadeIdRef.current !== runToken) return;

      const upcomingActive = nextValue;
      const upcomingNext = pickNextBlockValue(finalMaxTile);
      setActiveValue(upcomingActive);
      setNextValue(upcomingNext);
      setIsBusy(false);

      if (!hasAnyValidMove(finalBoard, upcomingActive)) {
        finishGameOver(scoreRef.current, finalMaxTile, maxComboThisRun);
      }
    },
    [
      activeTargeting,
      activeValue,
      emitBurst,
      emitCombo,
      finishGameOver,
      isBusy,
      level,
      maxComboThisRun,
      nextValue,
      rewardMilestoneIfReached,
      runCascadeLoop,
      screen,
    ]
  );

  const handleSelectBoosterCell = useCallback(
    async (row: number, col: number) => {
      if (screen !== 'PLAYING' || isBusy || !activeTargeting) return;
      const curBoard = boardRef.current;
      const targetTile = curBoard[row]?.[col];
      if (!targetTile) return;

      const boosterUsed = activeTargeting;
      setActiveTargeting(null);
      setIsBusy(true);
      setHistory([]); // keep undo stack clean after destructive boosters
      const runToken = ++cascadeIdRef.current;

      const workingBoard = cloneBoard(curBoard);

      if (boosterUsed === 'hammer') {
        const palette = getTilePalette(targetTile.value);
        workingBoard[row][col] = null;
        setBoard(workingBoard);
        setBoosters((b) => ({ ...b, hammer: Math.max(0, b.hammer - 1) }));
        emitBurst(row, col, palette.particleColor, 20);
        mergeSound.playHammer();
      } else {
        // Bomb: blast 3x3 region around (row, col)
        let cleared = 0;
        for (let r = Math.max(0, row - 1); r <= Math.min(BOARD_ROWS - 1, row + 1); r++) {
          for (let c = Math.max(0, col - 1); c <= Math.min(BOARD_COLS - 1, col + 1); c++) {
            const victim = workingBoard[r][c];
            if (victim) {
              cleared += 1;
              const palette = getTilePalette(victim.value);
              emitBurst(r, c, palette.particleColor, 14);
              workingBoard[r][c] = null;
            }
          }
        }
        setBoard(workingBoard);
        setBoosters((b) => ({ ...b, bomb: Math.max(0, b.bomb - 1) }));
        if (cleared > 0) {
          const bonusPts = cleared * 15;
          const nextScore = scoreRef.current + bonusPts;
          scoreRef.current = nextScore;
          setScore(nextScore);
          emitCombo(row, col, 1, bonusPts, 0);
        }
        mergeSound.playBomb();
      }

      await sleep(165);
      if (cascadeIdRef.current !== runToken) return;

      const grav = applyGravity(workingBoard);
      let boardAfterGrav = workingBoard;
      if (grav.moved) {
        boardAfterGrav = grav.board;
        setBoard(boardAfterGrav);
        await sleep(145);
      }

      if (cascadeIdRef.current !== runToken) return;

      const { finalBoard, finalMaxTile } = await runCascadeLoop(
        boardAfterGrav,
        grav.movedCoords,
        0,
        runToken
      );

      if (cascadeIdRef.current !== runToken) return;
      setIsBusy(false);

      if (!hasAnyValidMove(finalBoard, activeValue)) {
        finishGameOver(scoreRef.current, finalMaxTile, maxComboThisRun);
      }
    },
    [
      activeTargeting,
      activeValue,
      emitBurst,
      emitCombo,
      finishGameOver,
      isBusy,
      maxComboThisRun,
      runCascadeLoop,
      screen,
    ]
  );

  const handleActivateBooster = useCallback(
    async (type: BoosterType) => {
      if (screen !== 'PLAYING' || isBusy) return;

      if (type === 'hammer' || type === 'bomb') {
        mergeSound.playClick();
        setActiveTargeting((prev) => (prev === type ? null : type));
        return;
      }

      if (type === 'undo') {
        if (boosters.undo <= 0 || history.length === 0) return;
        setActiveTargeting(null);
        const snap = history[history.length - 1];
        setHistory((prev) => prev.slice(0, -1));
        setBoard(cloneBoard(snap.board));
        scoreRef.current = snap.score;
        setScore(snap.score);
        setActiveValue(snap.activeValue);
        setNextValue(snap.nextValue);
        maxTileRef.current = snap.maxTile;
        setMaxTile(snap.maxTile);
        setLevel(snap.level);
        setBoosters((b) => ({ ...b, undo: Math.max(0, b.undo - 1) }));
        mergeSound.playUndo();
        return;
      }

      if (type === 'shuffle') {
        if (boosters.shuffle <= 0 || countOccupiedCells(boardRef.current) <= 1) return;
        setActiveTargeting(null);
        setIsBusy(true);
        setHistory([]);
        const runToken = ++cascadeIdRef.current;

        const shuffled = shuffleBoardBlocks(boardRef.current);
        setBoard(shuffled);
        setBoosters((b) => ({ ...b, shuffle: Math.max(0, b.shuffle - 1) }));
        mergeSound.playShuffle();

        await sleep(200);
        if (cascadeIdRef.current !== runToken) return;

        const { finalBoard, finalMaxTile } = await runCascadeLoop(shuffled, [], 0, runToken);
        if (cascadeIdRef.current !== runToken) return;

        setIsBusy(false);
        if (!hasAnyValidMove(finalBoard, activeValue)) {
          finishGameOver(scoreRef.current, finalMaxTile, maxComboThisRun);
        }
      }
    },
    [
      activeValue,
      boosters.shuffle,
      boosters.undo,
      finishGameOver,
      history,
      isBusy,
      maxComboThisRun,
      runCascadeLoop,
      screen,
    ]
  );

  const handleStartNewGame = useCallback(() => {
    cascadeIdRef.current += 1;
    const starter = createStarterBoard();
    const initialMax = getHighestTileOnBoard(starter);
    const firstActive = pickNextBlockValue(initialMax);
    const firstNext = pickNextBlockValue(initialMax);

    setBoard(starter);
    scoreRef.current = 0;
    setScore(0);
    setActiveValue(firstActive);
    setNextValue(firstNext);
    setAimedCol(2);
    maxTileRef.current = initialMax;
    setMaxTile(initialMax);
    setLevel(1);
    setBoosters({ ...INITIAL_BOOSTERS });
    setHistory([]);
    setMaxComboThisRun(1);
    reached2048Ref.current = false;
    setReached2048(false);
    setActiveTargeting(null);
    setIsBusy(false);
    setIsNewBestScore(false);
    setMilestoneToast(null);
    setBursts([]);
    setCombos([]);
    clearSavedMergeGame();
    setSavedGame(null);
    setScreen('PLAYING');
  }, []);

  const handleResumeSavedGame = useCallback(() => {
    const saved = loadSavedMergeGame();
    if (!saved) {
      handleStartNewGame();
      return;
    }
    cascadeIdRef.current += 1;
    syncTileIdCounter(saved.board);
    setBoard(saved.board);
    scoreRef.current = saved.score;
    setScore(saved.score);
    setActiveValue(saved.activeValue);
    setNextValue(saved.nextValue);
    setAimedCol(2);
    maxTileRef.current = saved.maxTile;
    setMaxTile(saved.maxTile);
    setLevel(saved.level);
    setBoosters(saved.boosters);
    setHistory(Array.isArray(saved.history) ? saved.history : []);
    setMaxComboThisRun(saved.maxComboThisRun || 1);
    reached2048Ref.current = Boolean(saved.reached2048);
    setReached2048(Boolean(saved.reached2048));
    setActiveTargeting(null);
    setIsBusy(false);
    setIsNewBestScore(false);
    setScreen('PLAYING');
  }, [handleStartNewGame]);

  // Keyboard support during gameplay
  useEffect(() => {
    if (screen === 'TITLE') return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (activeTargeting !== null) {
          setActiveTargeting(null);
          return;
        }
        if (screen === 'PLAYING') {
          mergeSound.playClick();
          setScreen('PAUSED');
        } else if (screen === 'PAUSED') {
          mergeSound.playClick();
          setScreen('PLAYING');
        }
        return;
      }

      if (screen !== 'PLAYING' || isBusy) return;

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        setAimedCol((c) => Math.max(0, c - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        setAimedCol((c) => Math.min(BOARD_COLS - 1, c + 1));
      } else if (e.key === 'ArrowDown' || e.key === ' ' || e.key === 'Enter') {
        if (e.target instanceof HTMLButtonElement && e.key !== 'ArrowDown') return;
        e.preventDefault();
        handleDropColumn(aimedCol);
      } else if (e.key >= '1' && e.key <= '5') {
        e.preventDefault();
        const col = Number(e.key) - 1;
        setAimedCol(col);
        handleDropColumn(col);
      } else if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        handleActivateBooster('undo');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeTargeting, aimedCol, handleActivateBooster, handleDropColumn, isBusy, screen]);

  // Initialize native Android StatusBar & SplashScreen once on mount
  useEffect(() => {
    void initNativeAndroidUI();
  }, []);

  // Handle Android hardware back button cleanly
  useEffect(() => {
    return registerAndroidBackButton(() => {
      if (activeTargeting !== null) {
        setActiveTargeting(null);
        return true;
      }
      if (screen === 'PLAYING') {
        mergeSound.playClick();
        setScreen('PAUSED');
        return true;
      }
      if (screen === 'PAUSED') {
        mergeSound.playClick();
        setScreen('PLAYING');
        return true;
      }
      if (screen === 'GAME_OVER') {
        mergeSound.playClick();
        setScreen('TITLE');
        return true;
      }
      return false;
    });
  }, [activeTargeting, screen]);

  if (screen === 'TITLE') {
    return (
      <TitleScreen
        stats={stats}
        savedGame={savedGame}
        muted={muted}
        onToggleMute={handleToggleMute}
        onStartNewGame={handleStartNewGame}
        onResumeGame={handleResumeSavedGame}
      />
    );
  }

  const nextMilestone = getNextMilestone(maxTile);
  const occupiedCount = countOccupiedCells(board);

  return (
    <div className="h-[100dvh] w-full bg-cosmic-purple text-slate-100 flex flex-col justify-between overflow-hidden px-3 py-2.5 sm:px-6 sm:py-4">
      {/* Compact Top HUD */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => {
              mergeSound.playClick();
              cascadeIdRef.current += 1;
              setIsBusy(false);
              setScreen('TITLE');
            }}
            aria-label="Back to home screen"
            className="min-w-[42px] min-h-[42px] px-2.5 rounded-xl bg-[#241047]/90 hover:bg-[#311761] border border-purple-400/30 text-purple-100 flex items-center gap-1.5 text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-cyan-400"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </button>

          <div className="min-w-0">
            <span className="font-display font-extrabold text-sm sm:text-lg tracking-tight text-white truncate block">
              2048 BLOCK MERGE
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleToggleMute}
            aria-label={muted ? 'Unmute sound effects' : 'Mute sound effects'}
            className="min-w-[42px] min-h-[42px] rounded-xl bg-[#241047]/90 hover:bg-[#311761] border border-purple-400/30 text-purple-100 flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-400"
          >
            {muted ? (
              <VolumeX className="w-4 h-4 text-rose-300" />
            ) : (
              <Volume2 className="w-4 h-4 text-cyan-300" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              mergeSound.playClick();
              setScreen((s) => (s === 'PAUSED' ? 'PLAYING' : 'PAUSED'));
            }}
            disabled={screen === 'GAME_OVER'}
            aria-label={screen === 'PAUSED' ? 'Resume game' : 'Pause game'}
            className="min-w-[42px] min-h-[42px] px-3 rounded-xl bg-[#241047]/90 hover:bg-[#311761] border border-purple-400/30 text-purple-100 flex items-center gap-1.5 text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-cyan-400"
          >
            {screen === 'PAUSED' ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            <span className="hidden sm:inline">{screen === 'PAUSED' ? 'Resume' : 'Pause'}</span>
          </button>
        </div>
      </header>

      {/* Main Responsive Arcade Stage (Mobile 1-col / Desktop 3-zone) */}
      <main className="w-full max-w-5xl mx-auto my-auto flex flex-col lg:grid lg:grid-cols-[220px_auto_220px] items-center justify-center gap-2 sm:gap-3 lg:gap-8">
        {/* Desktop Left Panel: Progression & Milestone */}
        <aside className="hidden lg:flex flex-col gap-4 w-full rounded-2xl bg-[#160832]/85 border border-purple-500/25 p-5">
          <div>
            <span className="text-xs font-medium text-purple-300/80">Stage</span>
            <div className="font-display text-2xl font-extrabold text-white mt-0.5">
              Level {level}
            </div>
            <p className="text-xs text-purple-200/75 mt-1">
              Next milestone: <span className="font-mono-num font-bold text-amber-300">{nextMilestone}</span>
            </p>
          </div>

          <div className="border-t border-purple-500/20 pt-4">
            <span className="text-xs font-medium text-purple-300/80">Highest Block</span>
            <div className="mt-2 w-16 h-16">
              <TileBlock value={maxTile} compact />
            </div>
          </div>

          <div className="border-t border-purple-500/20 pt-4 text-xs text-purple-200/80 space-y-1.5">
            <div className="flex justify-between">
              <span>Max Combo</span>
              <span className="font-mono-num font-bold text-emerald-300">×{maxComboThisRun}</span>
            </div>
            <div className="flex justify-between">
              <span>Board Fill</span>
              <span className="font-mono-num font-bold text-cyan-300">{occupiedCount}/35</span>
            </div>
          </div>
        </aside>

        {/* Center Column: Score Header + 5x7 Board + Booster Bar */}
        <div className="flex flex-col items-center gap-2 w-[min(92vw,calc((100dvh-250px)*5/7),370px)]">
          {/* Compact Score + Best + Next Strip */}
          <div className="w-full grid grid-cols-[1fr_1fr_auto] gap-2 items-stretch">
            <div className="rounded-xl bg-[#1a0a3a]/90 border border-purple-500/30 px-3 py-1.5 flex flex-col justify-center">
              <span className="text-[10px] font-medium text-purple-300/80 leading-none">
                Score
              </span>
              <span className="font-mono-num text-base sm:text-lg font-bold text-white leading-tight mt-0.5 truncate">
                {score.toLocaleString()}
              </span>
            </div>

            <div className="rounded-xl bg-[#1a0a3a]/90 border border-purple-500/30 px-3 py-1.5 flex flex-col justify-center">
              <span className="text-[10px] font-medium text-purple-300/80 leading-none">
                Best
              </span>
              <span className="font-mono-num text-base sm:text-lg font-bold text-amber-300 leading-tight mt-0.5 truncate">
                {Math.max(stats.bestScore, score).toLocaleString()}
              </span>
            </div>

            <div className="rounded-xl bg-[#1a0a3a]/90 border border-purple-500/30 px-2.5 py-1 flex items-center gap-2">
              <span className="text-[10px] font-medium text-purple-300/80 leading-none">
                Next
              </span>
              <div className="w-8 h-8 sm:w-9 sm:h-9 shrink-0">
                <TileBlock value={nextValue} compact />
              </div>
            </div>
          </div>

          {/* 5-Column Vertical Merge Board */}
          <MergeBoard
            board={board}
            activeValue={activeValue}
            aimedCol={aimedCol}
            onChangeAimCol={setAimedCol}
            onDropColumn={handleDropColumn}
            activeTargeting={activeTargeting}
            onSelectBoosterCell={handleSelectBoosterCell}
            bursts={bursts}
            combos={combos}
            invalidCol={invalidCol}
            isBusy={isBusy}
            disabled={screen !== 'PLAYING'}
          />

          {/* Bottom Thumb-Zone Booster Bar */}
          <BoosterBar
            boosters={boosters}
            activeTargeting={activeTargeting}
            canUndo={history.length > 0}
            canShuffle={occupiedCount > 1}
            hasBlocks={occupiedCount > 0}
            disabled={screen !== 'PLAYING' || isBusy}
            onActivateBooster={handleActivateBooster}
          />
        </div>

        {/* Desktop Right Panel: Next Block & Controls */}
        <aside className="hidden lg:flex flex-col gap-4 w-full rounded-2xl bg-[#160832]/85 border border-purple-500/25 p-5">
          <div>
            <span className="text-xs font-medium text-purple-300/80">Up Next</span>
            <div className="mt-2 flex items-center gap-3">
              <div className="w-14 h-14">
                <TileBlock value={nextValue} compact />
              </div>
              <div className="text-xs text-purple-200/80 leading-snug">
                Drops into the highlighted lane after your current block.
              </div>
            </div>
          </div>

          <div className="border-t border-purple-500/20 pt-4">
            <span className="text-xs font-medium text-purple-300/80">Controls</span>
            <ul className="mt-2 space-y-1.5 text-xs text-purple-200/85">
              <li>Drag or tap any column to drop</li>
              <li>Arrow keys / A &amp; D to aim</li>
              <li>Space / Down / 1–5 to drop</li>
              <li>Z to undo · Esc to pause</li>
            </ul>
          </div>
        </aside>
      </main>

      {/* Bottom Mobile Hint / Milestone Toast Area */}
      <footer className="w-full max-w-5xl mx-auto text-center shrink-0 min-h-[20px] flex items-center justify-center">
        {milestoneToast ? (
          <div className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-amber-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{milestoneToast}</span>
          </div>
        ) : (
          <p className="text-[11px] text-purple-300/70 font-mono-num">
            Level {level} · Target {nextMilestone} · Max Combo ×{maxComboThisRun}
          </p>
        )}
      </footer>

      {/* Pause Modal */}
      {screen === 'PAUSED' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#070212]/80"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pause-title"
        >
          <div className="w-full max-w-sm rounded-2xl bg-[#1b0b3b] border border-purple-400/35 p-6 shadow-2xl flex flex-col gap-5">
            <div>
              <h2 id="pause-title" className="font-display text-2xl font-extrabold text-white">
                Game Paused
              </h2>
              <p className="mt-1 text-sm font-mono-num text-purple-200/80">
                Score {score.toLocaleString()} · Level {level} · Best Block {maxTile}
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  mergeSound.playClick();
                  setScreen('PLAYING');
                }}
                className="min-h-[46px] w-full rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-display font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                Resume Game
              </button>

              <button
                type="button"
                onClick={() => {
                  mergeSound.playClick();
                  handleStartNewGame();
                }}
                className="min-h-[44px] w-full rounded-xl bg-[#2a1358] hover:bg-[#35186e] border border-purple-400/30 text-white font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Restart Run
              </button>

              <button
                type="button"
                onClick={() => {
                  mergeSound.playClick();
                  cascadeIdRef.current += 1;
                  setIsBusy(false);
                  setScreen('TITLE');
                }}
                className="min-h-[44px] w-full rounded-xl border border-purple-400/25 hover:bg-[#241047] text-purple-100 font-medium text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                Back to Home
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Modal */}
      {screen === 'GAME_OVER' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#070212]/85"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gameover-title"
        >
          <div className="w-full max-w-sm rounded-2xl bg-[#1b0b3b] border border-purple-400/40 p-6 shadow-2xl flex flex-col gap-5">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-400/40 text-rose-300 flex items-center justify-center">
                <Flame className="w-6 h-6" />
              </div>
              <h2 id="gameover-title" className="font-display text-2xl font-extrabold text-white">
                Board Full!
              </h2>
              <p className="text-sm text-purple-200/80">
                No open lanes or matching top blocks remain.
              </p>

              {isNewBestScore && (
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-300 mt-1">
                  <Award className="w-4 h-4" />
                  <span>New High Score!</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 divide-x divide-purple-500/25 rounded-xl bg-[#13062b] border border-purple-500/25 py-3 text-center">
              <div className="px-2">
                <div className="text-[11px] text-purple-300/75">Score</div>
                <div className="font-mono-num text-base sm:text-lg font-bold text-white">
                  {score.toLocaleString()}
                </div>
              </div>
              <div className="px-2">
                <div className="text-[11px] text-purple-300/75">Top Block</div>
                <div className="font-mono-num text-base sm:text-lg font-bold text-amber-300">
                  {maxTile}
                </div>
              </div>
              <div className="px-2">
                <div className="text-[11px] text-purple-300/75">Max Combo</div>
                <div className="font-mono-num text-base sm:text-lg font-bold text-emerald-300">
                  ×{maxComboThisRun}
                </div>
              </div>
            </div>

            <p className="text-center text-xs font-mono-num text-purple-200/75">
              All-Time Best: {stats.bestScore.toLocaleString()} pts · Top Tile {stats.highestTile}
            </p>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  mergeSound.playClick();
                  handleStartNewGame();
                }}
                className="min-h-[48px] w-full rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:brightness-110 text-slate-950 font-display font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Play Again
              </button>

              <button
                type="button"
                onClick={() => {
                  mergeSound.playClick();
                  setScreen('TITLE');
                }}
                className="min-h-[44px] w-full rounded-xl border border-purple-400/30 hover:bg-[#241047] text-purple-100 font-medium text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                Back to Home
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
