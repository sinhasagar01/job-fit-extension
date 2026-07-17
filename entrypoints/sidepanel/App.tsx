import { useCallback, useEffect, useState } from 'react';
import BrandBar from '../../components/panel/BrandBar';
import NeedsResume from './views/NeedsResume';
import Ready from './views/Ready';
import Results from './views/Results';
import Skeleton from './views/Skeleton';
import { extractJd } from '../../utils/extractJd';
import { mockScoringClient } from '../../utils/mockScoringClient';
import { createRealScoringClient } from '../../utils/realScoringClient';
import { createOpenAICompatClient } from '../../utils/openaiCompatScoringClient';
import type { FitResult } from '../../utils/scorer';
import { runCachedFit } from '../../utils/runScoredFit';
import { getRemainingChecks, decrementCheck } from '../../utils/usageCounter';
import type { Jd } from './types';

type PanelState = 'loading' | 'needs-resume' | 'ready' | 'showing-results';

function mergeProfileText(resumeText: string, linkedInText: string): string {
  return [resumeText, linkedInText].filter(Boolean).join('\n\n');
}

export default function App() {
  const [state, setState] = useState<PanelState>('loading');
  const [resumeFileName, setResumeFileName] = useState('');
  const [linkedInFileName, setLinkedInFileName] = useState('');
  const [jd, setJd] = useState<Jd | null>(null);
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

  // Read the job from the active tab. Runs in both pre-score states so the
  // "found job" card can lead the needs-resume view too.
  const runJdExtraction = useCallback(async () => {
    setJdLoading(true);
    setJd(null);
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('no tab');
      const results = await browser.scripting.executeScript({ target: { tabId: tab.id }, func: extractJd });
      const r = results[0]?.result ?? null;
      let hostname: string | null = null;
      try {
        if (tab.url) hostname = new URL(tab.url).hostname.replace(/^www\./, '');
      } catch {
        hostname = null;
      }
      setJd(r ? { ...r, hostname } : null);
    } catch {
      setJd(null);
    } finally {
      setJdLoading(false);
    }
  }, []);

  useEffect(() => {
    if (state === 'needs-resume' || state === 'ready') runJdExtraction();
  }, [state, runJdExtraction]);

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

  async function handleFit() {
    const { profileText = '', fitProvider, fitProviderModel, fitProviderApiKey, geminiApiKey } =
      await browser.storage.local.get(['profileText', 'fitProvider', 'fitProviderModel', 'fitProviderApiKey', 'geminiApiKey']);
    const jdText = jd?.text ?? pastedJd;
    const title = jd?.title ?? null;
    const company = jd?.company ?? null;
    setFitContext({ title, company });
    setScoring(true);
    setScoreError(null);
    const apiKey = fitProviderApiKey as string | undefined;
    const provider = fitProvider as string | undefined;
    const model = (fitProviderModel as string | undefined) || 'llama-3.3-70b-versatile';
    const getClient = () =>
      apiKey && provider === 'groq'
        ? createOpenAICompatClient({ baseUrl: 'https://api.groq.com/openai/v1', model, apiKey })
        : apiKey && provider === 'gemini'
          ? createRealScoringClient(apiKey)
          : geminiApiKey
            ? createRealScoringClient(geminiApiKey as string)
            : mockScoringClient;
    try {
      const { result, remaining } = await runCachedFit(getClient, profileText as string, jdText, { title, company }, decrementCheck);
      setChecksRemaining(remaining);
      setFitResult(result);
      setState('showing-results');
    } catch (err) {
      setScoreError(err instanceof Error ? err.message : 'Scoring failed. Please try again.');
    } finally {
      setScoring(false);
    }
  }

  const showChecks = state !== 'loading' && state !== 'needs-resume';

  return (
    <div className="flex h-screen flex-col bg-paper text-ink">
      <BrandBar
        checksRemaining={showChecks ? checksRemaining : null}
        onSettings={() => browser.runtime.openOptionsPage()}
      />
      <div className="flex min-h-0 flex-1 flex-col">
        {scoring ? (
          <Skeleton jd={jd} label="Scoring your fit…" />
        ) : state === 'loading' ? (
          <Skeleton jd={null} label="Loading…" />
        ) : state === 'needs-resume' ? (
          <NeedsResume
            jd={jd}
            jdLoading={jdLoading}
            onDone={handleResumeDone}
            linkedInFileName={linkedInFileName}
            onLinkedInDone={handleLinkedInDone}
            onLinkedInRemove={handleLinkedInRemove}
          />
        ) : state === 'ready' ? (
          <Ready
            fileName={resumeFileName || 'your-resume.pdf'}
            onDone={handleFit}
            onRemove={handleRemove}
            linkedInFileName={linkedInFileName}
            onLinkedInDone={handleLinkedInDone}
            onLinkedInRemove={handleLinkedInRemove}
            jd={jd}
            jdLoading={jdLoading}
            onRetryJd={runJdExtraction}
            pastedJd={pastedJd}
            onJdPaste={setPastedJd}
            scoring={scoring}
            scoreError={scoreError}
            checksRemaining={checksRemaining}
          />
        ) : state === 'showing-results' && fitResult ? (
          <Results
            result={fitResult}
            title={fitContext?.title ?? null}
            company={fitContext?.company ?? null}
            onBack={() => setState('ready')}
          />
        ) : null}
      </div>
    </div>
  );
}
