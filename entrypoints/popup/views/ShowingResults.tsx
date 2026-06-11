import type { FitResult } from '../../../utils/scorer';
import FitScore from '../../../components/FitScore';
import DimensionRadar from '../../../components/DimensionRadar';
import SummaryBullets from '../../../components/SummaryBullets';

interface Props {
  onBack: () => void;
  result: FitResult;
  title: string | null;
  company: string | null;
}

export default function ShowingResults({ onBack, result, title, company }: Props) {
  return (
    <div className="flex flex-col gap-4 px-6 py-6">
      <FitScore overall={result.overall} />
      {(title || company) && (
        <p className="text-center text-xs text-gray-400 -mt-2">
          Fit for: {[title, company].filter(Boolean).join(' at ')}
        </p>
      )}
      <DimensionRadar dimensions={result.dimensions} />
      <SummaryBullets
        strengths={result.strengths}
        gaps={result.gaps}
        suggestion={result.suggestion}
      />
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        Check another job
      </button>
    </div>
  );
}
