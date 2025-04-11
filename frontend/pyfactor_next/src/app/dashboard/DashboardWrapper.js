'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Dashboard from './DashboardContent';
import { updateUserAttributes, fetchUserAttributes } from 'aws-amplify/auth';
import { COGNITO_ATTRIBUTES } from '@/constants/onboarding';
import { storeTenantId, isValidUUID } from '@/utils/tenantUtils';

/**
 * DashboardWrapper
 * 
 * A shared layout component for dashboard pages that closely mimics the original dashboard layout.
 * This component also handles tenant ID from URL parameters.
 */
export default function DashboardWrapper({ children, newAccount, plan, tenantId: propTenantId }) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [attributesChecked, setAttributesChecked] = useState(false);
  const [tenantId, setTenantId] = useState(propTenantId);
  
  // Get tenant ID from URL parameters if not provided in props
  useEffect(() => {
    // If tenantId is already in props, use it
    if (propTenantId) {
      setTenantId(propTenantId);
      return;
    }
    
    // Otherwise check URL search params
    const params = new URLSearchParams(window.location.search);
    const urlTenantId = params.get('tenantId');
    
    if (urlTenantId) {
      console.log(`[DashboardWrapper] Found tenant ID in URL params: ${urlTenantId}`);
      setTenantId(urlTenantId);
    }
  }, [propTenantId]);

  // Store tenant ID in client storage when available
  useEffect(() => {
    if (tenantId && isValidUUID(tenantId)) {
      logger.info(`[DashboardWrapper] Storing valid tenant ID: ${tenantId}`);
      storeTenantId(tenantId);
    } else if (tenantId) {
      logger.warn(`[DashboardWrapper] Invalid tenant ID format: ${tenantId}`);
    }
  }, [tenantId]);

  // Handle drawer toggle
  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
    logger.debug('[DashboardWrapper] Toggled drawer:', !drawerOpen);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Global styles */}
      <style jsx global>{`
        html, body {
          height: 100%;
          min-height: 100%;
          width: 100%;
          overflow-x: hidden;
        }
        body {
          font-family: var(--font-family, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif);
          margin: 0;
          padding: 0;
        }
        ::selection {
          background-color: rgba(67, 56, 202, 0.3);
        }
      `}</style>

      {/* Main content */}
      <main className="flex-1">
        <Dashboard 
          tenantId={tenantId} 
          newAccount={newAccount}
          plan={plan}
        />
      </main>
    </div>
  );
}