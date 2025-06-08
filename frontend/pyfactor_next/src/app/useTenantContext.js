'use client';


import { useTenant } from '@/context/TenantContext';

/**
 * Custom hook to access the tenant context
 * Re-export of useTenant for better naming consistency
 */
export const useTenantContext = useTenant;

export default useTenantContext; 