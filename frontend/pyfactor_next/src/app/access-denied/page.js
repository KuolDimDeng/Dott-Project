'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/hooks/useSession-v2';

export default function AccessDeniedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  
  const [deniedPath, setDeniedPath] = useState('');
  const [reason, setReason] = useState('');
  
  useEffect(() => {
    const path = searchParams.get('path');
    const reasonParam = searchParams.get('reason');
    
    if (path) setDeniedPath(path);
    if (reasonParam) setReason(reasonParam);
  }, [searchParams]);
  
  const getReasonMessage = () => {
    switch (reason) {
      case 'role':
        return 'Your role does not have access to this page. This page is restricted to specific roles.';
      case 'no_permission':
        return 'You do not have permission to access this page. Please contact your administrator.';
      case 'insufficient_permission':
        return 'You have limited access to this page. Additional permissions are required.';
      default:
        return 'You do not have permission to access this resource.';
    }
  };
  
  const getPageName = () => {
    if (!deniedPath) return 'this page';
    
    // Extract meaningful page name from path
    const segments = deniedPath.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];
    
    // Capitalize and format the page name
    const pageName = lastSegment
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    return pageName;
  };
  
  const handleRequestAccess = () => {
    // In a real app, this would open a form or send a request
    alert('Access request feature coming soon. Please contact your administrator.');
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <svg 
                className="w-8 h-8 text-red-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                />
              </svg>
            </div>
          </div>
          
          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Access Denied
          </h1>
          
          {/* Subtitle */}
          <p className="text-gray-600 text-center mb-6">
            You don't have permission to access <strong>{getPageName()}</strong>
          </p>
          
          {/* Reason */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700">
              {getReasonMessage()}
            </p>
          </div>
          
          {/* User Info */}
          {session?.user && (
            <div className="border-t pt-4 mb-6">
              <div className="text-sm text-gray-600">
                <p><strong>Logged in as:</strong> {session.user.email}</p>
                <p><strong>Role:</strong> {session.user.role || 'User'}</p>
              </div>
            </div>
          )}
          
          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => router.back()}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
            >
              Go Back
            </button>
            
            <Link
              href={`/${session?.user?.tenantId || ''}/dashboard`}
              className="block w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-center"
            >
              Go to Dashboard
            </Link>
            
            {reason !== 'role' && (
              <button
                onClick={handleRequestAccess}
                className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 transition-colors"
              >
                Request Access
              </button>
            )}
          </div>
          
          {/* Help Text */}
          <p className="text-xs text-gray-500 text-center mt-6">
            If you believe this is an error, please contact your system administrator.
          </p>
        </div>
      </div>
    </div>
  );
}