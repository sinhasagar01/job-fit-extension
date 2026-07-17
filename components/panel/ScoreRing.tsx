import { scoreBand } from '../../utils/scoreBand';

const BAND_VAR: Record<ReturnType<typeof scoreBand>, string> = {
  green: 'var(--color-good)',
  amber: 'var(--color-warn)',
  red: 'var(--color-bad)',
};

/** Conic-gradient ring showing overall/10, coloured by band. */
export default function ScoreRing({ score, size = 62 }: { score: number; size?: number }) {
  const color = BAND_VAR[scoreBand(score)];
  const pct = Math.max(0, Math.min(10, score)) * 10;
  const inset = size >= 56 ? 6 : 4;
  const fontSize = size >= 56 ? 22 : 11;
  return (
    <div
      className="relative grid place-items-center rounded-full shrink-0"
      style={{ width: size, height: size, background: `conic-gradient(${color} 0% ${pct}%, #EDEDF6 ${pct}% 100%)` }}
      role="img"
      aria-label={`Overall fit ${score} out of 10`}
    >
      <span className="absolute rounded-full bg-white" style={{ inset }} />
      <span
        className="relative z-[1] font-display font-bold leading-none tabular-nums"
        style={{ color, fontSize }}
      >
        {score}
      </span>
    </div>
  );
}
