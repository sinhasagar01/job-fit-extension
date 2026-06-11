interface Props {
  onDone: () => void;
}

export default function Ready({ onDone }: Props) {
  return (
    <div className="flex flex-col gap-4 px-6 py-6">
      <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
        <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
        <span className="truncate">your-resume.pdf</span>
      </div>

      <div className="rounded-lg border border-dashed border-gray-200 px-3 py-2 text-xs text-gray-400">
        No job description detected on this page.
      </div>

      <button
        onClick={onDone}
        className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 active:scale-[0.98] transition-all"
      >
        Am I Fit?
      </button>

      <p className="text-center text-xs text-gray-400">5 of 5 free checks remaining today</p>
    </div>
  );
}
