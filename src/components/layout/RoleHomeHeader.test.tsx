import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { RoleHomeHeader } from './RoleHomeHeader';
import React from 'react';

describe('RoleHomeHeader', () => {
  it('renders identity string and accessible notification link', () => {
    render(
      <BrowserRouter>
        <RoleHomeHeader identity="Dr. Resident · ICU · Ismailia Medical Complex" />
      </BrowserRouter>
    );

    expect(screen.getByText('Dr. Resident · ICU · Ismailia Medical Complex')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Notifications/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Switch to Arabic/i })).toBeInTheDocument();
  });
});
