interface Props {
  /** Remaining daily checks; null hides the counter (pre-resume). */
  checksRemaining: number | null;
  onSettings: () => void;
}

/** Pinned top bar: logo, name, checks-left, settings gear. */
export default function BrandBar({ checksRemaining, onSettings }: Props) {
  return (
    <div className="flex items-center gap-[9px] px-4 py-3 border-b border-line bg-white shrink-0">
      <span className="grid place-items-center w-6 h-6 rounded-[7px] shrink-0 bg-gradient-to-br from-brand-bright to-brand-deep">
        <svg width="13" height="13" viewBox="0 0 18 18" fill="white" aria-hidden="true">
          <path d="M9 2L4 9h4.5L7 16l7-9H9.5L11 2z" />
        </svg>
      </span>
      <span className="font-bold text-[13.5px] -tracking-[0.01em]">JobFit</span>
      <span className="ml-auto flex items-center gap-3">
        {checksRemaining !== null && (
          <span className="text-[11.5px] text-ink-faint tabular-nums">
            {checksRemaining} {checksRemaining === 1 ? 'check' : 'checks'} left
          </span>
        )}
        <button
          type="button"
          onClick={onSettings}
          title="Settings"
          aria-label="Settings"
          className="flex text-[#B6B5CE] hover:text-brand transition-colors focus-visible:outline-2 focus-visible:outline-brand rounded"
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.53 1.53 0 01-2.29.95c-1.37-.84-2.94.73-2.1 2.1.54.89.06 2.04-.95 2.29-1.56.38-1.56 2.6 0 2.98.95.23 1.49 1.4.95 2.29-.84 1.37.73 2.94 2.1 2.1.89-.54 2.04-.06 2.29.95.38 1.56 2.6 1.56 2.98 0a1.53 1.53 0 012.29-.95c1.37.84 2.94-.73 2.1-2.1a1.53 1.53 0 01.95-2.29c1.56-.38 1.56-2.6 0-2.98a1.53 1.53 0 01-.95-2.29c.84-1.37-.73-2.94-2.1-2.1a1.53 1.53 0 01-2.29-.95zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
        </button>
      </span>
    </div>
  );
}
