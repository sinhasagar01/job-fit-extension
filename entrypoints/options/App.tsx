import { useEffect, useState } from 'react';

export default function OptionsApp() {
  const [keyInput, setKeyInput] = useState('');
  const [keySet, setKeySet] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    browser.storage.local.get(['geminiApiKey']).then((result) => {
      setKeySet(!!result.geminiApiKey);
    });
  }, []);

  async function handleSave() {
    const trimmed = keyInput.trim();
    if (!trimmed) return;
    await browser.storage.local.set({ geminiApiKey: trimmed });
    setKeyInput('');
    setKeySet(true);
    setSavedMsg('Key saved.');
    setTimeout(() => setSavedMsg(''), 2500);
  }

  async function handleClear() {
    await browser.storage.local.remove(['geminiApiKey']);
    setKeySet(false);
    setKeyInput('');
    setSavedMsg('Key removed.');
    setTimeout(() => setSavedMsg(''), 2500);
  }

  function handleGetKey() {
    browser.tabs.create({ url: 'https://aistudio.google.com/apikey' });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <h1 className="text-xl font-bold text-gray-900 mb-1">JobFit Settings</h1>
        <p className="text-sm text-gray-500 mb-8">Configure your AI scoring key.</p>

        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">Gemini API Key</label>
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
              placeholder={keySet ? '••••••••  (paste to replace)' : 'Paste your Gemini API key'}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!keyInput.trim()}
              className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Save Key
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
            directly to the Gemini API.{' '}
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
