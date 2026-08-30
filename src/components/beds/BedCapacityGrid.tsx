import React from 'react';
import { Link } from 'react-router-dom';
import { Bed, Settings, Building2, CheckCircle2, AlertTriangle, Activity } from 'lucide-react';
import { BedType, Facility } from '../../types';
import { BedCapacityCard } from './BedCapacityCard';
import { Card, CardContent } from '../ui/Card';

export interface BedCapacityGridProps {
  facility: Facility;
  capacities: Record<BedType, { total: number; occupied: number }>;
  onCapacityChange: (bedType: BedType, occupied: number) => void;
  isAdmin?: boolean;
  selectedFacilityId?: string;
  onSelectFacility?: (facilityId: string) => void;
  facilities?: Facility[];
  canEditTotal?: boolean;
  disabled?: boolean;
}

const BED_TYPES: BedType[] = ['ICU', 'CCU', 'PICU', 'Ward'];

export const BedCapacityGrid: React.FC<BedCapacityGridProps> = ({
  facility,
  capacities,
  onCapacityChange,
  isAdmin = false,
  selectedFacilityId,
  onSelectFacility,
  facilities = [],
  canEditTotal = false,
  disabled = false,
}) => {
  // Aggregate statistics across all bed types
  const configuredBedTypes = BED_TYPES.filter(
    (bt) => (capacities[bt]?.total ?? 0) > 0
  );

  const totalBeds = BED_TYPES.reduce(
    (acc, bt) => acc + (capacities[bt]?.total ?? 0),
    0
  );
  const totalOccupied = BED_TYPES.reduce(
    (acc, bt) => acc + Math.min(capacities[bt]?.total ?? 0, Math.max(0, capacities[bt]?.occupied ?? 0)),
    0
  );
  const totalAvailable = Math.max(0, totalBeds - totalOccupied);
  const overallOccupancyRate =
    totalBeds > 0 ? Math.round((totalOccupied / totalBeds) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Admin Facility Selector if Admin View */}
      {isAdmin && onSelectFacility && facilities.length > 0 && (
        <Card className="border-blue-100 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-900/10">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <label
              htmlFor="bedMgmtFacility"
              className="text-sm font-semibold text-slate-700 dark:text-slate-300 shrink-0"
            >
              Admin View:
            </label>
            <select
              id="bedMgmtFacility"
              value={selectedFacilityId || facility.id}
              onChange={(e) => onSelectFacility(e.target.value)}
              className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 p-2.5 text-sm focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 min-h-[44px]"
            >
              <option value="">Select Facility to Manage...</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>
      )}

      {/* Summary KPI Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total Beds
            </span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
            {totalBeds}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Across {configuredBedTypes.length} configured units
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Occupied Beds
            </span>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">
            {totalOccupied}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Inpatient census
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Available Beds
            </span>
            <CheckCircle2 className="w-4 h-4 text-success-500" />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-success-600 dark:text-success-400 mt-2">
            {totalAvailable}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Ready for intake
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Overall Occupancy
            </span>
            <AlertTriangle
              className={`w-4 h-4 ${
                overallOccupancyRate >= 90
                  ? 'text-critical-500'
                  : overallOccupancyRate >= 75
                  ? 'text-warning-500'
                  : 'text-slate-400'
              }`}
            />
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-2">
            {overallOccupancyRate}%
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Facility utilization
          </p>
        </div>
      </div>

      {/* Bed Stepper Cards Grid */}
      {configuredBedTypes.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Unit Capacity & Live Steppers
            </h2>
            {canEditTotal && (
              <Link
                to="/facility-settings"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Settings className="w-3.5 h-3.5" />
                Edit total capacity
              </Link>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            {configuredBedTypes.map((bt) => (
              <BedCapacityCard
                key={bt}
                bedType={bt}
                total={capacities[bt]?.total ?? 0}
                occupied={capacities[bt]?.occupied ?? 0}
                onChange={(occupied) => onCapacityChange(bt, occupied)}
                disabled={disabled}
              />
            ))}
          </div>
        </div>
      ) : (
        <Card className="p-8 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center gap-3">
          <Bed className="w-8 h-8 text-slate-300 dark:text-slate-700" />
          <p>No bed capacity configured for {facility.name} yet.</p>
          {canEditTotal && (
            <Link
              to="/facility-settings"
              className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Set up bed capacity in Facility Settings &rarr;
            </Link>
          )}
        </Card>
      )}
    </div>
  );
};
