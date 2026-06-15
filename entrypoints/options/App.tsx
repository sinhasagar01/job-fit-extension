import { useEffect, useState } from 'react';

type Provider = 'gemini' | 'groq';

const PROVIDER_DEFAULTS: Record<Provider, { model: string; keyLabel: string; keyUrl: string }> = {
  gemini: {
    model: 'gemini-2.5-flash',
    keyLabel: 'Gemini API Key',
    keyUrl: 'https://aistudio.google.com/apikey',
  },
  groq: {
    model: 'llama-3.3-70b-versatile',
    keyLabel: 'Groq API Key',
    keyUrl: 'https://console.groq.com/keys',
  },
};

export default function OptionsApp() {
  const [provider, setProvider] = useState<Provider>('gemini');
  const [model, setModel] = useState(PROVIDER_DEFAULTS.gemini.model);
  const [keyInput, setKeyInput] = useState('');
  const [keySet, setKeySet] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    browser.storage.local
      .get(['fitProvider', 'fitProviderModel', 'fitProviderApiKey', 'geminiApiKey'])
      .then((result) => {
        // migrate legacy geminiApiKey
        if (!result.fitProvider && result.geminiApiKey) {
          browser.storage.local.set({
            fitProvider: 'gemini',
            fitProviderModel: PROVIDER_DEFAULTS.gemini.model,
            fitProviderApiKey: result.geminiApiKey,
          });
          browser.storage.local.remove(['geminiApiKey']);
          setProvider('gemini');
          setModel(PROVIDER_DEFAULTS.gemini.model);
          setKeySet(true);
          return;
        }
        if (result.fitProvider) {
          const p = result.fitProvider as Provider;
          setProvider(p);
          setModel((result.fitProviderModel as string) || PROVIDER_DEFAULTS[p].model);
          setKeySet(!!result.fitProviderApiKey);
        }
      });
  }, []);

  function handleProviderChange(p: Provider) {
    setProvider(p);
    setModel(PROVIDER_DEFAULTS[p].model);
  }

  async function handleSave() {
    const trimmed = keyInput.trim();
    if (!trimmed) return;
    await browser.storage.local.set({
      fitProvider: provider,
      fitProviderModel: model.trim() || PROVIDER_DEFAULTS[provider].model,
      fitProviderApiKey: trimmed,
    });
    setKeyInput('');
    setKeySet(true);
    setSavedMsg('Settings saved.');
    setTimeout(() => setSavedMsg(''), 2500);
  }

  async function handleClear() {
    await browser.storage.local.remove(['fitProvider', 'fitProviderModel', 'fitProviderApiKey', 'geminiApiKey']);
    setKeySet(false);
    setKeyInput('');
    setSavedMsg('Key removed.');
    setTimeout(() => setSavedMsg(''), 2500);
  }

  function handleGetKey() {
    browser.tabs.create({ url: PROVIDER_DEFAULTS[provider].keyUrl });
  }

  const { keyLabel, keyUrl } = PROVIDER_DEFAULTS[provider];

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <h1 className="text-xl font-bold text-gray-900 mb-1">JobFit Settings</h1>
        <p className="text-sm text-gray-500 mb-8">Configure your AI scoring provider.</p>

        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          {/* Provider */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Provider</label>
            <select
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value as Provider)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="gemini">Gemini</option>
              <option value="groq">Groq</option>
            </select>
          </div>

          {/* Model */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Model</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* API Key */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">{keyLabel}</label>
              {keySet ? (
                <span className="text-xs text-green-600 font-medium">✓ Key saved</span>
              ) : (
                <span className="text-xs text-gray-400">No key set</span>
              )}
            </div>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder={keySet ? '••••••••  (paste to replace)' : `Paste your ${keyLabel}`}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!keyInput.trim()}
              className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Save Settings
            </button>
            {keySet && (
              <button
                onClick={handleClear}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {savedMsg && (
            <p className="text-xs text-center text-green-600">{savedMsg}</p>
          )}

          <p className="text-xs text-gray-400 text-center pt-1">
            Your key is stored only in your browser and never transmitted anywhere except
            directly to the {provider === 'gemini' ? 'Gemini' : 'Groq'} API.{' '}
            <button
              onClick={handleGetKey}
              className="text-indigo-500 hover:underline"
            >
              Get a free key →
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
