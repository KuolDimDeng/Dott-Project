'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { updateUserAttributes, fetchUserAttributes } from 'aws-amplify/auth';
import { COGNITO_ATTRIBUTES } from '@/constants/onboarding';

// Dynamically import components that might cause issues
const SessionProvider = dynamic(() => import('next-auth/react').then(mod => mod.SessionProvider), {
  ssr: false,
});

/**
 * Updates Cognito attributes to mark onboarding as complete
 * Sets custom:setupdone=true and custom:onboarding=complete
 */
async function updateCompletionAttributes() {
  try {
    logger.debug('[DashboardLayout] Updating Cognito attributes for completed onboarding');
    
    // First try direct Amplify update
    try {
      await updateUserAttributes({
        userAttributes: {
          'custom:setupdone': 'true',
          'custom:onboarding': 'complete',
          'custom:userrole': 'OWNER',
          'custom:updated_at': new Date().toISOString()
        }
      });
      logger.info('[DashboardLayout] Successfully updated Cognito attributes via Amplify');
      return true;
    } catch (amplifyError) {
      logger.warn('[DashboardLayout] Amplify update failed, falling back to API:', amplifyError);
      
      // Fallback to API endpoint
      const response = await fetch('/api/user/update-attributes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attributes: {
            'custom:setupdone': 'true',
            'custom:onboarding': 'complete',
            'custom:userrole': 'OWNER',
            'custom:updated_at': new Date().toISOString()
          },
          forceUpdate: true
        })
      });
      
      if (response.ok) {
        logger.info('[DashboardLayout] Successfully updated Cognito attributes via API');
        return true;
      } else {
        throw new Error(`API request failed with status ${response.status}`);
      }
    }
  } catch (error) {
    logger.error('[DashboardLayout] Failed to update completion attributes:', error);
    return false;
  }
}

/**
 * Checks if attributes need updating and updates them if necessary
 */
async function ensureCompletionAttributes() {
  try {
    // Check current attributes
    const attributes = await fetchUserAttributes();
    const setupDone = attributes['custom:setupdone']?.toLowerCase() === 'true';
    const onboardingComplete = attributes['custom:onboarding']?.toLowerCase() === 'complete';
    
    // If either attribute is missing or incorrect, update both
    if (!setupDone || !onboardingComplete) {
      logger.info('[DashboardLayout] Attributes need updating:', {
        setupDone,
        onboardingComplete
      });
      return await updateCompletionAttributes();
    }
    
    logger.debug('[DashboardLayout] Attributes already correctly set');
    return true;
  } catch (error) {
    logger.error('[DashboardLayout] Error checking attributes:', error);
    return false;
  }
}

/**
 * DashboardLayout
 * 
 * A shared layout component for dashboard pages that closely mimics the original dashboard layout
 */
export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [attributesChecked, setAttributesChecked] = useState(false);
  
  // Handle drawer toggle
  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
    logger.debug('[DashboardLayout] Toggled drawer:', !drawerOpen);
  };

  // Update Cognito attributes when dashboard loads
  useEffect(() => {
    const updateAttributes = async () => {
      if (!attributesChecked) {
        try {
          await ensureCompletionAttributes();
        } catch (error) {
          logger.error('[DashboardLayout] Error updating attributes:', error);
        } finally {
          setAttributesChecked(true);
        }
      }
    };
    
    updateAttributes();
  }, [attributesChecked]);

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

      {/* App Bar */}
      <header className="fixed top-0 left-0 right-0 w-full bg-primary-main text-white shadow-md z-20">
        <div className="flex items-center justify-between px-4 h-16">
          {/* Logo on the left */}
          <div className="cursor-pointer" onClick={handleDrawerToggle}>
            <Image 
              src="/static/images/PyfactorDashboard.png"
              alt="Pyfactor Dashboard Logo"
              width={140}
              height={40}
              className="object-contain"
              priority
            />
          </div>
          
          {/* Controls on the right */}
          <div className="flex items-center space-x-2">
            {/* Menu toggle button */}
            <button
              className="flex items-center justify-center p-2 text-white hover:bg-white/10 rounded-full"
              aria-label="open drawer"
              onClick={handleDrawerToggle}
              title="Open and close menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            
            {/* User profile (simplified) */}
            <button
              className="flex items-center justify-center text-white hover:bg-white/10 p-0.5 rounded-full"
            >
              <div className="w-8 h-8 rounded-full bg-primary-dark text-white flex items-center justify-center text-sm font-medium border-2 border-white">
                U
              </div>
            </button>
          </div>
        </div>
      </header>
      
      {/* Main content area */}
      <div className="flex flex-1 pt-16">
        {/* Drawer - simplified version */}
        {drawerOpen && (
          <aside className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-10 pt-16 transition-all duration-300">
            <nav className="p-4">
              <ul className="space-y-2">
                <li>
                  <a href="#" className="flex items-center p-2 rounded hover:bg-gray-100">
                    <span>Dashboard</span>
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center p-2 rounded hover:bg-gray-100">
                    <span>Products</span>
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center p-2 rounded hover:bg-gray-100">
                    <span>Customers</span>
                  </a>
                </li>
                <li>
                  <a href="#" className="flex items-center p-2 rounded hover:bg-gray-100">
                    <span>Invoices</span>
                  </a>
                </li>
              </ul>
            </nav>
          </aside>
        )}
        
        {/* Main content */}
        <main className={`flex-1 p-6 transition-all duration-300 ${drawerOpen ? 'md:ml-64' : ''}`}>
          {children}
        </main>
      </div>
      
      {/* Footer */}
      <footer className="py-4 px-6 text-center text-sm text-gray-500 border-t mt-auto">
        <p>© {new Date().getFullYear()} PyFactor. All rights reserved.</p>
      </footer>
    </div>
  );
} 