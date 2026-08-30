import React from 'react';
import { ReferralTimeline, ReferralTimelineProps } from './ReferralTimeline';

export type StatusTimelineProps = ReferralTimelineProps;

export const StatusTimeline: React.FC<StatusTimelineProps> = (props) => {
  return <ReferralTimeline {...props} />;
};
