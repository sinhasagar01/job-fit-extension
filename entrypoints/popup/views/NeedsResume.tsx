interface Props {
  onDone: () => void;
}

export default function NeedsResume({ onDone }: Props) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4 px-6 py-10 text-center">
      <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center">
        <svg className="w-7 h-7 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
      </div>
      <div>
        <h2 className="text-base font-semibold text-gray-900">Upload your resume</h2>
        <p className="mt-1 text-sm text-gray-500">We'll use it to score your fit for any job you're viewing.</p>
      </div>
      <button
        disabled
        className="mt-2 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white opacity-50 cursor-not-allowed"
      >
        Choose PDF…
      </button>
      <button onClick={onDone} className="text-xs text-gray-400 underline">
        Skip (dev only)
      </button>
    </div>
  );
}
