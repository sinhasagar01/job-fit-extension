import { useEffect, useRef, useState } from 'react';
import type { FitResult } from '../../../utils/scorer';
import { DIMENSION_LABELS, strongestWeakest } from '../../../utils/dimensions';
import {
  evidenceLead,
  splitActionStep,
  verdictHeadline,
  verdictSummary,
} from '../../../utils/verdictCopy';
import ScoreRing from '../../../components/panel/ScoreRing';
import DimensionBars from '../../../components/panel/DimensionBars';
import PanelFooter from '../../../components/panel/PanelFooter';
import StaleBanner from '../../../components/panel/StaleBanner';

type Tab = 'verdict' | 'evidence' | 'plan';

interface Props {
  result: FitResult;
  title: string | null;
  company: string | null;
  stale: boolean;
  onBack: () => void;
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'verdict', label: 'Verdict' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'plan', label: 'Plan' },
];

export default function Results({ result, title, company, stale, onBack }: Props) {
  const [tab, setTab] = useState<Tab>('verdict');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Switching tabs resets the scroll to top (per spec).
  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [tab]);

  return (
    <>
      {/* pinned role + tabs */}
      <div className="border-b border-line bg-white px-4 pt-[13px] shrink-0">
        <div className="mb-[11px]">
          <div className="text-[13px] font-semibold leading-[1.3]">{title ?? 'This role'}</div>
          {company && <div className="text-[11.5px] text-ink-faint">{company}</div>}
        </div>
        <div className="flex gap-0.5" role="tablist" aria-label="Result sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`-mb-px flex items-center gap-[5px] border-b-2 px-[11px] py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand ${
                tab === t.id
                  ? 'border-brand text-brand'
                  : 'border-transparent text-ink-faint hover:text-ink-soft'
              }`}
            >
              {t.label}
            </button>
          ))}
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="-mb-px flex items-center gap-[5px] border-b-2 border-transparent px-[11px] py-2 text-xs font-semibold text-ink-faint opacity-75"
          >
            Chat
            <span className="rounded-full bg-lavender-deep px-[5px] py-px text-[8.5px] font-bold tracking-[0.03em] text-brand">
              SOON
            </span>
          </button>
        </div>
      </div>

      {stale && (
        <StaleBanner>
          This check is for <b className="font-semibold text-ink">{title ?? 'the previous role'}</b>
          {company ? ` at ${company}` : ''}. You've moved to a different page —{' '}
          <b className="font-semibold text-ink">click the JobFit icon</b> to score this one.
        </StaleBanner>
      )}

      {/* scrollable panes */}
      <div ref={scrollRef} className="panel-scroll min-h-0 flex-1 overflow-y-auto">
        <div className="p-4">
          <VerdictPane result={result} hidden={tab !== 'verdict'} onSeePlan={() => setTab('plan')} />
          <EvidencePane result={result} hidden={tab !== 'evidence'} />
          <PlanPane result={result} hidden={tab !== 'plan'} />
        </div>
      </div>

      <PanelFooter
        left={
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-[5px] text-[12.5px] font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand rounded"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Check another job
          </button>
        }
      />
    </>
  );
}

function VerdictPane({ result, hidden, onSeePlan }: { result: FitResult; hidden: boolean; onSeePlan: () => void }) {
  const { strongest, weakest } = strongestWeakest(result.dimensions);
  return (
    <div role="tabpanel" id="panel-verdict" aria-labelledby="tab-verdict" hidden={hidden}>
      <div className="mb-[14px] rounded-xl border border-line bg-white p-4">
        <div className="mb-[13px] flex items-center gap-[14px]">
          <ScoreRing score={result.overall} />
          <div>
            <div className="mb-[3px] font-display text-[15.5px] font-semibold -tracking-[0.01em]">
              {verdictHeadline(result.overall)}
            </div>
            <div className="text-xs leading-[1.45] text-ink-soft">{verdictSummary(result.dimensions)}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 rounded-lg bg-good-bg p-[9px_10px] text-[11px] leading-[1.4]">
            <div className="mb-1 text-[9.5px] font-bold uppercase tracking-[0.06em] text-good">Strongest</div>
            <div className="text-ink-soft">{DIMENSION_LABELS[strongest]} — {result.dimensions[strongest]}/10</div>
          </div>
          <div className="flex-1 rounded-lg bg-bad-bg p-[9px_10px] text-[11px] leading-[1.4]">
            <div className="mb-1 text-[9.5px] font-bold uppercase tracking-[0.06em] text-bad">Weakest</div>
            <div className="text-ink-soft">{DIMENSION_LABELS[weakest]} — {result.dimensions[weakest]}/10</div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onSeePlan}
        className="mb-[14px] flex w-full items-center gap-2.5 rounded-[11px] bg-gradient-to-br from-brand-bright to-brand p-[13px_14px] text-left text-white shadow-[0_4px_14px_rgba(79,70,229,0.26)] transition-transform hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg bg-white/[0.18]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
        </span>
        <span className="flex-1">
          <span className="block text-[13px] font-semibold leading-[1.3]">
            See your {result.actionPlan.length}-step plan
          </span>
          <span className="mt-px block text-[11px] opacity-80">Concrete steps to raise your fit</span>
        </span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-70" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      <div className="mb-2.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-faint">Breakdown</div>
      <DimensionBars dimensions={result.dimensions} />

      <div className="mt-[14px] flex items-center gap-2.5 rounded-[11px] border border-dashed border-lavender-deep bg-lavender p-[13px_14px]">
        <span className="flex shrink-0 text-brand">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        </span>
        <span className="text-[11.5px] leading-[1.4] text-ink-soft">
          <b className="mb-px block text-xs font-semibold text-ink">Rewrite for this role</b>
          Talk through your gaps and get a tailored resume back, without leaving the page.
        </span>
      </div>
    </div>
  );
}

function EvidencePane({ result, hidden }: { result: FitResult; hidden: boolean }) {
  return (
    <div role="tabpanel" id="panel-evidence" aria-labelledby="tab-evidence" hidden={hidden}>
      <div className="mb-4 rounded-[11px] border border-line bg-white p-[13px_14px]">
        <div className="mb-[6px] text-[10px] font-bold uppercase tracking-[0.09em] text-ink-faint">
          What moved the number
        </div>
        <div className="text-[12.5px] leading-[1.5] text-ink-soft">
          {evidenceLead(result.overall, result.dimensions)}
        </div>
      </div>

      <EvidenceList kind="good" heading="Working for you" items={result.strengths} />
      <EvidenceList kind="bad" heading="Working against you" items={result.gaps} />

      <div className="rounded-[11px] border border-lavender-deep bg-lavender p-[13px_14px]">
        <div className="mb-[7px] flex items-center gap-[6px] text-[10px] font-bold uppercase tracking-[0.09em] text-brand">
          <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M10 2a6 6 0 00-3.5 10.9V15a1 1 0 001 1h5a1 1 0 001-1v-2.1A6 6 0 0010 2zM8 17h4v1H8v-1z" />
          </svg>
          In one line
        </div>
        <div className="text-[12.5px] leading-[1.5] text-ink">{result.suggestion}</div>
      </div>
    </div>
  );
}

function EvidenceList({ kind, heading, items }: { kind: 'good' | 'bad'; heading: string; items: string[] }) {
  const good = kind === 'good';
  return (
    <div className="mb-[18px]">
      <div className={`mb-2.5 flex items-center gap-[6px] text-[10px] font-bold uppercase tracking-[0.09em] ${good ? 'text-good' : 'text-bad'}`}>
        {good ? (
          <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M7.6 13.6l-3.2-3.2L3 11.8l4.6 4.6L17 7l-1.4-1.4z" /></svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        )}
        {heading}
        <span className="ml-auto rounded-full bg-lavender px-[7px] py-px text-[9.5px] font-normal tracking-normal text-ink-faint">
          {items.length}
        </span>
      </div>
      {items.map((item, i) => (
        <div key={i} className="mb-[7px] flex gap-2.5 rounded-[10px] border border-line bg-white p-[11px_12px] last:mb-0">
          <span className="mt-0.5 flex shrink-0">
            {good ? (
              <svg width="13" height="13" viewBox="0 0 20 20" fill="var(--color-good)" aria-hidden="true"><path d="M7.6 13.6l-3.2-3.2L3 11.8l4.6 4.6L17 7l-1.4-1.4z" /></svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-bad)" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            )}
          </span>
          <span className="text-xs leading-[1.5] text-ink-soft">{item}</span>
        </div>
      ))}
    </div>
  );
}

function PlanPane({ result, hidden }: { result: FitResult; hidden: boolean }) {
  const steps = result.actionPlan;
  const [done, setDone] = useState<boolean[]>(() => steps.map(() => false));
  const doneCount = done.filter(Boolean).length;
  const pct = steps.length ? (doneCount / steps.length) * 100 : 0;

  return (
    <div role="tabpanel" id="panel-plan" aria-labelledby="tab-plan" hidden={hidden}>
      <div className="mb-[14px] flex items-center gap-3 rounded-[11px] border border-line bg-white p-[13px_14px]">
        <div
          className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full"
          style={{ background: `conic-gradient(var(--color-good) 0% ${pct}%, #EDEDF6 ${pct}% 100%)` }}
        >
          <span className="absolute inset-1 rounded-full bg-white" />
          <span className="relative z-[1] text-[11px] font-bold tabular-nums text-ink-soft">
            {doneCount}/{steps.length}
          </span>
        </div>
        <div>
          <div className="mb-0.5 text-[12.5px] font-semibold">Close the gap</div>
          <div className="text-[11.5px] leading-[1.4] text-ink-soft">Tick these off as you go.</div>
        </div>
      </div>

      {steps.map((step, i) => {
        const { title, detail } = splitActionStep(step);
        const isDone = done[i];
        return (
          <button
            key={i}
            type="button"
            aria-pressed={isDone}
            onClick={() => setDone((d) => d.map((v, j) => (j === i ? !v : v)))}
            className="mb-2 flex w-full gap-[11px] rounded-[11px] border border-line bg-white p-[13px] text-left transition-transform hover:-translate-y-px hover:border-lavender-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <span className={`mt-px grid h-[17px] w-[17px] shrink-0 place-items-center rounded-[5px] border-[1.5px] ${isDone ? 'border-good bg-good' : 'border-[#CFCEE4]'}`}>
              <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={isDone ? 'opacity-100' : 'opacity-0'} aria-hidden="true">
                <polyline points="2 6 5 9 10 3" />
              </svg>
            </span>
            <span>
              <span className={`mb-[3px] block text-[13px] font-semibold leading-[1.4] ${isDone ? 'text-ink-faint line-through' : ''}`}>{title}</span>
              {detail && <span className="block text-[11.5px] leading-[1.45] text-ink-soft">{detail}</span>}
            </span>
          </button>
        );
      })}

      <div className="mt-[14px] text-center text-[11px] leading-[1.45] text-ink-faint">
        Ticks are just for you. Nothing is saved or sent.
      </div>
    </div>
  );
}
