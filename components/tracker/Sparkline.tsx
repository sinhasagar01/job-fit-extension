import type { FitResult } from '../../utils/scorer';
import { DIMENSION_KEYS, DIMENSION_LABELS } from '../../utils/dimensions';
import { scoreBand } from '../../utils/scoreBand';

const BAR: Record<ReturnType<typeof scoreBand>, string> = {
  green: 'bg-good',
  amber: 'bg-warn',
  red: 'bg-bad',
};

/** Five band-coloured bars — the dimension breakdown at a glance. */
export default function Sparkline({ dimensions }: { dimensions: FitResult['dimensions'] }) {
  return (
    <span
      className="flex h-[22px] items-end gap-[3px]"
      role="img"
      aria-label={`Breakdown: ${DIMENSION_KEYS.map((k) => `${DIMENSION_LABELS[k]} ${dimensions[k]}`).join(', ')}`}
    >
      {DIMENSION_KEYS.map((k) => (
        <i
          key={k}
          className={`block w-[7px] rounded-t-sm ${BAR[scoreBand(dimensions[k])]}`}
          style={{ height: `${Math.max(10, dimensions[k] * 10)}%` }}
        />
      ))}
    </span>
  );
}
