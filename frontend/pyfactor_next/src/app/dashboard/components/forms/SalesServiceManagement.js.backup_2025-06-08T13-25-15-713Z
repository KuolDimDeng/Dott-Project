import React from 'react';
import ServiceManagement from './ServiceManagement';

/**
 * A wrapper component for service management in sales context.
 * This component ensures proper initialization of the ServiceManagement component
 * with the salesContext prop to avoid infinite update loops.
 */
const SalesServiceManagement = (props) => {
  // Since this is a separate component, React will handle mounting properly
  return (
    <ServiceManagement 
      salesContext={true}
      {...props}
    />
  );
};

export default SalesServiceManagement; 