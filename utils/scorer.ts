// FitResult + validateFitResult now live in ./shared/scoringContract so the
// hosted Worker can import the same contract without forking. Re-exported here
// so every existing `from './scorer'` import is unchanged. ScoringClient stays
// here — it's an extension/eval concept (the Worker doesn't implement it).
export type { FitResult } from './shared/scoringContract';
export { validateFitResult } from './shared/scoringContract';

import type { FitResult } from './shared/scoringContract';

export interface ScoringClient {
  scoreFit(
    profileText: string,
    jdText: string,
    meta?: { title?: string | null; company?: string | null }
  ): Promise<FitResult>;
}
