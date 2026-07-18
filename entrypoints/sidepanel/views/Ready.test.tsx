import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Ready from './Ready';
import type { Jd } from '../types';

// LinkedInUploadSection imports utils/parsePdf → pdf.js, which references
// DOMMatrix at module load (absent in jsdom). It's orthogonal to the
// uncertain-detection gating under test, so stub it out. (vi.mock is hoisted
// above the imports by vitest.)
vi.mock('../../../components/LinkedInUploadSection', () => ({ default: () => null }));

afterEach(cleanup);

const uncertainJd: Jd = {
  title: 'Backend Engineer',
  company: 'Brightwave',
  text: 'We are looking for a backend engineer to own our services. '.repeat(6),
  hostname: 'brightwave.example',
  uncertain: true,
};

// Props Ready needs but this test doesn't exercise.
const noop = () => {};
const baseProps = {
  fileName: 'resume.pdf',
  onDone: noop,
  onRemove: noop,
  linkedInFileName: '',
  onLinkedInDone: noop,
  onLinkedInRemove: noop,
  jdLoading: false,
  jdError: null,
  stale: false,
  onRetryJd: noop,
  onPastChecks: noop,
  pastedJd: '',
  onJdPaste: noop,
  scoring: false,
  scoreError: null,
  checksRemaining: 5,
  hasUserKey: false,
};

/**
 * Mirrors App's contract: holds `scoreAnyway`, and "re-extract" resets it to
 * false while swapping in a fresh uncertain jd — exactly what runJdExtraction
 * does on a new page (setScoreAnyway(false); setJd(...)).
 */
function Harness({ initialJd = uncertainJd }: { initialJd?: Jd }) {
  const [jd, setJd] = useState<Jd>(initialJd);
  const [scoreAnyway, setScoreAnyway] = useState(false);
  const reExtract = () => {
    setScoreAnyway(false);
    setJd({ ...uncertainJd });
  };
  return (
    <>
      <button type="button" onClick={reExtract}>
        re-extract
      </button>
      <Ready {...baseProps} jd={jd} scoreAnyway={scoreAnyway} onScoreAnyway={setScoreAnyway} />
    </>
  );
}

const amIFit = () => screen.getByRole('button', { name: /am i fit/i });
const scoreAnywayBox = () => screen.getByRole('checkbox', { name: /score it anyway/i });

describe('Ready — uncertain detection gates the primary path', () => {
  it('surfaces the uncertain affordance, not a confident "job found" card', () => {
    render(<Harness />);
    expect(screen.getByText(/doesn't look like a job posting/i)).toBeInTheDocument();
    expect(screen.queryByText(/job found on this page/i)).not.toBeInTheDocument();
  });

  it('disables "Am I Fit?" on mount, enables it once the box is ticked', () => {
    render(<Harness />);
    expect(amIFit()).toBeDisabled();

    fireEvent.click(scoreAnywayBox());
    expect(amIFit()).toBeEnabled();
  });

  it('re-running extraction (new page) resets confirmation → disabled again', () => {
    render(<Harness />);
    fireEvent.click(scoreAnywayBox());
    expect(amIFit()).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: /re-extract/i }));
    expect(amIFit()).toBeDisabled();
    expect(scoreAnywayBox()).not.toBeChecked();
  });

  it('a confident detection needs no confirmation — enabled on mount', () => {
    render(<Harness initialJd={{ ...uncertainJd, uncertain: false }} />);
    expect(screen.getByText(/job found on this page/i)).toBeInTheDocument();
    expect(amIFit()).toBeEnabled();
  });
});
