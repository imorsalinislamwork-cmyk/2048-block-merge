import { getTilePalette } from '../utils/mergeEngine';

interface TileBlockProps {
  value: number;
  justMerged?: boolean;
  isGhost?: boolean;
  isMatchHighlight?: boolean;
  isBoosterTarget?: boolean;
  isInvalidShake?: boolean;
  compact?: boolean;
}

export function TileBlock({
  value,
  justMerged = false,
  isGhost = false,
  isMatchHighlight = false,
  isBoosterTarget = false,
  isInvalidShake = false,
  compact = false,
}: TileBlockProps) {
  const palette = getTilePalette(value);

  const digitLen = String(value).length;
  const fontSizeClass = compact
    ? digitLen >= 4
      ? 'text-xs sm:text-sm'
      : digitLen === 3
      ? 'text-sm sm:text-base'
      : 'text-base sm:text-lg'
    : digitLen >= 5
    ? 'text-xs sm:text-sm'
    : digitLen === 4
    ? 'text-sm sm:text-base'
    : digitLen === 3
    ? 'text-base sm:text-xl'
    : 'text-xl sm:text-2xl';

  if (isGhost) {
    return (
      <div
        className={`w-full h-full rounded-xl border-2 border-dashed ${palette.border} bg-gradient-to-br ${palette.bg} opacity-35 flex items-center justify-center pointer-events-none`}
      >
        <span className={`font-display font-extrabold tabular-nums ${palette.text} ${fontSizeClass}`}>
          {value}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full h-full rounded-xl bg-gradient-to-br ${palette.bg} border ${
        palette.border
      } ${palette.shadow} flex items-center justify-center select-none ${
        justMerged ? 'animate-merge-pop' : ''
      } ${isInvalidShake ? 'animate-invalid-shake' : ''} ${
        isMatchHighlight
          ? 'ring-2 ring-white ring-offset-2 ring-offset-[#190934] brightness-110'
          : ''
      } ${
        isBoosterTarget
          ? 'ring-2 ring-rose-400 ring-offset-1 ring-offset-[#190934] brightness-110'
          : ''
      }`}
    >
      {/* Subtle top gloss highlight */}
      <div
        className="absolute inset-x-1 top-1 h-1/4 rounded-t-lg bg-gradient-to-b from-white/30 to-transparent pointer-events-none"
        aria-hidden="true"
      />
      <span
        className={`relative z-10 font-display font-extrabold tracking-tight tabular-nums leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.28)] ${palette.text} ${fontSizeClass}`}
      >
        {value}
      </span>
    </div>
  );
}
