import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Badge } from './Badge';
import React from 'react';

describe('Badge', () => {
  it('renders children correctly', () => {
    render(<Badge>Test Badge</Badge>);
    expect(screen.getByText('Test Badge')).toBeInTheDocument();
  });

  it('applies default classes', () => {
    render(<Badge data-testid="badge">Default</Badge>);
    const badge = screen.getByTestId('badge');
    expect(badge).toHaveClass('bg-slate-100');
  });

  it('applies success variant classes', () => {
    render(<Badge variant="success" data-testid="badge">Success</Badge>);
    const badge = screen.getByTestId('badge');
    expect(badge).toHaveClass('bg-success-100');
  });

  it('applies warning variant classes', () => {
    render(<Badge variant="warning" data-testid="badge">Warning</Badge>);
    const badge = screen.getByTestId('badge');
    expect(badge).toHaveClass('bg-warning-100');
  });

  it('applies danger variant classes', () => {
    render(<Badge variant="danger" data-testid="badge">Danger</Badge>);
    const badge = screen.getByTestId('badge');
    expect(badge).toHaveClass('bg-critical-100');
  });

  it('passes through additional props', () => {
    render(<Badge id="my-badge" data-testid="badge">Custom</Badge>);
    expect(screen.getByTestId('badge')).toHaveAttribute('id', 'my-badge');
  });
});
