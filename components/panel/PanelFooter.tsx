import type { ReactNode } from 'react';

/** Pinned footer. `left` is optional (e.g. a step label or a "Check another
 *  job" action); the right side is always the privacy indicator. The "Past
 *  checks" link is intentionally absent until history ships (Task 5.2). */
export default function PanelFooter({ left }: { left?: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-t border-line bg-white px-4 py-2.5 shrink-0">
      <span>{left}</span>
      <span className="inline-flex items-center gap-[5px] text-[11px] text-ink-faint">
        <span className="w-[5px] h-[5px] rounded-full bg-good" />
        On your device
      </span>
    </div>
  );
}
