import { useEffect, useState } from 'react';
import NeedsResume from './views/NeedsResume';
import Ready from './views/Ready';
import ShowingResults from './views/ShowingResults';

type PopupState = 'loading' | 'needs-resume' | 'ready' | 'showing-results';

const DEV_STATES: Exclude<PopupState, 'loading'>[] = ['needs-resume', 'ready', 'showing-results'];

export default function App() {
  const [state, setState] = useState<PopupState>('loading');
  const [resumeFileName, setResumeFileName] = useState('');

  useEffect(() => {
    browser.storage.local.get(['resumeText', 'resumeFileName']).then((result) => {
      if (result.resumeText) {
        setResumeFileName((result.resumeFileName as string) ?? '');
        setState('ready');
      } else {
        setState('needs-resume');
      }
    });
  }, []);

  function handleResumeDone(fileName: string) {
    setResumeFileName(fileName);
    setState('ready');
  }

  function handleRemove() {
    browser.storage.local.remove(['resumeText', 'resumeFileName']).then(() => {
      setResumeFileName('');
      setState('needs-resume');
    });
  }

  if (state === 'loading') {
    return <div className="w-95 min-h-120 bg-white" />;
  }

  return (
    <div className="w-95 min-h-120 bg-white flex flex-col">
      {/* Dev-only state switcher */}
      <div className="flex gap-1 px-2 py-1.5 bg-amber-50 border-b border-amber-200">
        <span className="text-[10px] text-amber-600 font-medium self-center mr-1">DEV</span>
        {DEV_STATES.map((s) => (
          <button
            key={s}
            onClick={() => setState(s)}
            className={`rounded px-2 py-0.5 text-[10px] font-mono transition-colors ${
              state === s
                ? 'bg-amber-400 text-white'
                : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="px-6 pt-4 pb-2">
        <h1 className="text-lg font-bold text-gray-900">JobFit</h1>
        <p className="text-xs text-gray-400">Am I a good fit for this role?</p>
      </div>

      {/* View */}
      <div className="flex flex-col flex-1">
        {state === 'needs-resume' && <NeedsResume onDone={handleResumeDone} />}
        {state === 'ready' && (
          <Ready
            fileName={resumeFileName || 'your-resume.pdf'}
            onDone={() => setState('showing-results')}
            onRemove={handleRemove}
          />
        )}
        {state === 'showing-results' && <ShowingResults onBack={() => setState('ready')} />}
      </div>
    </div>
  );
}
