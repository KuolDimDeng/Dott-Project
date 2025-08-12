'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import POSSystemInline from './POSSystemInline';
import { useSession } from '@/hooks/useSession-v2';
import { logger } from '@/utils/logger';
import { 
  ShieldCheckIcon, 
  LockClosedIcon,
  ExclamationTriangleIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline';

/**
 * SecureMobilePOS - A security-enhanced wrapper for mobile POS
 * Features:
 * - Strict tenant isolation
 * - Session validation
 * - Device fingerprinting
 * - Secure data transmission
 * - Audit logging
 */
const SecureMobilePOS = ({ onBack }) => {
  const router = useRouter();
  const { session, loading: sessionLoading } = useSession();
  const [securityCheck, setSecurityCheck] = useState('pending');
  const [tenantData, setTenantData] = useState(null);
  const [deviceFingerprint, setDeviceFingerprint] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        userAgent.toLowerCase()
      );
      setIsMobile(isMobileDevice || window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Generate device fingerprint for additional security
  useEffect(() => {
    const generateFingerprint = async () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('fingerprint', 2, 2);
        const canvasData = canvas.toDataURL();
        
        const fingerprint = {
          userAgent: navigator.userAgent,
          language: navigator.language,
          platform: navigator.platform,
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          canvas: canvasData.substring(0, 50), // Just a portion for security
          timestamp: new Date().toISOString()
        };
        
        setDeviceFingerprint(btoa(JSON.stringify(fingerprint)));
        logger.info('[SecureMobilePOS] Device fingerprint generated');
      } catch (error) {
        logger.error('[SecureMobilePOS] Error generating fingerprint:', error);
      }
    };

    generateFingerprint();
  }, []);

  // Validate session and tenant isolation
  useEffect(() => {
    const validateSecurity = async () => {
      try {
        setSecurityCheck('validating');

        // Check if session exists
        if (!session) {
          logger.warn('[SecureMobilePOS] No session found');
          setSecurityCheck('failed');
          toast.error('Please sign in to access POS');
          router.push('/auth/signin');
          return;
        }

        // Validate tenant ID
        if (!session.user?.tenantId && !session.user?.tenant_id) {
          logger.error('[SecureMobilePOS] No tenant ID in session');
          setSecurityCheck('failed');
          toast.error('Invalid tenant configuration');
          return;
        }

        const tenantId = session.user?.tenantId || session.user?.tenant_id;

        // Validate session with backend including tenant check
        const response = await fetch('/api/auth/validate-pos-access', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Tenant-ID': tenantId,
            'X-Device-Fingerprint': deviceFingerprint || 'pending',
            'X-Client-Type': isMobile ? 'mobile-pwa' : 'web'
          },
          body: JSON.stringify({
            tenantId,
            deviceInfo: {
              isMobile,
              userAgent: navigator.userAgent,
              timestamp: new Date().toISOString()
            }
          }),
          credentials: 'include'
        });

        if (!response.ok) {
          const error = await response.json();
          logger.error('[SecureMobilePOS] Security validation failed:', error);
          setSecurityCheck('failed');
          
          if (response.status === 403) {
            toast.error('Access denied. You do not have permission to use POS.');
          } else if (response.status === 401) {
            toast.error('Session expired. Please sign in again.');
            router.push('/auth/signin');
          } else {
            toast.error('Security check failed');
          }
          return;
        }

        const validationData = await response.json();
        
        // Verify tenant match
        if (validationData.tenantId !== tenantId) {
          logger.error('[SecureMobilePOS] Tenant mismatch detected!', {
            expected: tenantId,
            received: validationData.tenantId
          });
          setSecurityCheck('failed');
          toast.error('Security violation detected');
          return;
        }

        // Store validated tenant data
        setTenantData({
          id: validationData.tenantId,
          name: validationData.tenantName || session.user?.businessName,
          permissions: validationData.permissions || [],
          settings: validationData.settings || {}
        });

        // Log successful validation
        logger.info('[SecureMobilePOS] Security validation successful', {
          tenantId: validationData.tenantId,
          deviceType: isMobile ? 'mobile' : 'web'
        });

        setSecurityCheck('passed');
      } catch (error) {
        logger.error('[SecureMobilePOS] Security validation error:', error);
        setSecurityCheck('failed');
        toast.error('Security check failed. Please try again.');
      }
    };

    if (!sessionLoading && session) {
      validateSecurity();
    }
  }, [session, sessionLoading, router, deviceFingerprint, isMobile]);

  // Secure data fetcher with tenant isolation
  const secureFetch = useCallback(async (url, options = {}) => {
    if (!tenantData?.id) {
      throw new Error('No tenant context available');
    }

    const secureOptions = {
      ...options,
      headers: {
        ...options.headers,
        'X-Tenant-ID': tenantData.id,
        'X-Device-Fingerprint': deviceFingerprint || 'unknown',
        'X-Client-Type': isMobile ? 'mobile-pwa' : 'web',
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    };

    const response = await fetch(url, secureOptions);
    
    // Check for tenant isolation violations
    const responseTenantId = response.headers.get('X-Tenant-ID');
    if (responseTenantId && responseTenantId !== tenantData.id) {
      logger.error('[SecureMobilePOS] Tenant isolation violation detected!', {
        expected: tenantData.id,
        received: responseTenantId
      });
      throw new Error('Security violation: Invalid tenant response');
    }

    return response;
  }, [tenantData, deviceFingerprint, isMobile]);

  // Handle sale completion with audit logging
  const handleSaleCompleted = useCallback(async (saleData) => {
    try {
      // Audit log the sale
      await fetch('/api/audit/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenantData?.id
        },
        body: JSON.stringify({
          action: 'pos_sale_completed',
          resource: 'sale',
          resourceId: saleData.id,
          details: {
            amount: saleData.total_amount,
            paymentMethod: saleData.payment_method,
            deviceType: isMobile ? 'mobile' : 'web',
            timestamp: new Date().toISOString()
          }
        }),
        credentials: 'include'
      });

      logger.info('[SecureMobilePOS] Sale completed and audited', {
        saleId: saleData.id,
        tenantId: tenantData?.id
      });
    } catch (error) {
      logger.error('[SecureMobilePOS] Error logging sale audit:', error);
      // Don't fail the sale, just log the error
    }
  }, [tenantData, isMobile]);

  // Loading state
  if (sessionLoading || securityCheck === 'pending' || securityCheck === 'validating') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="flex flex-col items-center">
            <ShieldCheckIcon className="w-16 h-16 text-blue-600 mb-4 animate-pulse" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Securing POS System
            </h2>
            <p className="text-gray-600 text-center mb-4">
              Validating security credentials and tenant isolation...
            </p>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Security check failed
  if (securityCheck === 'failed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="flex flex-col items-center">
            <ExclamationTriangleIcon className="w-16 h-16 text-red-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Access Denied
            </h2>
            <p className="text-gray-600 text-center mb-6">
              Security validation failed. Please ensure you have proper permissions to access the POS system.
            </p>
            <div className="flex space-x-3 w-full">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render secure POS with tenant context
  return (
    <div className="relative">
      {/* Security indicator */}
      <div className="absolute top-2 right-2 z-50 flex items-center space-x-2 bg-green-100 px-3 py-1 rounded-full">
        <LockClosedIcon className="w-4 h-4 text-green-600" />
        <span className="text-xs font-medium text-green-700">Secure</span>
        {isMobile && (
          <>
            <DevicePhoneMobileIcon className="w-4 h-4 text-green-600 ml-2" />
            <span className="text-xs font-medium text-green-700">Mobile</span>
          </>
        )}
      </div>

      {/* Pass secure context to POS */}
      <POSSystemInline 
        onBack={onBack}
        onSaleCompleted={handleSaleCompleted}
        tenantId={tenantData?.id}
        secureFetch={secureFetch}
        isMobile={isMobile}
        securityContext={{
          tenantId: tenantData?.id,
          tenantName: tenantData?.name,
          deviceFingerprint,
          isMobile
        }}
      />
    </div>
  );
};

export default SecureMobilePOS;