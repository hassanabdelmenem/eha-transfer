import React from 'react';
import { useParams } from 'react-router-dom';
import { ReferralDetail } from '../components/referrals/ReferralDetail';

export const ReferralDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  return <ReferralDetail referralId={id || ''} variant="page" />;
};
