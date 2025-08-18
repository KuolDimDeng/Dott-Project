'use client';

// Wrapper component to fix lazy loading issues with EstimateManagement
// This provides a stable export that can be lazy loaded without chunking errors

import dynamic from 'next/dynamic';
import StandardSpinner from '@/components/ui/StandardSpinner';

const EstimateManagement = dynamic(
  () => import('./EstimateManagement'),
  {
    loading: () => <StandardSpinner />,
    ssr: false
  }
);

const EstimateManagementWrapper = (props) => {
  return <EstimateManagement {...props} />;
};

export default EstimateManagementWrapper;