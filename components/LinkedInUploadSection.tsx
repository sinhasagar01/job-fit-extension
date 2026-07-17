import { useRef, useState } from 'react';
import { parsePdf } from '../utils/parsePdf';

interface Props {
  fileName: string;
  onDone: (fileName: string, text: string) => void;
  onRemove: () => void;
  /** 'opt' = large card (needs-resume); 'compact' = dashed link (ready). */
  variant?: 'opt' | 'compact';
}

export default function LinkedInUploadSection({ fileName, onDone, onRemove, variant = 'opt' }: Props) {
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
      setStatus('idle');
      onDone(file.name, text);
    } catch {
      setStatus('error');
      setErrorMsg('Failed to parse PDF. Please try another file.');
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  // Added: a merged-in file row.
  if (fileName) {
    return (
      <div className="mb-2 flex items-center gap-2.5 rounded-[10px] border border-line bg-[#FAFAFE] p-[11px_12px]">
        <span className="flex shrink-0">
          <svg width="15" height="15" viewBox="0 0 20 20" fill="var(--color-brand)" aria-hidden="true"><path d="M7.6 13.6l-3.2-3.2L3 11.8l4.6 4.6L17 7l-1.4-1.4z" /></svg>
        </span>
        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[12.5px] font-medium">
          {fileName}
          <span className="block text-[10.5px] font-normal text-ink-faint">LinkedIn · merged in</span>
        </span>
        <button type="button" onClick={onRemove} title="Remove LinkedIn PDF" aria-label="Remove LinkedIn PDF" className="flex shrink-0 text-[#C3C2D8] hover:text-bad focus-visible:outline-2 focus-visible:outline-brand rounded">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      </div>
    );
  }

  const linkedInIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14m-.5 15.5v-5.3a3.26 3.26 0 00-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 011.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 001.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 00-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
    </svg>
  );

  return (
    <>
      <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} disabled={status === 'parsing'} />
      {variant === 'opt' ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={status === 'parsing'}
          className="flex w-full items-center gap-2.5 rounded-[10px] border border-line bg-white p-[11px_13px] text-left transition-colors hover:border-lavender-deep hover:bg-lavender focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50"
        >
          <span className="flex shrink-0 text-brand">{linkedInIcon}</span>
          <span className="flex-1">
            <span className="block text-[12.5px] font-semibold leading-[1.3]">
              {status === 'parsing' ? 'Parsing LinkedIn PDF…' : 'Add your LinkedIn profile'}
            </span>
            <span className="mt-px block text-[11px] text-ink-faint">Export as PDF from your profile page</span>
          </span>
          <span className="shrink-0 rounded-full bg-lavender px-[7px] py-0.5 text-[9px] font-bold tracking-[0.05em] text-ink-faint">OPTIONAL</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={status === 'parsing'}
          className="flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-lavender-deep bg-transparent p-2.5 text-xs font-semibold text-brand transition-colors hover:border-brand hover:bg-lavender focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50"
        >
          {status === 'parsing' ? 'Parsing LinkedIn PDF…' : '+ Add LinkedIn profile'}
        </button>
      )}
      {status === 'error' && <p className="mt-1 text-xs text-bad">{errorMsg}</p>}
    </>
  );
}
