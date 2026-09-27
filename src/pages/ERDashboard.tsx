import React from 'react';
import { ERCockpit } from '../components/dashboard/ERCockpit';

/** The ER room's home: outbound dispatch gates first, then inbound arrivals. */
export const ERDashboard: React.FC = () => (
  <div className="max-w-[640px]">
    <ERCockpit />
  </div>
);
