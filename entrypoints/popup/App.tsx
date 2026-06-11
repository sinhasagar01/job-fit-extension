import { useEffect, useState } from 'react';
import NeedsResume from './views/NeedsResume';
import Ready from './views/Ready';
import ShowingResults from './views/ShowingResults';

type PopupState = 'loading' | 'needs-resume' | 'ready' | 'showing-results';

const DEV_STATES: Exclude<PopupState, 'loading'>[] = ['needs-resume', 'ready', 'showing-results'];

function mergeProfileText(resumeText: string, linkedInText: string): string {
  return linkedInText
    ? `${resumeText}\n\n--- LinkedIn Profile ---\n\n${linkedInText}`
    : resumeText;
}

export default function App() {
  const [state, setState] = useState<PopupState>('loading');
  const [resumeFileName, setResumeFileName] = useState('');
  const [linkedInFileName, setLinkedInFileName] = useState('');

  useEffect(() => {
    browser.storage.local
      .get(['resumeText', 'resumeFileName', 'linkedInFileName'])
      .then((result) => {
        if (result.resumeText) {
          setResumeFileName((result.resumeFileName as string) ?? '');
          setLinkedInFileName((result.linkedInFileName as string) ?? '');
          setState('ready');
        } else {
          setState('needs-resume');
        }
      })
      .catch(() => setState('needs-resume'));
  }, []);

  async function handleResumeDone(fileName: string) {
    const { resumeText = '', linkedInText = '' } = await browser.storage.local.get(['resumeText', 'linkedInText']);
    await browser.storage.local.set({ profileText: mergeProfileText(resumeText as string, linkedInText as string) });
    setResumeFileName(fileName);
    setState('ready');
  }

  async function handleRemove() {
    await browser.storage.local.remove(['resumeText', 'resumeFileName', 'linkedInText', 'linkedInFileName', 'profileText']);
    setResumeFileName('');
    setLinkedInFileName('');
    setState('needs-resume');
  }

  async function handleLinkedInDone(fileName: string, linkedInText: string) {
    const { resumeText = '' } = await browser.storage.local.get(['resumeText']);
    const profileText = mergeProfileText(resumeText as string, linkedInText);
    await browser.storage.local.set({ linkedInText, linkedInFileName: fileName, profileText });
    setLinkedInFileName(fileName);
  }

  async function handleLinkedInRemove() {
    const { resumeText = '' } = await browser.storage.local.get(['resumeText']);
    await browser.storage.local.remove(['linkedInText', 'linkedInFileName']);
    await browser.storage.local.set({ profileText: resumeText as string });
    setLinkedInFileName('');
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
        {state === 'needs-resume' && (
          <NeedsResume
            onDone={handleResumeDone}
            linkedInFileName={linkedInFileName}
            onLinkedInDone={handleLinkedInDone}
            onLinkedInRemove={handleLinkedInRemove}
          />
        )}
        {state === 'ready' && (
          <Ready
            fileName={resumeFileName || 'your-resume.pdf'}
            onDone={() => setState('showing-results')}
            onRemove={handleRemove}
            linkedInFileName={linkedInFileName}
            onLinkedInDone={handleLinkedInDone}
            onLinkedInRemove={handleLinkedInRemove}
          />
        )}
        {state === 'showing-results' && <ShowingResults onBack={() => setState('ready')} />}
      </div>
    </div>
  );
}
