import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BedCapacityGrid } from './BedCapacityGrid';
import { Facility } from '../../types';

const mockFacility: Facility = {
  id: 'fac-1',
  name: 'Ismailia Medical Complex',
  type: 'tertiary_care',
  location: 'Ismailia City',
  departments: ['Cardiology', 'ICU', 'Emergency'],
  capacity: {
    ICU: { total: 10, occupied: 3 },
    CCU: { total: 8, occupied: 2 },
    PICU: { total: 6, occupied: 1 },
    Ward: { total: 30, occupied: 15 },
  },
};

describe('BedCapacityGrid', () => {
  it('renders aggregate KPI summary numbers correctly', () => {
    render(
      <MemoryRouter>
        <BedCapacityGrid
          facility={mockFacility}
          capacities={mockFacility.capacity}
          onCapacityChange={vi.fn()}
        />
      </MemoryRouter>
    );

    // Total: 10 + 8 + 6 + 30 = 54
    expect(screen.getByText('54')).toBeInTheDocument();
    expect(screen.getByText('Across 4 configured units')).toBeInTheDocument();

    // Occupied: 3 + 2 + 1 + 15 = 21
    expect(screen.getByText('21')).toBeInTheDocument();

    // Available: 54 - 21 = 33
    expect(screen.getByText('33')).toBeInTheDocument();

    // Overall Occupancy: 21 / 54 = 39%
    expect(screen.getByText('39%')).toBeInTheDocument();
  });

  it('renders admin facility switcher when isAdmin is true', () => {
    const handleSelectFacility = vi.fn();
    render(
      <MemoryRouter>
        <BedCapacityGrid
          facility={mockFacility}
          capacities={mockFacility.capacity}
          onCapacityChange={vi.fn()}
          isAdmin={true}
          facilities={[
            mockFacility,
            { ...mockFacility, id: 'fac-2', name: 'Fayed Specialized Hospital' },
          ]}
          selectedFacilityId="fac-1"
          onSelectFacility={handleSelectFacility}
        />
      </MemoryRouter>
    );

    const select = screen.getByLabelText(/Admin View:/i);
    expect(select).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Ismailia Medical Complex' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Fayed Specialized Hospital' })).toBeInTheDocument();

    fireEvent.change(select, { target: { value: 'fac-2' } });
    expect(handleSelectFacility).toHaveBeenCalledWith('fac-2');
  });

  it('renders settings link when canEditTotal is true', () => {
    render(
      <MemoryRouter>
        <BedCapacityGrid
          facility={mockFacility}
          capacities={mockFacility.capacity}
          onCapacityChange={vi.fn()}
          canEditTotal={true}
        />
      </MemoryRouter>
    );

    const link = screen.getByRole('link', { name: /Edit total capacity/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/facility-settings');
  });

  it('renders empty state when no beds configured', () => {
    const emptyFacility: Facility = {
      ...mockFacility,
      capacity: {
        ICU: { total: 0, occupied: 0 },
        CCU: { total: 0, occupied: 0 },
        PICU: { total: 0, occupied: 0 },
        Ward: { total: 0, occupied: 0 },
      },
    };

    render(
      <MemoryRouter>
        <BedCapacityGrid
          facility={emptyFacility}
          capacities={emptyFacility.capacity}
          onCapacityChange={vi.fn()}
          canEditTotal={true}
        />
      </MemoryRouter>
    );

    expect(
      screen.getByText(/No bed capacity configured for Ismailia Medical Complex yet/i)
    ).toBeInTheDocument();
  });
});
