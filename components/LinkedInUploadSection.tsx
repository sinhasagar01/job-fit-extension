import { useRef, useState } from 'react';
import { parsePdf } from '../utils/parsePdf';

interface Props {
  fileName: string;
  onDone: (fileName: string, text: string) => void;
  onRemove: () => void;
}

export default function LinkedInUploadSection({ fileName, onDone, onRemove }: Props) {
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

  if (fileName) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-gray-700">
        <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
        <span className="truncate flex-1 text-xs">{fileName}</span>
        <button
          onClick={onRemove}
          className="text-gray-400 hover:text-red-500 transition-colors shrink-0 ml-1"
          title="Remove LinkedIn PDF"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleFileChange}
        disabled={status === 'parsing'}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={status === 'parsing'}
        className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === 'parsing' ? 'Parsing LinkedIn PDF…' : '+ Add LinkedIn profile (optional)'}
      </button>
      {status === 'error' && (
        <p className="text-xs text-red-500">{errorMsg}</p>
      )}
    </div>
  );
}
