import LinkedInUploadSection from '../../../components/LinkedInUploadSection';

interface Props {
  fileName: string;
  onDone: () => void;
  onRemove: () => void;
  linkedInFileName: string;
  onLinkedInDone: (fileName: string, text: string) => void;
  onLinkedInRemove: () => void;
  jdText: string | null;
  jdLoading: boolean;
  pastedJd: string;
  onJdPaste: (text: string) => void;
}

export default function Ready({ fileName, onDone, onRemove, linkedInFileName, onLinkedInDone, onLinkedInRemove, jdText, jdLoading, pastedJd, onJdPaste }: Props) {
  const hasJd = jdText !== null || pastedJd.trim().length > 0;

  return (
    <div className="flex flex-col gap-4 px-6 py-6">
      <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
        <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
        <span className="truncate flex-1">{fileName}</span>
        <button
          onClick={onRemove}
          className="text-gray-400 hover:text-red-500 transition-colors shrink-0 ml-1"
          title="Remove resume"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <LinkedInUploadSection
        fileName={linkedInFileName}
        onDone={onLinkedInDone}
        onRemove={onLinkedInRemove}
      />

      {jdLoading ? (
        <div className="rounded-lg border border-dashed border-gray-200 px-3 py-2 text-xs text-gray-400">
          Detecting job description…
        </div>
      ) : jdText !== null ? (
        <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2">
          <p className="text-[10px] font-medium text-green-600 uppercase tracking-wide mb-1">Job description detected</p>
          <p className="text-xs text-gray-700 line-clamp-3">
            {jdText.length > 120 ? jdText.slice(0, 120) + '…' : jdText}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-gray-400">No job description detected — paste it here</p>
          <textarea
            value={pastedJd}
            onChange={(e) => onJdPaste(e.target.value)}
            rows={4}
            placeholder="Paste the job description…"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-700 placeholder-gray-300 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
      )}

      <button
        onClick={onDone}
        disabled={!hasJd}
        className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
      >
        Am I Fit?
      </button>

      <p className="text-center text-xs text-gray-400">5 of 5 free checks remaining today</p>
    </div>
  );
}
