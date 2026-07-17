import { useEffect, useMemo, useState } from 'react';
import {
  clearResultCache,
  deleteCachedResult,
  listCachedResults,
  type HistoryEntry,
} from '../../utils/resultCache';
import { scoreBand, type ScoreBand } from '../../utils/scoreBand';
import { relativeTime } from '../../utils/relativeTime';
import ScoreChip from '../../components/tracker/ScoreChip';
import Sparkline from '../../components/tracker/Sparkline';
import RowDetail from '../../components/tracker/RowDetail';

type Filter = 'all' | ScoreBand;

const GRID = 'grid grid-cols-[70px_1.7fr_1fr_190px_96px_62px] items-center gap-3.5';

function Logo() {
  return (
    <span className="grid h-[26px] w-[26px] place-items-center rounded-[7px] bg-gradient-to-br from-brand-bright to-brand-deep">
      <svg width="14" height="14" viewBox="0 0 18 18" fill="white" aria-hidden="true"><path d="M9 2L4 9h4.5L7 16l7-9H9.5L11 2z" /></svg>
    </span>
  );
}

function TopBar({ onClear }: { onClear?: () => void }) {
  return (
    <div className="flex items-center gap-[11px] border-b border-line bg-white px-[22px] py-3">
      <Logo />
      <span className="text-sm font-bold">JobFit</span>
      <span className="ml-auto flex items-center gap-3.5">
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="border-none bg-transparent text-[12.5px] font-medium text-ink-soft hover:text-bad focus-visible:outline-2 focus-visible:outline-brand"
          >
            Clear history
          </button>
        )}
        <span className="inline-flex items-center gap-[5px] text-[11px] text-ink-faint">
          <span className="h-[5px] w-[5px] rounded-full bg-good" /> Stored on this device
        </span>
      </span>
    </div>
  );
}

