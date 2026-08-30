import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BedCapacityCard } from './BedCapacityCard';

describe('BedCapacityCard', () => {
  it('renders bed type and correct free bed count', () => {
    render(
      <BedCapacityCard
        bedType="ICU"
        total={10}
        occupied={3}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText('ICU')).toBeInTheDocument();
    expect(screen.getByText('3 of 10 occupied')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('free of 10')).toBeInTheDocument();
    expect(screen.getByText('Available')).toBeInTheDocument();
  });

  it('displays Low status badge when free ratio < 20%', () => {
    render(
      <BedCapacityCard
        bedType="CCU"
        total={10}
        occupied={9}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('free of 10')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
  });

  it('displays Full status badge when 0 beds free', () => {
    render(
      <BedCapacityCard
        bedType="PICU"
        total={5}
        occupied={5}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('free of 5')).toBeInTheDocument();
    expect(screen.getByText('Full')).toBeInTheDocument();
  });

  it('calls onChange with incremented occupied when Minus button (One more occupied) is clicked', () => {
    const handleChange = vi.fn();
    render(
      <BedCapacityCard
        bedType="Ward"
        total={20}
        occupied={5}
        onChange={handleChange}
      />
    );

    const minusButton = screen.getByRole('button', {
      name: /One more Ward bed occupied/i,
    });
    fireEvent.click(minusButton);
    expect(handleChange).toHaveBeenCalledWith(6);
  });

  it('calls onChange with decremented occupied when Plus button (One fewer occupied) is clicked', () => {
    const handleChange = vi.fn();
    render(
      <BedCapacityCard
        bedType="Ward"
        total={20}
        occupied={5}
        onChange={handleChange}
      />
    );

    const plusButton = screen.getByRole('button', {
      name: /One fewer Ward bed occupied/i,
    });
    fireEvent.click(plusButton);
    expect(handleChange).toHaveBeenCalledWith(4);
  });

  it('disables Minus button when occupied is at capacity', () => {
    render(
      <BedCapacityCard
        bedType="ICU"
        total={10}
        occupied={10}
        onChange={vi.fn()}
      />
    );

    const minusButton = screen.getByRole('button', {
      name: /One more ICU bed occupied/i,
    });
    expect(minusButton).toBeDisabled();
  });

  it('disables Plus button when occupied is 0', () => {
    render(
      <BedCapacityCard
        bedType="ICU"
        total={10}
        occupied={0}
        onChange={vi.fn()}
      />
    );

    const plusButton = screen.getByRole('button', {
      name: /One fewer ICU bed occupied/i,
    });
    expect(plusButton).toBeDisabled();
  });
});
