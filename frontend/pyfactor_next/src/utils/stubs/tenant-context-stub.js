// Build-time stub for TenantContext
import React from 'react';

export function TenantProvider({ children }) {
  return React.createElement('div', null, children);
}

export function useTenantContext() {
  return {
    tenant: null,
    isLoading: true,
  };
}

export default null; 