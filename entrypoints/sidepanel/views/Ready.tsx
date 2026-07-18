import LinkedInUploadSection from '../../../components/LinkedInUploadSection';
import FoundJobCard from '../../../components/panel/FoundJobCard';
import UncertainJobCard from '../../../components/panel/UncertainJobCard';
import PanelFooter from '../../../components/panel/PanelFooter';
import StaleBanner from '../../../components/panel/StaleBanner';
import { scoringEnabled } from '../../../utils/scoringEnabled';
import type { Jd } from '../types';

interface Props {
  fileName: string;
  onDone: () => void;
  onRemove: () => void;
  linkedInFileName: string;
  onLinkedInDone: (fileName: string, text: string) => void;
  onLinkedInRemove: () => void;
  jd: Jd | null;
  jdLoading: boolean;
  jdError: string | null;
  stale: boolean;
  scoreAnyway: boolean;
  onScoreAnyway: (confirmed: boolean) => void;
  onRetryJd: () => void;
  onPastChecks: () => void;
  pastedJd: string;
  onJdPaste: (text: string) => void;
  scoring: boolean;
  scoreError: string | null;
  checksRemaining: number;
}

function ResumeRow({ fileName, meta, onRemove }: { fileName: string; meta: string; onRemove: () => void }) {
  return (
    <div className="mb-2 flex items-center gap-2.5 rounded-[10px] border border-line bg-white p-[11px_12px]">
      <span className="flex shrink-0">
        <svg width="15" height="15" viewBox="0 0 20 20" fill="var(--color-good)" aria-hidden="true"><path d="M7.6 13.6l-3.2-3.2L3 11.8l4.6 4.6L17 7l-1.4-1.4z" /></svg>
      </span>
      <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[12.5px] font-medium">
        {fileName}
        <span className="block text-[10.5px] font-normal text-ink-faint">{meta}</span>
      </span>
      <button type="button" onClick={onRemove} title="Remove resume" aria-label="Remove resume" className="flex shrink-0 text-[#C3C2D8] hover:text-bad focus-visible:outline-2 focus-visible:outline-brand rounded">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </button>
    </div>
  );
}

