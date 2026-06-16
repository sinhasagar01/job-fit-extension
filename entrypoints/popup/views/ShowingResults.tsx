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

      <div
        className="rounded-xl px-4 py-3 flex flex-col gap-2.5"
        style={{
          background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
          border: '1px solid #fde68a',
          boxShadow: '0 1px 4px rgba(217,119,6,0.08)',
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}
          >
            <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 1a.75.75 0 0 1 .75.75v5.5h5.5a.75.75 0 0 1 0 1.5h-5.5v5.5a.75.75 0 0 1-1.5 0v-5.5H1.75a.75.75 0 0 1 0-1.5h5.5V1.75A.75.75 0 0 1 8 1Z" />
            </svg>
          </span>
          <p className="text-xs font-semibold text-amber-800 tracking-wide uppercase">How to close the gap</p>
        </div>
        <ol className="flex flex-col gap-2 list-none">
          {result.actionPlan.map((item, i) => (
            <li key={i} className="flex gap-2.5 items-start">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold text-amber-800"
                style={{ background: '#fde68a' }}
              >
                {i + 1}
              </span>
              <span className="text-xs text-amber-900 leading-snug">{item}</span>
            </li>
          ))}
        </ol>
      </div>

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
