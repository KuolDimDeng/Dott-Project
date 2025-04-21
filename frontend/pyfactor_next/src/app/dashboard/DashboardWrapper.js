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

// Import HttpsConfig component
import HttpsConfig from '@/components/HttpsConfig';
import HttpsDebugger from '@/components/HttpsDebugger';

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
  
  // Add key state to force children unmount/remount when navigation happens
  const [contentKey, setContentKey] = useState('initial');
  const navigationCountRef = useRef(0);
  
  // Listen for navigation events to force remount of children when needed
  useEffect(() => {
    const handleRouteChange = () => {
      navigationCountRef.current += 1;
      setContentKey(`navigation-${navigationCountRef.current}`);
    };
    
    // Listen for Next.js route changes
    router.events?.on('routeChangeComplete', handleRouteChange);
    
    return () => {
      router.events?.off('routeChangeComplete', handleRouteChange);
    };
  }, [router]);

  // Get tenant ID from URL parameters or session, but don't modify the URL
  useEffect(() => {
    // If tenantId is already in props, use it
    if (propTenantId) {
      setTenantId(propTenantId);
      return;
    }
    
    // Get tenant ID from cookie or session if available
    // Don't modify URL or read from URL params
    const getCachedTenantId = () => {
      // Check cookie
      const cookies = document.cookie.split(';');
      let cookieTenantId = null;
      
      for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'tenantId') {
          cookieTenantId = value;
          break;
        }
      }
      
      if (cookieTenantId) {
        return cookieTenantId;
      }
      
      // Check localStorage/sessionStorage if permitted
      try {
        return localStorage.getItem('tenantId') || sessionStorage.getItem('tenantId');
      } catch (e) {
        return null;
      }
    };
    
    const cachedTenantId = getCachedTenantId();
    
    if (cachedTenantId) {
      logger.info(`[DashboardWrapper] Using tenant ID from cache: ${cachedTenantId}`);
      setTenantId(cachedTenantId);
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
        <HttpsDebugger />
        <Dashboard 
          key={contentKey}
          tenantId={tenantId} 
          newAccount={newAccount}
          plan={plan}
        >
          {children}
        </Dashboard>
      </main>
      
      {/* HTTPS Configuration component - debug purposes only */}
      <HttpsConfig />
    </div>
  );
}