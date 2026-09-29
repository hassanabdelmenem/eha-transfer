import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('../../lib/firebase', () => ({ firebaseTarget: 'production' }));
const { StagingRibbon } = await import('./StagingRibbon');

describe('StagingRibbon', () => {
  it('says so on staging, so a preview is never mistaken for the real system', () => {
    render(<StagingRibbon target="staging" />);
    expect(screen.getByRole('note')).toHaveTextContent('STAGING · test data only');
  });

  it('renders nothing on production', () => {
    const { container } = render(<StagingRibbon />);
    expect(container).toBeEmptyDOMElement();
  });
});
