import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RoleBadge } from './RoleBadge';
import React from 'react';

describe('RoleBadge', () => {
  it('renders correctly with default doctor role', () => {
    render(<RoleBadge role="clinician" />);
    expect(screen.getByText('Clinician')).toBeInTheDocument();
  });

  it('renders head_of_department role with appropriate label', () => {
    render(<RoleBadge role="head_of_department" />);
    expect(screen.getByText('Head of Department')).toBeInTheDocument();
  });

  it('renders medical_director role with appropriate label', () => {
    render(<RoleBadge role="medical_director" />);
    expect(screen.getByText('Medical Director')).toBeInTheDocument();
  });

  it('renders nursing_supervisor role with appropriate label', () => {
    render(<RoleBadge role="nursing_supervisor" />);
    expect(screen.getByText('Nursing Supervisor')).toBeInTheDocument();
  });

  it('renders system_admin role with appropriate label', () => {
    render(<RoleBadge role="system_admin" />);
    expect(screen.getByText('System Administrator')).toBeInTheDocument();
  });

  it('renders unknown role gracefully', () => {
    render(<RoleBadge role="custom_role" />);
    expect(screen.getByText('custom role')).toBeInTheDocument();
  });
});
