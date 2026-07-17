import type { FitResult } from '../../utils/scorer';
import { DIMENSION_KEYS, DIMENSION_LABELS } from '../../utils/dimensions';
import { scoreBand } from '../../utils/scoreBand';

const BAND_VAR: Record<ReturnType<typeof scoreBand>, string> = {
  green: 'var(--color-good)',
  amber: 'var(--color-warn)',
  red: 'var(--color-bad)',
};

/** Horizontal per-dimension bars (replaces the popup's radar chart). */
export default function DimensionBars({ dimensions }: { dimensions: FitResult['dimensions'] }) {
  return (
    <div className="rounded-[11px] border border-line bg-white p-[14px]">
      {DIMENSION_KEYS.map((k) => {
        const v = dimensions[k];
        return (
          <div key={k} className="mb-[9px] flex items-center gap-2.5 last:mb-0">
            <span className="w-[74px] shrink-0 text-[11.5px] text-ink-soft">{DIMENSION_LABELS[k]}</span>
            <span className="h-[5px] flex-1 overflow-hidden rounded-full bg-[#E9E9F4]">
              <span
                className="block h-full rounded-full"
                style={{ width: `${Math.max(0, Math.min(10, v)) * 10}%`, background: BAND_VAR[scoreBand(v)] }}
              />
            </span>
            <span className="w-[22px] text-right text-[11px] font-semibold tabular-nums text-ink-soft">{v}</span>
          </div>
        );
      })}
    </div>
  );
}
