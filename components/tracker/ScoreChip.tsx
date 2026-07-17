import { scoreBand } from '../../utils/scoreBand';

const CHIP: Record<ReturnType<typeof scoreBand>, string> = {
  green: 'bg-good-bg text-good',
  amber: 'bg-warn-bg text-warn',
  red: 'bg-bad-bg text-bad',
};

/** Band-coloured score/10 pill for a history row. */
export default function ScoreChip({ score }: { score: number }) {
  return (
    <span className={`inline-flex items-baseline gap-px rounded-full px-[9px] py-0.5 font-display font-bold ${CHIP[scoreBand(score)]}`}>
      <span className="text-sm leading-none">{score}</span>
      <span className="text-[10px] opacity-55">/10</span>
    </span>
  );
}
