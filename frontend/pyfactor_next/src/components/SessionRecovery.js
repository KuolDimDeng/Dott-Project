'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useNotification } from '@/context/NotificationContext';
import { ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function SessionRecovery() {
  const router = useRouter();
  const pathname = usePathname();
  const { notifyInfo, notifySuccess } = useNotification();
  const [recoveryData, setRecoveryData] = useState(null);
  const [isRecovering, setIsRecovering] = useState(false);

  useEffect(() => {
    // Check if we're on signin page with recovery parameter
    if (pathname !== '/auth/signin') {
      // Check for recovery data after successful login
      const savedState = localStorage.getItem('sessionRecoveryState');
      if (savedState) {
        try {
          const state = JSON.parse(savedState);
          // Only offer recovery if it's recent (within 5 minutes)
          if (Date.now() - state.timestamp < 5 * 60 * 1000) {
            setRecoveryData(state);
            // Show recovery option
            setTimeout(() => {
              notifyInfo('Would you like to continue where you left off?', {
                duration: 10000,
                action: 'Restore',
                onAction: () => handleRestore(state)
              });
            }, 1000);
          } else {
            // Data too old, remove it
            localStorage.removeItem('sessionRecoveryState');
          }
        } catch (error) {
          console.error('Failed to parse recovery state:', error);
          localStorage.removeItem('sessionRecoveryState');
        }
      }
    }
  }, [pathname]);

  const handleRestore = async (state) => {
    setIsRecovering(true);
    
    try {
      // Navigate to the previous page
      if (state.currentPath && state.currentPath !== pathname) {
        await router.push(state.currentPath);
      }
      
      // Restore scroll position after navigation
      setTimeout(() => {
        if (state.scrollPosition) {
          window.scrollTo(0, state.scrollPosition);
        }
      }, 500);
      
      // Restore form data if any
      if (state.formData && Object.keys(state.formData).length > 0) {
        setTimeout(() => {
          Object.entries(state.formData).forEach(([formKey, fields]) => {
            const formIndex = parseInt(formKey.replace('form_', ''));
            const forms = document.querySelectorAll('form');
            
            if (forms[formIndex]) {
              Object.entries(fields).forEach(([fieldName, value]) => {
                const field = forms[formIndex].querySelector(`[name="${fieldName}"]`);
                if (field) {
                  field.value = value;
                  // Trigger change event to update React state
                  field.dispatchEvent(new Event('change', { bubbles: true }));
                }
              });
            }
          });
          
          notifySuccess('Session restored successfully');
          
          if (state.hasUnsavedChanges) {
            notifyInfo('You had unsaved changes. Please review and save your work.');
          }
        }, 1000);
      } else {
        notifySuccess('Returned to your previous page');
      }
      
      // Clean up recovery data
      localStorage.removeItem('sessionRecoveryState');
      setRecoveryData(null);
    } catch (error) {
      console.error('Failed to restore session:', error);
      notifyInfo('Could not fully restore your session');
    } finally {
      setIsRecovering(false);
    }
  };

  const handleDismiss = () => {
    localStorage.removeItem('sessionRecoveryState');
    setRecoveryData(null);
  };

  // Don't render anything if no recovery data or on signin page
  if (!recoveryData || pathname === '/auth/signin' || isRecovering) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 max-w-sm bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <ArrowPathIcon className="h-6 w-6 text-blue-600" />
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium text-gray-900">
            Session Recovery Available
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Your previous session was saved. Would you like to restore it?
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => handleRestore(recoveryData)}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Restore Session
            </button>
            <button
              onClick={handleDismiss}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Dismiss
            </button>
          </div>
        </div>
        <div className="ml-4 flex-shrink-0">
          <button
            onClick={handleDismiss}
            className="inline-flex text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}