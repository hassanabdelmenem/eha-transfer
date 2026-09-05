import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  Skeleton, SkeletonGroup, SkeletonLine, SkeletonReferralCard,
  SkeletonReferralRow, SkeletonDetailBlock,
} from './Skeleton';

describe('Skeleton', () => {
  it('renders a decorative, aria-hidden block with a custom class merged in', () => {
    const { container } = render(<Skeleton className="h-10 w-10" data-testid="bar" />);
    const el = screen.getByTestId('bar');
    expect(el).toHaveAttribute('aria-hidden', 'true');
    expect(el.className).toMatch(/animate-pulse/);
    expect(el.className).toMatch(/h-10/);
    expect(container.firstChild).toBe(el);
  });
});

describe('SkeletonGroup', () => {
  it('exposes a single live-region status with a default label', () => {
    render(<SkeletonGroup><Skeleton /></SkeletonGroup>);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status).toHaveTextContent('Loading…');
  });

  it('accepts a custom label', () => {
    render(<SkeletonGroup label="Loading referrals…"><Skeleton /></SkeletonGroup>);
    expect(screen.getByRole('status')).toHaveTextContent('Loading referrals…');
  });
});

describe('SkeletonLine', () => {
  it('defaults to full width', () => {
    const { container } = render(<SkeletonLine />);
    expect(container.firstElementChild?.className).toMatch(/w-full/);
  });

  it('accepts a custom width', () => {
    const { container } = render(<SkeletonLine width="w-1/2" />);
    expect(container.firstElementChild?.className).toMatch(/w-1\/2/);
  });
});

describe('SkeletonReferralCard', () => {
  it('renders the mobile card layout with 5 placeholder bars', () => {
    const { container } = render(<SkeletonReferralCard />);
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(5);
  });
});

describe('SkeletonReferralRow', () => {
  it('renders 6 placeholder cells with varying widths', () => {
    const { container } = render(<table><tbody><SkeletonReferralRow /></tbody></table>);
    const cells = container.querySelectorAll('td');
    expect(cells).toHaveLength(6);
  });
});

describe('SkeletonDetailBlock', () => {
  it('renders the default 4 lines, with the last one narrower', () => {
    const { container } = render(<SkeletonDetailBlock />);
    const lines = container.querySelectorAll('[aria-hidden="true"]');
    expect(lines).toHaveLength(4);
    expect(lines[3].className).toMatch(/w-1\/2/);
    expect(lines[0].className).toMatch(/w-full/);
  });

  it('renders a custom number of lines', () => {
    const { container } = render(<SkeletonDetailBlock lines={2} />);
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
  });
});