export default function App() {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [openKey, setOpenKey] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get('key')
  );

  useEffect(() => {
    listCachedResults().then(setEntries);
  }, []);

  const bandCounts = useMemo(() => {
    const c = { green: 0, amber: 0, red: 0 };
    for (const e of entries ?? []) c[scoreBand(e.result.overall)]++;
    return c;
  }, [entries]);

  const stats = useMemo(() => {
    const list = entries ?? [];
    const mean = list.length ? list.reduce((s, e) => s + e.result.overall, 0) / list.length : 0;
    return { count: list.length, strong: bandCounts.green, mean };
  }, [entries, bandCounts]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (entries ?? []).filter((e) => {
      if (filter !== 'all' && scoreBand(e.result.overall) !== filter) return false;
      if (!q) return true;
      return `${e.title ?? ''} ${e.company ?? ''}`.toLowerCase().includes(q);
    });
  }, [entries, filter, query]);

  async function handleDelete(key: string) {
    await deleteCachedResult(key);
    setEntries((prev) => (prev ?? []).filter((e) => e.key !== key));
    if (openKey === key) setOpenKey(null);
  }

  async function handleClear() {
    const ok = window.confirm(
      "Clear all checks? This can't be undone. Re-checking a job afterward will make a fresh API call and use one of your daily checks."
    );
    if (!ok) return;
    await clearResultCache();
    setEntries([]);
  }

  const hasData = (entries?.length ?? 0) > 0;

  return (
    <div className="mx-auto my-10 max-w-[1320px] px-6">
      <div className="overflow-hidden rounded-xl border border-[#CFCEE0] bg-paper shadow-[0_20px_50px_rgba(30,27,75,0.16)]">
        <TopBar onClear={hasData ? handleClear : undefined} />

        {entries === null ? (
          <div className="p-20 text-center text-sm text-ink-faint">Loading your checks…</div>
        ) : !hasData ? (
          <Empty />
        ) : (
          <div className="px-7 pb-7 pt-[22px]">
            {/* header + stats */}
            <div className="mb-5 flex items-end justify-between gap-6">
              <div>
                <h2 className="mb-1 font-display text-[24px] font-semibold -tracking-[0.02em]">Every job you've checked</h2>
                <p className="text-[13px] text-ink-soft">{stats.count} {stats.count === 1 ? 'check' : 'checks'} kept on this device.</p>
              </div>
              <div className="flex shrink-0 gap-2.5">
                <Stat n={String(stats.count)} k="Checked" />
                <Stat n={String(stats.strong)} k="Strong" color="var(--color-good)" />
                <Stat n={stats.mean.toFixed(1)} k="Avg fit" />
              </div>
            </div>

            {/* filters + search */}
            <div className="mb-3.5 flex items-center gap-[7px]">
              <Chip label={`All · ${stats.count}`} on={filter === 'all'} onClick={() => setFilter('all')} />
              <Chip label={`Strong · ${bandCounts.green}`} on={filter === 'green'} onClick={() => setFilter('green')} />
              <Chip label={`Partial · ${bandCounts.amber}`} on={filter === 'amber'} onClick={() => setFilter('amber')} />
              <Chip label={`Weak · ${bandCounts.red}`} on={filter === 'red'} onClick={() => setFilter('red')} />
              <div className="ml-auto flex min-w-[210px] items-center gap-[7px] rounded-full border border-line bg-white px-3.5 py-1.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-faint)" strokeWidth="2.5" aria-hidden="true"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search roles or companies"
                  aria-label="Search roles or companies"
                  className="w-full border-none bg-transparent text-xs text-ink placeholder:text-ink-faint focus:outline-none"
                />
              </div>
            </div>

            {/* table */}
            <div className="overflow-hidden rounded-xl border border-line bg-white">
              <div className={`${GRID} border-b border-line bg-[#FAFAFD] px-4 py-[9px] text-[9.5px] font-bold uppercase tracking-[0.07em] text-ink-faint`}>
                <span>Fit</span><span>Role</span><span>Company</span><span>Breakdown</span><span>Checked</span><span />
              </div>
              {visible.length === 0 ? (
                <div className="px-4 py-10 text-center text-[13px] text-ink-faint">No checks match this filter.</div>
              ) : (
                visible.map((e) => (
                  <Row key={e.key} entry={e} open={openKey === e.key} onToggle={() => setOpenKey(openKey === e.key ? null : e.key)} onDelete={() => handleDelete(e.key)} />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ n, k, color }: { n: string; k: string; color?: string }) {
  return (
    <div className="min-w-[74px] rounded-[10px] border border-line bg-white px-[15px] py-[9px] text-center">
      <div className="font-display text-[19px] font-bold leading-none" style={color ? { color } : undefined}>{n}</div>
      <div className="mt-1 text-[9.5px] font-semibold uppercase tracking-[0.05em] text-ink-faint">{k}</div>
    </div>
  );
}

function Chip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-full border px-[13px] py-1.5 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-brand ${
        on ? 'border-brand bg-brand text-white' : 'border-line bg-white text-ink-soft hover:border-lavender-deep'
      }`}
    >
      {label}
    </button>
  );
}

function Row({ entry, open, onToggle, onDelete }: { entry: HistoryEntry; open: boolean; onToggle: () => void; onDelete: () => void }) {
  const { result, title, company, ts, key } = entry;
  return (
    <div className={`border-b border-[#F2F2F8] last:border-b-0 ${open ? 'bg-lavender' : ''}`}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-controls={`detail-${key}`}
        onClick={onToggle}
        onKeyDown={(ev) => {
          if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onToggle(); }
        }}
        className={`${GRID} cursor-pointer px-4 py-3 hover:bg-lavender focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand`}
      >
        <span><ScoreChip score={result.overall} /></span>
        <span className="text-[12.5px] font-semibold leading-[1.3]">{title ?? 'Untitled job'}</span>
        <span className="text-xs text-ink-soft">{company ?? '—'}</span>
        <Sparkline dimensions={result.dimensions} />
        <span className="text-[11.5px] text-ink-faint">{relativeTime(ts)}</span>
        <span className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={(ev) => { ev.stopPropagation(); onDelete(); }}
            aria-label={`Delete check for ${title ?? 'this job'}`}
            className="flex text-[#D6D5E4] hover:text-bad focus-visible:outline-2 focus-visible:outline-brand"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
          </button>
          <span className={`flex text-[#C6C5DA] transition-transform ${open ? 'rotate-90 text-brand' : ''}`} aria-hidden="true">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </span>
        </span>
      </div>
      {open && (
        <div id={`detail-${key}`}>
          <RowDetail result={result} />
        </div>
      )}
    </div>
  );
}

function Empty() {
  return (
    <div className="px-7 py-20 text-center">
      <div className="mx-auto mb-[18px] grid h-14 w-14 place-items-center rounded-2xl bg-lavender text-brand">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 17H7A5 5 0 017 7h2M15 7h2a5 5 0 010 10h-2M8 12h8" /></svg>
      </div>
      <h2 className="mb-2 font-display text-[22px] font-semibold -tracking-[0.02em]">Nothing checked yet</h2>
      <p className="mx-auto mb-[22px] max-w-[400px] text-sm leading-[1.6] text-ink-soft">
        Every job you score shows up here — the fit, the breakdown, and the plan, kept on this device so you can come back to it.
      </p>
      <div className="inline-flex items-center gap-[9px] rounded-full border border-line bg-white px-[18px] py-[9px] text-[12.5px] text-ink-soft">
        <span className="grid h-5 w-5 place-items-center rounded-md bg-gradient-to-br from-brand-bright to-brand-deep">
          <svg width="11" height="11" viewBox="0 0 18 18" fill="white" aria-hidden="true"><path d="M9 2L4 9h4.5L7 16l7-9H9.5L11 2z" /></svg>
        </span>
        Open a job posting and click the JobFit icon to score your first one
      </div>
    </div>
  );
}
