import { useEffect, useState } from 'react';
import NeedsResume from './views/NeedsResume';
import Ready from './views/Ready';
import ShowingResults from './views/ShowingResults';
import { extractJd } from '../../utils/extractJd';
import { mockScoringClient } from '../../utils/mockScoringClient';
import { createRealScoringClient } from '../../utils/realScoringClient';
import { createOpenAICompatClient } from '../../utils/openaiCompatScoringClient';
import type { FitResult } from '../../utils/scorer';
import { getRemainingChecks, decrementCheck } from '../../utils/usageCounter';

type PopupState = 'loading' | 'needs-resume' | 'ready' | 'showing-results';

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
    const {
      profileText = '',
      fitProvider,
      fitProviderModel,
      fitProviderApiKey,
      geminiApiKey,
    } = await browser.storage.local.get(['profileText', 'fitProvider', 'fitProviderModel', 'fitProviderApiKey', 'geminiApiKey']);
    const jdText = jd?.text ?? pastedJd;
    const title = jd?.title ?? null;
    const company = jd?.company ?? null;
    setFitContext({ title, company });
    setScoring(true);
    setScoreError(null);
    const apiKey = fitProviderApiKey as string | undefined;
    const provider = fitProvider as string | undefined;
    const model = (fitProviderModel as string | undefined) || 'llama-3.3-70b-versatile';
    const client =
      apiKey && provider === 'groq'
        ? createOpenAICompatClient({ baseUrl: 'https://api.groq.com/openai/v1', model, apiKey })
        : apiKey && provider === 'gemini'
          ? createRealScoringClient(apiKey)
          : geminiApiKey
            ? createRealScoringClient(geminiApiKey as string)
            : mockScoringClient;
    try {
      const result = await client.scoreFit(profileText as string, jdText, { title, company });
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
      {/* Header */}
      <div className="px-6 pt-4 pb-2 flex items-start justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">JobFit</h1>
          <p className="text-xs text-gray-400">Am I a good fit for this role?</p>
        </div>
        <button
          onClick={() => browser.runtime.openOptionsPage()}
          title="Settings"
          className="mt-0.5 text-gray-400 hover:text-gray-600 transition-colors text-base leading-none"
        >
          ⚙
        </button>
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
