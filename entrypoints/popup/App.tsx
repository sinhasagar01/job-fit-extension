import { useEffect, useState } from 'react';
import NeedsResume from './views/NeedsResume';
import Ready from './views/Ready';
import ShowingResults from './views/ShowingResults';
import { extractJd } from '../../utils/extractJd';
import { mockScoringClient } from '../../utils/mockScoringClient';
import { createRealScoringClient } from '../../utils/realScoringClient';
import { createOpenAICompatClient } from '../../utils/openaiCompatScoringClient';
import type { FitResult } from '../../utils/scorer';
import { runCachedFit } from '../../utils/runScoredFit';
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
    // Lazy: only constructed on a cache miss (runCachedFit skips it on a hit).
    const getClient = () =>
      apiKey && provider === 'groq'
        ? createOpenAICompatClient({ baseUrl: 'https://api.groq.com/openai/v1', model, apiKey })
        : apiKey && provider === 'gemini'
          ? createRealScoringClient(apiKey)
          : geminiApiKey
            ? createRealScoringClient(geminiApiKey as string)
            : mockScoringClient;
    try {
      const { result, remaining } = await runCachedFit(
        getClient,
        profileText as string,
        jdText,
        { title, company },
        decrementCheck
      );
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
    return <div className="popup-root w-95 min-h-120" />;
  }

  return (
    <div className="popup-root w-95 min-h-120 flex flex-col">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-indigo-50/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', boxShadow: '0 2px 8px rgba(99,102,241,0.35)' }}
            >
              <svg className="w-[18px] h-[18px] text-white" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
                <path d="M9 2L4 9h4.5L7 16l7-9H9.5L11 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-[15px] font-bold text-gray-900 leading-tight tracking-tight">JobFit</h1>
              <p className="text-[11px] text-gray-400 leading-tight mt-0.5">AI-powered resume scoring for any job</p>
            </div>
          </div>
          <button
            onClick={() => browser.runtime.openOptionsPage()}
            title="Settings"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 0 1-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 0 1 .947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 0 1 2.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 0 1 2.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 0 1 .947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 0 1-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 0 1-2.287-.947ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        {state !== 'showing-results' && (
          <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
            {(['Resume Analysis', 'Keyword Coverage', 'Skill Gap Plan'] as const).map((label) => (
              <span
                key={label}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-indigo-600 bg-indigo-50 ring-1 ring-indigo-100"
              >
                <svg className="w-2.5 h-2.5 text-indigo-400" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
                  <path d="M8.53 2.22a.75.75 0 0 0-1.06 0L4 5.69 2.53 4.22a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l4-4a.75.75 0 0 0 0-1.06Z" />
                </svg>
                {label}
              </span>
            ))}
          </div>
        )}
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
