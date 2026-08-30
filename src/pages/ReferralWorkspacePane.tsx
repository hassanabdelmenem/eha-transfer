import React from 'react';
import { ReferralDetailPage } from './ReferralDetailPage';

// Originally intended as a two-pane layout with a queue on the left and detail on the right.
// The user found this confusing on laptops ("viewed on the right side of the page and not the middle").
// Reverting to rendering just the centered ReferralDetailPage.
export const ReferralWorkspacePane: React.FC = () => {
  return <ReferralDetailPage />;
};
