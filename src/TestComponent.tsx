import React from 'react';
import { Navigate } from 'react-router-dom';

export const TestComponent = () => {
  const user: any = null;
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!user.profileCompleted) {
    return <Navigate to="/onboarding" replace />;
  }
  return <div>Test</div>;
};
