import { useEffect } from 'react';
import { Bomb, Hammer, Play, Shuffle, Undo2, Volume2, VolumeX } from 'lucide-react';
import { BestMergeStats, SavedMergeGame } from '../types/mergeGame';
import { mergeSound } from '../utils/mergeSound';
import { TileBlock } from './TileBlock';

interface TitleScreenProps {
  stats: BestMergeStats;
  savedGame: SavedMergeGame | null;
  muted: boolean;
  onToggleMute: () => void;
  onStartNewGame: () => void;
  onResumeGame: () => void;
}

const SHOWCASE_TILES = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048];

export function TitleScreen({
  stats,
  savedGame,
  muted,
  onToggleMute,
  onStartNewGame,
  onResumeGame,
}: TitleScreenProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLButtonElement) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        mergeSound.playClick();
        if (savedGame) {
          onResumeGame();
        } else {
          onStartNewGame();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onResumeGame, onStartNewGame, savedGame]);

  return (
    <div className="min-h-[100dvh] w-full bg-cosmic-purple text-slate-100 flex flex-col justify-between px-4 py-4 sm:px-8 sm:py-6 overflow-y-auto">
      {/* Top Bar */}
      <div className="w-full max-w-5xl mx-auto flex items-center justify-end">
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? 'Unmute sound effects' : 'Mute sound effects'}
          className="min-w-[44px] min-h-[44px] px-3.5 rounded-xl bg-[#241047]/90 hover:bg-[#311761] border border-purple-400/30 text-purple-100 flex items-center gap-2 text-sm font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-cyan-400"
        >
          {muted ? <VolumeX className="w-4 h-4 text-rose-300" /> : <Volume2 className="w-4 h-4 text-cyan-300" />}
          <span>{muted ? 'Muted' : 'Sound On'}</span>
        </button>
      </div>

      {/* Center Split Composition */}
      <main className="w-full max-w-5xl mx-auto my-auto py-4 grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-12 items-center">
        {/* Left: Emblem, Title Lockup, Stats, Primary CTA */}
        <div className="flex flex-col items-start gap-6">
          <div className="flex items-center gap-4">
            {/* Bespoke SVG Game Emblem */}
            <svg
              width="58"
              height="58"
              viewBox="0 0 58 58"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              className="shrink-0 drop-shadow-[0_0_16px_rgba(168,85,247,0.45)]"
            >
              <rect
                x="2"
                y="2"
                width="54"
                height="54"
                rx="14"
                fill="#180834"
                stroke="url(#emblemBorder)"
                strokeWidth="2"
              />
              <rect x="9" y="9" width="18" height="18" rx="5" fill="#06B6D4" />
              <text
                x="18"
                y="22"
                textAnchor="middle"
                fill="#FFFFFF"
                style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '12px' }}
              >
                2
              </text>
              <rect x="31" y="9" width="18" height="18" rx="5" fill="#A855F7" />
              <text
                x="40"
                y="22"
                textAnchor="middle"
                fill="#FFFFFF"
                style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '11px' }}
              >
                64
              </text>
              <rect x="9" y="31" width="18" height="18" rx="5" fill="#F43F5E" />
              <text
                x="18"
                y="44"
                textAnchor="middle"
                fill="#FFFFFF"
                style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '11px' }}
              >
                32
              </text>
              <rect x="31" y="31" width="18" height="18" rx="5" fill="url(#goldTile)" />
              <text
                x="40"
                y="43.5"
                textAnchor="middle"
                fill="#0F172A"
                style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: '9px' }}
              >
                2048
              </text>
              <defs>
                <linearGradient id="emblemBorder" x1="2" y1="2" x2="56" y2="56">
                  <stop stopColor="#22D3EE" />
                  <stop offset="0.5" stopColor="#A855F7" />
                  <stop offset="1" stopColor="#FACC15" />
                </linearGradient>
                <linearGradient id="goldTile" x1="31" y1="31" x2="49" y2="49">
                  <stop stopColor="#FDE047" />
                  <stop offset="1" stopColor="#F97316" />
                </linearGradient>
              </defs>
            </svg>

            <div>
              <h1 className="font-display font-extrabold text-3xl sm:text-5xl tracking-tight text-white leading-none text-balance">
                2048 BLOCK MERGE
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm font-medium text-purple-200/80">
                5-Column Neon Cascade Puzzle
              </p>
            </div>
          </div>

          <p className="text-sm sm:text-base text-purple-100/85 leading-relaxed max-w-md">
            Drag and drop colorful number blocks into any of the 5 lanes. Match adjacent blocks to
            trigger chain reactions, stack combo multipliers, and race toward 2048 and beyond.
          </p>

          {/* Clean Unboxed Personal Records */}
          <div className="w-full max-w-md border-y border-purple-400/20 py-3">
            {stats.gamesPlayed > 0 || stats.bestScore > 0 ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-purple-100">
                <span className="font-semibold text-cyan-300">Best Score</span>
                <span className="font-mono-num font-bold">{stats.bestScore.toLocaleString()}</span>
                <span aria-hidden="true" className="text-purple-400/60">·</span>
                <span className="text-purple-200/85">Highest Block</span>
                <span className="font-mono-num font-bold text-amber-300">
                  {stats.highestTile || '—'}
                </span>
                <span aria-hidden="true" className="text-purple-400/60">·</span>
                <span className="text-purple-200/85">Max Combo</span>
                <span className="font-mono-num font-bold text-emerald-300">
                  {stats.maxCombo > 0 ? `×${stats.maxCombo}` : '—'}
                </span>
              </div>
            ) : (
              <p className="text-xs sm:text-sm text-purple-200/75">
                Start your first run to record your high score, top block, and best combo streak.
              </p>
            )}
          </div>

          {/* Primary Play CTAs */}
          <div className="flex flex-wrap items-center gap-3">
            {savedGame ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    mergeSound.playClick();
                    onResumeGame();
                  }}
                  className="min-h-[50px] px-7 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 active:scale-[0.98] text-slate-950 font-display font-extrabold text-base flex items-center gap-2.5 shadow-[0_4px_20px_rgba(34,211,238,0.35)] transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Resume Run
                </button>

                <button
                  type="button"
                  onClick={() => {
                    mergeSound.playClick();
                    onStartNewGame();
                  }}
                  className="min-h-[50px] px-5 py-3 rounded-xl bg-[#27114e] hover:bg-[#341866] active:scale-[0.98] text-purple-100 border border-purple-400/35 font-semibold text-sm sm:text-base transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-400"
                >
                  New Game
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  mergeSound.playClick();
                  onStartNewGame();
                }}
                className="min-h-[52px] px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-fuchsia-400 hover:brightness-110 active:scale-[0.98] text-slate-950 font-display font-extrabold text-base sm:text-lg flex items-center gap-2.5 shadow-[0_6px_26px_rgba(34,211,238,0.38)] transition-all whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
              >
                <Play className="w-5 h-5 fill-current" />
                Play Now
              </button>
            )}
          </div>

          {savedGame && (
            <p className="text-xs font-mono-num text-purple-200/75 -mt-2">
              Saved run: {savedGame.score.toLocaleString()} pts · Highest {savedGame.maxTile} · Level{' '}
              {savedGame.level}
            </p>
          )}
        </div>

        {/* Right: Block Spectrum & Booster Overview Card */}
        <div className="rounded-2xl bg-[#160832]/90 border border-purple-500/30 p-5 sm:p-6 shadow-[0_14px_40px_rgba(8,2,22,0.7)] flex flex-col gap-5">
          <div>
            <h2 className="font-display font-bold text-sm text-purple-200 mb-3">
              Merge Spectrum
            </h2>
            <div className="grid grid-cols-6 gap-2">
              {SHOWCASE_TILES.map((val) => (
                <div key={val} className="aspect-square">
                  <TileBlock value={val} compact />
                </div>
              ))}
              <div className="aspect-square rounded-xl border border-dashed border-purple-400/40 flex items-center justify-center text-xs font-display font-bold text-purple-300">
                ∞
              </div>
            </div>
          </div>

          <div className="border-t border-purple-500/20 pt-4">
            <h2 className="font-display font-bold text-sm text-purple-200 mb-3">
              Tactical Boosters
            </h2>
            <div className="grid grid-cols-2 gap-3 text-xs text-purple-100/85">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-400/30 text-amber-300 flex items-center justify-center shrink-0">
                  <Hammer className="w-4 h-4" />
                </span>
                <div>
                  <div className="font-semibold text-white">Hammer</div>
                  <div className="text-purple-300/75">Smash any 1 block</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-400/30 text-rose-300 flex items-center justify-center shrink-0">
                  <Bomb className="w-4 h-4" />
                </span>
                <div>
                  <div className="font-semibold text-white">Bomb</div>
                  <div className="text-purple-300/75">Blast 3×3 area</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 flex items-center justify-center shrink-0">
                  <Shuffle className="w-4 h-4" />
                </span>
                <div>
                  <div className="font-semibold text-white">Shuffle</div>
                  <div className="text-purple-300/75">Rearrange board</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 flex items-center justify-center shrink-0">
                  <Undo2 className="w-4 h-4" />
                </span>
                <div>
                  <div className="font-semibold text-white">Undo</div>
                  <div className="text-purple-300/75">Reverse last move</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Single Flat Control-Hint Line */}
      <footer className="w-full max-w-5xl mx-auto pt-2 text-center">
        <p className="text-xs text-purple-300/70">
          Drag or Tap Column to Drop · Arrow Keys / 1–5 Quick Drop · Z Undo · Esc Pause
        </p>
      </footer>
    </div>
  );
}
