import { useRef, useState } from 'react';
import { parsePdf } from '../../../utils/parsePdf';
import LinkedInUploadSection from '../../../components/LinkedInUploadSection';
import FoundJobCard from '../../../components/panel/FoundJobCard';
import PanelFooter from '../../../components/panel/PanelFooter';
import type { Jd } from '../types';

interface Props {
  jd: Jd | null;
  jdLoading: boolean;
  onDone: (fileName: string) => void;
  linkedInFileName: string;
  onLinkedInDone: (fileName: string, text: string) => void;
  onLinkedInRemove: () => void;
}

const PRIVACY = [
  'The PDF is read in your browser. It is never uploaded to us.',
  "No account. Nothing stored on a server. There isn't one.",
  'Remove it any time and the text goes with it.',
];

export default function NeedsResume({ jd, jdLoading, onDone, linkedInFileName, onLinkedInDone, onLinkedInRemove }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'idle' | 'parsing' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus('parsing');
    setErrorMsg('');
    try {
      const text = await parsePdf(file);
      await browser.storage.local.set({ resumeText: text, resumeFileName: file.name });
      onDone(file.name);
    } catch {
      setStatus('error');
      setErrorMsg('Failed to parse PDF. Please try another file.');
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <>
      <div className="panel-scroll min-h-0 flex-1 overflow-y-auto">
        {jd ? (
          <FoundJobCard title={jd.title} company={jd.company} snippet={jd.text} hostname={jd.hostname} />
        ) : jdLoading ? (
          <div className="m-4 h-[92px] animate-pulse rounded-[11px] border border-line bg-white" />
        ) : null}

        <div className="px-4">
          <div className="mb-[7px] font-display text-[21px] font-semibold leading-[1.2] -tracking-[0.02em]">
            Now add your resume.
          </div>
          <div className="mb-4 text-[12.5px] leading-[1.5] text-ink-soft">
            Once. It's read on this device and reused for every job you check after this one.
          </div>

          <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} disabled={status === 'parsing'} />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={status === 'parsing'}
            className="mb-2.5 w-full rounded-xl border-[1.5px] border-dashed border-lavender-deep bg-white p-[22px_16px] text-center transition-colors hover:border-brand hover:bg-lavender focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-60"
          >
            <span className="mx-auto mb-2.5 grid h-[38px] w-[38px] place-items-center rounded-[11px] bg-lavender text-brand">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><polyline points="9 15 12 12 15 15" />
              </svg>
            </span>
            <span className="block text-[13.5px] font-semibold">{status === 'parsing' ? 'Parsing PDF…' : 'Choose a PDF'}</span>
            <span className="block text-[11.5px] text-ink-faint">or drop it here</span>
          </button>
          {status === 'error' && <p className="mb-2 text-xs text-bad">{errorMsg}</p>}

          <LinkedInUploadSection fileName={linkedInFileName} onDone={onLinkedInDone} onRemove={onLinkedInRemove} variant="opt" />
        </div>

        <div className="m-4 mt-[18px] rounded-[10px] border border-line bg-white p-[13px_14px]">
          <div className="mb-[9px] text-[10px] font-bold uppercase tracking-[0.09em] text-ink-faint">Before you upload</div>
          {PRIVACY.map((line) => (
            <div key={line} className="mb-[7px] flex gap-2 text-[11.5px] leading-[1.45] text-ink-soft last:mb-0">
              <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 shrink-0 text-good" aria-hidden="true"><path d="M7.6 13.6l-3.2-3.2L3 11.8l4.6 4.6L17 7l-1.4-1.4z" /></svg>
              <span>{line}</span>
            </div>
          ))}
        </div>
      </div>

      <PanelFooter left={<span className="text-[12.5px] text-ink-faint">Step 1 of 2</span>} />
    </>
  );
}
