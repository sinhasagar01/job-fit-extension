interface Props {
  overall: number;
}

function scoreColor(overall: number): string {
  if (overall <= 4) return 'text-red-500';
  if (overall <= 6) return 'text-amber-500';
  return 'text-green-500';
}

export default function FitScore({ overall }: Props) {
  return (
    <div className="flex flex-col items-center gap-1 py-2">
      <div className="flex items-baseline gap-0.5">
        <span className={`text-6xl font-bold tabular-nums ${scoreColor(overall)}`}>{overall}</span>
        <span className="text-2xl font-normal text-gray-400">/10</span>
      </div>
      <span className="text-sm text-gray-500">Overall Fit</span>
    </div>
  );
}