export default function Ready(props: Props) {
  const { fileName, onDone, onRemove, linkedInFileName, onLinkedInDone, onLinkedInRemove, jd, jdLoading, jdError, stale, scoreAnyway, onScoreAnyway, onRetryJd, onPastChecks, pastedJd, onJdPaste, scoring, scoreError, checksRemaining } = props;
  const exhausted = checksRemaining <= 0;
  const hasJd = jd !== null || pastedJd.trim().length >= 20;
  const uncertain = jd?.uncertain ?? false;
  const needsConfirm = uncertain && !scoreAnyway;
  const canScore = scoringEnabled({ hasJd, stale, uncertain, confirmed: scoreAnyway });

  return (
    <>
      <div className="panel-scroll min-h-0 flex-1 overflow-y-auto">
        {stale && (
          <StaleBanner>
            <b className="font-semibold text-ink">You've switched pages.</b> This is the job from the page you
            came from — <b className="font-semibold text-ink">click the JobFit icon</b> to read this page instead.
          </StaleBanner>
        )}
        {jd ? (
          jd.uncertain ? (
            <UncertainJobCard
              title={jd.title}
              company={jd.company}
              snippet={jd.text}
              hostname={jd.hostname}
              confirmed={scoreAnyway}
              onConfirmChange={onScoreAnyway}
            />
          ) : (
            <FoundJobCard title={jd.title} company={jd.company} snippet={jd.text} hostname={jd.hostname} />
          )
        ) : jdLoading ? (
          <div className="m-4 h-[92px] animate-pulse rounded-[11px] border border-line bg-white" />
        ) : (
          <div className="m-4 rounded-[11px] border border-[#FBE3C0] bg-warn-bg p-[13px_14px]">
            <div className="mb-[5px] flex items-center gap-[5px] text-[9.5px] font-bold uppercase tracking-[0.09em] text-warn">
              <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 12H9v-2h2v2zm0-3H9V6h2v5z" /></svg>
              Nothing readable on this page
            </div>
            <div className="mb-[3px] text-[12.5px] font-semibold leading-[1.4]">This page doesn't look like a job posting</div>
            <div className="text-[11.5px] leading-[1.45] text-ink-soft">Some sites load the description after the page settles, or hide it behind a tab. If the posting is visible to you, try reading the page again.</div>
            <button type="button" onClick={onRetryJd} className="mt-2.5 inline-flex items-center gap-[5px] text-[11.5px] font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand rounded">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg>
              Read this page again
            </button>
            {import.meta.env.DEV && jdError && (
              <div className="mt-2 rounded-md bg-white/60 p-2 font-mono text-[10px] leading-snug text-ink-faint">
                {jdError}
              </div>
            )}
          </div>
        )}

        <div className="px-4 pt-1">
          <div className="mb-[9px] text-[10.5px] font-bold uppercase tracking-[0.09em] text-ink-faint">Scoring against</div>
          <ResumeRow fileName={fileName} meta="Résumé · ready" onRemove={onRemove} />
          <LinkedInUploadSection fileName={linkedInFileName} onDone={onLinkedInDone} onRemove={onLinkedInRemove} variant="compact" />

          {!jd && !jdLoading && (
            <div className="mt-4">
              <div className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.09em] text-ink-faint">Paste the description instead</div>
              <textarea
                value={pastedJd}
                onChange={(e) => onJdPaste(e.target.value)}
                placeholder="Copy the job description from the page and paste it here…"
                className="min-h-[150px] w-full resize-y rounded-[11px] border border-line bg-white p-3 text-[12.5px] leading-[1.55] text-ink placeholder:text-[#B5B4CC] focus:border-brand focus:outline-none focus:ring-[3px] focus:ring-brand/10"
              />
            </div>
          )}
        </div>

        <div className="p-4">
          {!exhausted ? (
            <button
              type="button"
              onClick={onDone}
              disabled={!canScore || scoring}
              className="flex w-full items-center justify-center gap-2 rounded-[11px] bg-gradient-to-br from-brand-bright to-brand p-3.5 text-[14.5px] font-semibold text-white shadow-[0_4px_14px_rgba(79,70,229,0.26)] transition-transform hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:translate-y-0 disabled:bg-[#C9C7E8] disabled:shadow-none"
            >
              <svg width="17" height="17" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true"><path d="M9 2L4 9h4.5L7 16l7-9H9.5L11 2z" /></svg>
              Am I Fit?
            </button>
          ) : (
            <button
              type="button"
              onClick={() => browser.tabs.create({ url: 'https://example.com/upgrade' })}
              className="flex w-full items-center justify-center gap-2 rounded-[11px] bg-gradient-to-br from-brand-bright to-brand p-3.5 text-[14.5px] font-semibold text-white shadow-[0_4px_14px_rgba(79,70,229,0.26)] transition-transform hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Upgrade for more checks
            </button>
          )}
          {scoreError && <p className="mt-2.5 text-center text-xs text-bad">{scoreError}</p>}
          <div className="mt-2.5 text-center text-[11px] text-ink-faint">
            {exhausted
              ? '0 of 5 free checks left today · resets tomorrow'
              : stale
                ? 'Switched pages — click the JobFit icon to score this one'
                : needsConfirm
                  ? 'Confirm above to score this page'
                  : hasJd
                    ? `${checksRemaining} of 5 free checks remaining today`
                    : 'Paste at least a paragraph to score'}
          </div>
        </div>
      </div>

      <PanelFooter
        left={
          <button
            type="button"
            onClick={onPastChecks}
            className="inline-flex items-center gap-[5px] rounded text-[12.5px] font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 106 5.3L3 8" /><path d="M12 7v5l3 2" />
            </svg>
            Past checks
          </button>
        }
      />
    </>
  );
}
