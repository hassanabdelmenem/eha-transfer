import React from 'react';
import { ERCockpit } from '../components/dashboard/ERCockpit';
import { CaseWorkspace } from '../components/layout/CaseWorkspace';

/** The ER room's home: outbound dispatch gates first, then inbound arrivals. */
export const ERDashboard: React.FC = () => (
  <CaseWorkspace>
    <ERCockpit />
  </CaseWorkspace>
);
