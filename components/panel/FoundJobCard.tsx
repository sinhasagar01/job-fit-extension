interface Props {
  title: string | null;
  company: string | null;
  snippet: string;
  hostname: string | null;
}

/** The constant across pre-score states: what extractJd read from the tab. */
export default function FoundJobCard({ title, company, snippet, hostname }: Props) {
  return (
    <div className="m-4 rounded-[11px] border border-[#CDEBDF] bg-good-bg p-[13px_14px]">
      <div className="mb-[5px] flex items-center gap-[5px] text-[9.5px] font-bold uppercase tracking-[0.09em] text-good">
        <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M7.6 13.6l-3.2-3.2L3 11.8l4.6 4.6L17 7l-1.4-1.4z" />
        </svg>
        Job found on this page
      </div>
      {title && <div className="mb-0.5 text-[13.5px] font-semibold leading-[1.35]">{title}</div>}
      {company && <div className="mb-2 text-xs text-ink-soft">{company}</div>}
      {snippet && (
        <div className="border-t border-[#D3EDE2] pt-2 text-[11.5px] leading-[1.5] text-ink-soft">
          {snippet.length > 160 ? `${snippet.slice(0, 160)}…` : snippet}
        </div>
      )}
      {hostname && (
        <div className="mt-[7px] flex items-center gap-1 text-[9.5px] text-[#7FB99F]">
          <svg width="9" height="9" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 12H9v-2h2v2zm0-3H9V6h2v5z" />
          </svg>
          {hostname} · read from this tab only
        </div>
      )}
    </div>
  );
}
