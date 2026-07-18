interface Props {
  title: string | null;
  company: string | null;
  snippet: string;
  hostname: string | null;
  confirmed: boolean;
  onConfirmChange: (confirmed: boolean) => void;
}

/**
 * Shown when extractJd's detection is *uncertain* (phrase-only readability, no
 * definitive/strong signal). Previews what was read and requires an explicit
 * "score it anyway" before the primary path unlocks — we don't spend a check
 * (or, once hosted, money) guessing on a page that may not be a job posting.
 */
export default function UncertainJobCard({ title, company, snippet, hostname, confirmed, onConfirmChange }: Props) {
  return (
    <div className="m-4 rounded-[11px] border border-[#FBE3C0] bg-warn-bg p-[13px_14px]">
      <div className="mb-[5px] flex items-center gap-[5px] text-[9.5px] font-bold uppercase tracking-[0.09em] text-warn">
        <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 12H9v-2h2v2zm0-3H9V6h2v5z" />
        </svg>
        This doesn't look like a job posting
      </div>
      {title && <div className="mb-0.5 text-[13.5px] font-semibold leading-[1.35]">{title}</div>}
      {company && <div className="mb-2 text-xs text-ink-soft">{company}</div>}
      {snippet && (
        <div className="border-t border-[#FBE3C0] pt-2 text-[11.5px] leading-[1.5] text-ink-soft">
          {snippet.length > 160 ? `${snippet.slice(0, 160)}…` : snippet}
        </div>
      )}
      {hostname && (
        <div className="mt-[7px] flex items-center gap-1 text-[9.5px] text-warn">
          <svg width="9" height="9" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 12H9v-2h2v2zm0-3H9V6h2v5z" />
          </svg>
          {hostname} · read from this tab only
        </div>
      )}
      <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-lg bg-white/50 p-2.5">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => onConfirmChange(e.target.checked)}
          className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-brand focus-visible:outline-2 focus-visible:outline-brand"
        />
        <span className="text-[11.5px] font-medium leading-[1.4] text-ink">
          Score it anyway — I've checked, this is the job description.
        </span>
      </label>
    </div>
  );
}
