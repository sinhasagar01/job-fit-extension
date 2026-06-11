interface Props {
  strengths: [string, string, string];
  gaps: [string, string, string];
  suggestion: string;
}

export default function SummaryBullets({ strengths, gaps, suggestion }: Props) {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-green-700 mb-1">Strengths</p>
        <ul className="flex flex-col gap-1">
          {strengths.map((s, i) => (
            <li key={i} className="flex gap-1.5 text-gray-700">
              <span className="text-green-500 shrink-0">✓</span>
              {s}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-red-600 mb-1">Gaps</p>
        <ul className="flex flex-col gap-1">
          {gaps.map((g, i) => (
            <li key={i} className="flex gap-1.5 text-gray-700">
              <span className="text-red-400 shrink-0">✗</span>
              {g}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 mb-1">Suggestion</p>
        <p className="text-gray-700">{suggestion}</p>
      </div>
    </div>
  );
}
