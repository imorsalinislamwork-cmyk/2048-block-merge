import { Bomb, Hammer, Shuffle, Undo2 } from 'lucide-react';
import { BoosterCounts, BoosterType } from '../types/mergeGame';

interface BoosterBarProps {
  boosters: BoosterCounts;
  activeTargeting: 'hammer' | 'bomb' | null;
  canUndo: boolean;
  canShuffle: boolean;
  hasBlocks: boolean;
  disabled: boolean;
  onActivateBooster: (type: BoosterType) => void;
}

export function BoosterBar({
  boosters,
  activeTargeting,
  canUndo,
  canShuffle,
  hasBlocks,
  disabled,
  onActivateBooster,
}: BoosterBarProps) {
  const items: Array<{
    id: BoosterType;
    label: string;
    count: number;
    icon: typeof Hammer;
    isAvailable: boolean;
    accentClass: string;
  }> = [
    {
      id: 'hammer',
      label: activeTargeting === 'hammer' ? 'Cancel' : 'Hammer',
      count: boosters.hammer,
      icon: Hammer,
      isAvailable: boosters.hammer > 0 && hasBlocks,
      accentClass:
        activeTargeting === 'hammer'
          ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.55)]'
          : 'bg-[#26114d] hover:bg-[#321763] text-amber-300 border-purple-500/35',
    },
    {
      id: 'bomb',
      label: activeTargeting === 'bomb' ? 'Cancel' : 'Bomb',
      count: boosters.bomb,
      icon: Bomb,
      isAvailable: boosters.bomb > 0 && hasBlocks,
      accentClass:
        activeTargeting === 'bomb'
          ? 'bg-rose-500 text-white border-rose-300 shadow-[0_0_16px_rgba(244,63,94,0.6)]'
          : 'bg-[#26114d] hover:bg-[#321763] text-rose-300 border-purple-500/35',
    },
    {
      id: 'shuffle',
      label: 'Shuffle',
      count: boosters.shuffle,
      icon: Shuffle,
      isAvailable: boosters.shuffle > 0 && canShuffle,
      accentClass: 'bg-[#26114d] hover:bg-[#321763] text-cyan-300 border-purple-500/35',
    },
    {
      id: 'undo',
      label: 'Undo',
      count: boosters.undo,
      icon: Undo2,
      isAvailable: boosters.undo > 0 && canUndo,
      accentClass: 'bg-[#26114d] hover:bg-[#321763] text-emerald-300 border-purple-500/35',
    },
  ];

  return (
    <div
      className="w-full grid grid-cols-4 gap-2"
      role="toolbar"
      aria-label="Power-up boosters"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isTargeted = activeTargeting === item.id;
        const isDisabled = disabled || (!item.isAvailable && !isTargeted);

        return (
          <button
            key={item.id}
            type="button"
            disabled={isDisabled}
            onClick={() => onActivateBooster(item.id)}
            aria-pressed={isTargeted}
            className={`relative min-h-[52px] sm:min-h-[56px] px-2 py-1.5 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all active:scale-[0.96] disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-400 ${item.accentClass}`}
          >
            <Icon className="w-4 h-4 sm:w-[18px] sm:h-[18px]" strokeWidth={2.3} />
            <span className="text-[11px] sm:text-xs font-semibold tracking-tight whitespace-nowrap shrink-0">
              {item.label}
            </span>

            <span
              className={`absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full text-[10px] font-mono-num font-bold flex items-center justify-center border ${
                isTargeted
                  ? 'bg-white text-slate-950 border-white'
                  : 'bg-[#120629] text-purple-100 border-purple-400/50'
              }`}
            >
              {item.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
