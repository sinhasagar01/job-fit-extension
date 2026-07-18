import PanelFooter from '../../../components/panel/PanelFooter';

interface Props {
  onUseOwnKey: () => void;
  onBack: () => void;
}

/**
 * Shown when the hosted free tier is at capacity (the Worker returns
 * free_tier_exhausted). Calm, not an error — the user has already seen value.
 * Two EQUAL paths: bring your own key (unlimited, straight to the provider) or
 * Pro (coming soon). No pushy upsell, no toast.
 */
export default function FreeTierExhausted({ onUseOwnKey, onBack }: Props) {
  return (
    <>
      <div className="panel-scroll min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mb-4 rounded-[11px] border border-line bg-white p-4">
          <div className="mb-1 font-display text-[15.5px] font-semibold -tracking-[0.01em]">
            Free scoring is at capacity
          </div>
          <div className="text-xs leading-[1.5] text-ink-soft">
            Free checks are shared across everyone, and they're used up for now. Here are two ways to keep going.
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Path 1 — bring your own key (actionable, equal weight) */}
          <button
            type="button"
            onClick={onUseOwnKey}
            className="flex flex-col rounded-[11px] border border-line bg-white p-3 text-left hover:border-brand focus-visible:outline-2 focus-visible:outline-brand"
          >
            <span className="mb-1 text-[12.5px] font-semibold text-ink">Use your own key</span>
            <span className="text-[11px] leading-[1.4] text-ink-soft">
              Scores go straight from your browser to your AI provider — unlimited, and nothing touches our server.
            </span>
            <span className="mt-2 text-[11px] font-semibold text-brand">Open Settings →</span>
          </button>

          {/* Path 2 — Pro, coming soon (equal weight, informational) */}
          <div className="flex flex-col rounded-[11px] border border-dashed border-lavender-deep bg-lavender p-3">
            <span className="mb-1 flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
              Pro
              <span className="rounded-full bg-lavender-deep px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.06em] text-brand">
                Soon
              </span>
            </span>
            <span className="text-[11px] leading-[1.4] text-ink-soft">
              More checks, no setup. We'll let you know when it's ready.
            </span>
          </div>
        </div>
      </div>

      <PanelFooter
        hasUserKey={false}
        left={
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-[5px] rounded text-[12.5px] font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand"
          >
            ← Back
          </button>
        }
      />
    </>
  );
}
