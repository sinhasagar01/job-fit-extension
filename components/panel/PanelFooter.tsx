import type { ReactNode } from 'react';

/** Pinned footer. `left` is optional (e.g. a step label or a "Check another
 *  job" action); the right side is always the privacy indicator.
 *
 *  The indicator is conditional on how the user scores: with their own key,
 *  scoring goes straight to their provider and their résumé stays on their
 *  device ("On your device"); on the free tier it passes through JobFit's
 *  server, which keeps none of it ("Processed, not stored"). Defaults to the
 *  free-tier wording since a keyless install is the default. */
export default function PanelFooter({ left, hasUserKey = false }: { left?: ReactNode; hasUserKey?: boolean }) {
  return (
    <div className="flex items-center justify-between border-t border-line bg-white px-4 py-2.5 shrink-0">
      <span>{left}</span>
      <span className="inline-flex items-center gap-[5px] text-[11px] text-ink-faint">
        <span className="w-[5px] h-[5px] rounded-full bg-good" />
        {hasUserKey ? 'On your device' : 'Processed, not stored'}
      </span>
    </div>
  );
}
