import type { FitResult } from '../../utils/scorer';
import DimensionBars from '../panel/DimensionBars';
import { evidenceLead, splitActionStep, verdictHeadline, verdictSummary } from '../../utils/verdictCopy';

function EvidenceList({ kind, heading, items }: { kind: 'good' | 'bad'; heading: string; items: string[] }) {
  const good = kind === 'good';
  return (
    <>
      <div className={`mb-[11px] flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[0.09em] ${good ? 'text-good' : 'text-bad'}`}>
        {good ? (
          <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M7.6 13.6l-3.2-3.2L3 11.8l4.6 4.6L17 7l-1.4-1.4z" /></svg>
        ) : (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        )}
        {heading}
      </div>
      {items.map((item, i) => (
        <div key={i} className="mb-2 flex gap-2 text-[11.5px] leading-[1.5] text-ink-soft last:mb-0">
          <span className="mt-0.5 flex shrink-0">
            {good ? (
              <svg width="11" height="11" viewBox="0 0 20 20" fill="var(--color-good)" aria-hidden="true"><path d="M7.6 13.6l-3.2-3.2L3 11.8l4.6 4.6L17 7l-1.4-1.4z" /></svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--color-bad)" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            )}
          </span>
          <span>{item}</span>
        </div>
      ))}
    </>
  );
}

const cardHead = 'mb-[11px] flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-[0.09em]';

export default function RowDetail({ result }: { result: FitResult }) {
  return (
    <div className="border-t border-lavender-deep bg-lavender px-4 pb-5 pt-1">
      <div className="max-w-[700px] py-3 text-[13px] leading-[1.55] text-ink-soft">
        <b className="font-semibold text-ink">{verdictHeadline(result.overall)}.</b> {verdictSummary(result.dimensions)}
      </div>

      <div className="grid gap-4 md:grid-cols-[1.15fr_1fr_1.15fr]">
        {/* Evidence */}
        <div className="rounded-[11px] border border-line bg-white p-[15px]">
          <EvidenceList kind="good" heading="Working for you" items={result.strengths} />
          <div className="mt-4" />
          <EvidenceList kind="bad" heading="Working against you" items={result.gaps} />
        </div>

        {/* Breakdown */}
        <div className="rounded-[11px] border border-line bg-white p-[15px]">
          <div className={`${cardHead} text-brand`}>
            <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M3 3h2v14H3V3zm12 4h2v10h-2V7zM9 9h2v8H9V9z" /></svg>
            Breakdown
          </div>
          <DimensionBars dimensions={result.dimensions} />
          <div className="mt-[13px] border-t border-line pt-[13px] text-[11px] leading-[1.5] text-ink-faint">
            {evidenceLead(result.overall, result.dimensions)}
          </div>
        </div>

        {/* Plan — numbered markers, not checkboxes (this is a review view) */}
        <div className="rounded-[11px] border border-line bg-white p-[15px]">
          <div className={`${cardHead} text-brand`}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>
            Close the gap
          </div>
          <ol className="list-none">
            {result.actionPlan.map((raw, i) => {
              const { title, detail } = splitActionStep(raw);
              return (
                <li key={i} className="mb-[10px] flex gap-[9px] last:mb-0">
                  <span className="mt-px grid h-[17px] w-[17px] shrink-0 place-items-center rounded-full bg-lavender text-[10px] font-bold text-brand">{i + 1}</span>
                  <span>
                    <span className="block text-[11.5px] font-semibold leading-[1.35]">{title}</span>
                    {detail && <span className="mt-0.5 block text-[10.5px] leading-[1.45] text-ink-faint">{detail}</span>}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
