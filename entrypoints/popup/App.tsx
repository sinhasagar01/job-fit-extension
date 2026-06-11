import { useEffect, useState } from 'react';
import NeedsResume from './views/NeedsResume';
import Ready from './views/Ready';
import ShowingResults from './views/ShowingResults';
import { extractJd } from '../../utils/extractJd';
import { mockScoringClient } from '../../utils/mockScoringClient';
import type { FitResult } from '../../utils/scorer';
import { getRemainingChecks, decrementCheck, exhaustChecks, resetChecks } from '../../utils/usageCounter';

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
  const [jd, setJd] = useState<{ title: string | null; company: string | null; text: string } | null>(null);
  const [jdLoading, setJdLoading] = useState(false);
  const [pastedJd, setPastedJd] = useState('');
  const [fitResult, setFitResult] = useState<FitResult | null>(null);
  const [scoring, setScoring] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [fitContext, setFitContext] = useState<{ title: string | null; company: string | null } | null>(null);
  const [checksRemaining, setChecksRemaining] = useState(5);

  useEffect(() => {
    Promise.all([
      browser.storage.local.get(['resumeText', 'resumeFileName', 'linkedInFileName']),
      getRemainingChecks(),
    ])
      .then(([result, remaining]) => {
        setChecksRemaining(remaining);
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

  useEffect(() => {
    if (state !== 'ready') return;
    setJdLoading(true);
    setJd(null);
    (async () => {
      try {
        const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) throw new Error('no tab');
        const results = await browser.scripting.executeScript({
          target: { tabId: tab.id },
          func: extractJd,
        });
        setJd(results[0]?.result ?? null);
      } catch {
        setJd(null);
      } finally {
        setJdLoading(false);
      }
    })();
  }, [state]);

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

  async function handleFit() {
    const { profileText = '' } = await browser.storage.local.get(['profileText']);
    const jdText = jd?.text ?? pastedJd;
    setFitContext({ title: jd?.title ?? null, company: jd?.company ?? null });
    setScoring(true);
    setScoreError(null);
    try {
      const result = await mockScoringClient.scoreFit(profileText as string, jdText);
      const remaining = await decrementCheck();
      setChecksRemaining(remaining);
      setFitResult(result);
      setState('showing-results');
    } catch (err) {
      setScoreError(err instanceof Error ? err.message : 'Scoring failed. Please try again.');
    } finally {
      setScoring(false);
    }
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
      <div className="flex flex-wrap gap-1 px-2 py-1.5 bg-amber-50 border-b border-amber-200">
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
        <span className="text-[10px] text-amber-400 self-center mx-0.5">|</span>
        <button
          onClick={async () => { await exhaustChecks(); setChecksRemaining(0); }}
          className="rounded px-2 py-0.5 text-[10px] font-mono bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
        >
          exhaust
        </button>
        <button
          onClick={async () => { await resetChecks(); setChecksRemaining(5); }}
          className="rounded px-2 py-0.5 text-[10px] font-mono bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
        >
          reset usage
        </button>
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
            onDone={handleFit}
            onRemove={handleRemove}
            linkedInFileName={linkedInFileName}
            onLinkedInDone={handleLinkedInDone}
            onLinkedInRemove={handleLinkedInRemove}
            jd={jd}
            jdLoading={jdLoading}
            pastedJd={pastedJd}
            onJdPaste={setPastedJd}
            scoring={scoring}
            scoreError={scoreError}
            checksRemaining={checksRemaining}
          />
        )}
        {state === 'showing-results' && fitResult && (
          <ShowingResults
            onBack={() => setState('ready')}
            result={fitResult}
            title={fitContext?.title ?? null}
            company={fitContext?.company ?? null}
          />
        )}
      </div>
    </div>
  );
}
