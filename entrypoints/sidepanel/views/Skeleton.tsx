import FoundJobCard from '../../../components/panel/FoundJobCard';
import PanelFooter from '../../../components/panel/PanelFooter';
import type { Jd } from '../types';

/** Shown while scoring (and on initial load): the found job stays visible and a
 *  skeleton stands in for the verdict card — never a blank panel. */
export default function Skeleton({ jd, label, hasUserKey = false }: { jd: Jd | null; label: string; hasUserKey?: boolean }) {
  return (
    <>
      <div className="panel-scroll min-h-0 flex-1 overflow-y-auto">
        {jd ? (
          <FoundJobCard title={jd.title} company={jd.company} snippet={jd.text} hostname={jd.hostname} />
        ) : (
          <div className="m-4 h-[92px] animate-pulse rounded-[11px] border border-line bg-white" />
        )}
        <div className="px-4">
          <div className="rounded-xl border border-line bg-white p-4" aria-live="polite" aria-busy="true">
            <div className="mb-[13px] flex items-center gap-[14px]">
              <div className="h-[62px] w-[62px] shrink-0 animate-pulse rounded-full bg-lavender" />
              <div className="flex-1">
                <div className="mb-2 h-3.5 w-2/3 animate-pulse rounded bg-lavender" />
                <div className="h-3 w-full animate-pulse rounded bg-lavender-deep/60" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-[52px] flex-1 animate-pulse rounded-lg bg-lavender" />
              <div className="h-[52px] flex-1 animate-pulse rounded-lg bg-lavender" />
            </div>
            <div className="mt-3 text-center text-[11px] text-ink-faint">{label}</div>
          </div>
        </div>
      </div>
      <PanelFooter hasUserKey={hasUserKey} />
    </>
  );
}
