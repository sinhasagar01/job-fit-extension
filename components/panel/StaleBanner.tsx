import type { ReactNode } from 'react';

/** Warn-accent banner shown when the panel's result/JD is for a page the user
 *  has navigated away from. `role="status"` so it's announced. */
export default function StaleBanner({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="m-4 mb-0 flex items-start gap-2.5 rounded-[11px] border border-[#FBE3C0] bg-warn-bg p-[11px_13px]"
    >
      <svg width="15" height="15" viewBox="0 0 20 20" fill="var(--color-warn)" aria-hidden="true" className="mt-px shrink-0">
        <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 12H9v-2h2v2zm0-3H9V6h2v5z" />
      </svg>
      <div className="text-[11.5px] leading-[1.45] text-ink-soft">{children}</div>
    </div>
  );
}
