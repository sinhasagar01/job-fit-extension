import { useState } from 'react';
import NeedsResume from './views/NeedsResume';
import Ready from './views/Ready';
import ShowingResults from './views/ShowingResults';

type PopupState = 'needs-resume' | 'ready' | 'showing-results';

const DEV_STATES: PopupState[] = ['needs-resume', 'ready', 'showing-results'];

export default function App() {
  const [state, setState] = useState<PopupState>('needs-resume');

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
        {state === 'needs-resume' && <NeedsResume onDone={() => setState('ready')} />}
        {state === 'ready' && <Ready onDone={() => setState('showing-results')} />}
        {state === 'showing-results' && <ShowingResults onBack={() => setState('ready')} />}
      </div>
    </div>
  );
}
