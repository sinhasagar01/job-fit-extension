interface Props {
  onBack: () => void;
}

export default function ShowingResults({ onBack }: Props) {
  return (
    <div className="flex flex-col gap-4 px-6 py-6">
      <div className="flex items-center justify-center h-32 rounded-lg bg-gray-50 text-gray-400 text-sm">
        Results placeholder
      </div>
      <div className="flex items-center justify-center h-40 rounded-lg bg-gray-50 text-gray-400 text-sm">
        Radar chart placeholder
      </div>
      <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-400">
        Summary bullets placeholder
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
