'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import { Tab } from '@headlessui/react';
import { fetchAuthSession } from '@aws-amplify/auth';
import { getCacheValue } from '@/utils/appCache';

// Import components for tabs
import MyPay from './pay/MyPay';
import PayAdmin from './pay/PayAdmin';
import PaySettings from './pay/PaySettings';

/**
 * Pay Management Component
 * Handles employee payment information, income tax withholding, and pay statements 
 * with a tab-based interface similar to TimesheetManagement
 */
const PayManagement = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [isManager, setIsManager] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getUserData = async () => {
      try {
        // First try to get from app cache
        const cachedUserData = await getCacheValue('userData');
        
        if (cachedUserData) {
          console.log('[PayManagement] Using cached user data');
          setUserData(cachedUserData);
          
          // Check roles with case-insensitive matching
          const roleLower = cachedUserData.role?.toLowerCase() || '';
          setIsManager(
            roleLower.includes('manager') || 
            roleLower.includes('admin') || 
            roleLower === 'manager' || 
            roleLower === 'admin'
          );
          setIsOwner(roleLower.includes('owner') || roleLower === 'owner');
          setLoading(false);
          return;
        }
        
        // Try to get from session
        try {
          const session = await fetchAuthSession();
          const userRole = session?.accessToken?.payload?.['custom:role'] || '';
          const userId = session?.accessToken?.payload?.sub;
          
          // Check roles with case-insensitive matching
          const roleLower = userRole.toLowerCase();
          setIsManager(
            roleLower.includes('manager') || 
            roleLower.includes('admin') || 
            roleLower === 'manager' || 
            roleLower === 'admin'
          );
          setIsOwner(roleLower.includes('owner') || roleLower === 'owner');
          
          console.log('[PayManagement] User role from session:', userRole, 'isManager:', 
            roleLower.includes('manager') || roleLower.includes('admin'), 'isOwner:', 
            roleLower.includes('owner') || roleLower === 'owner');
          
          setUserData({
            id: userId,
            role: userRole,
          });
        } catch (sessionError) {
          console.error('[PayManagement] Error fetching auth session:', sessionError);
          // Fall back to default values for demo
          setIsManager(true);
          setIsOwner(true);
          setUserData({
            id: 'demo-user',
            role: 'owner',
          });
        }
      } catch (error) {
        console.error('[PayManagement] Error fetching user data:', error);
        setError('Unable to load user data');
        // Set default values for demo/fallback
        setIsManager(true);
        setIsOwner(true);
      } finally {
        setLoading(false);
      }
    };
    
    getUserData();
  }, []);

  const handleTabChange = useCallback((index) => {
    setActiveTab(index);
  }, []);
  
  // Improved logging with more details
  console.log('[PayManagement] Role detection:', { 
    isManager, 
    isOwner, 
    userRole: userData?.role, 
    roleType: userData?.role ? typeof userData.role : 'undefined',
    roleLength: userData?.role ? userData.role.length : 0
  });
  
  // TEMPORARY: Force enable all tabs for development/debugging
  // Remove this in production
  if (!isManager || !isOwner) {
    console.log('[PayManagement] Forcing all tabs to be visible for development');
    setIsManager(true);
    setIsOwner(true);
  }
  
  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold">Error Loading Pay Management</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Pay Management</h1>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <Tab.Group selectedIndex={activeTab} onChange={handleTabChange}>
          <Tab.List className="flex border-b border-gray-200 bg-gray-50">
            <Tab 
              className={({ selected }) => `
                py-4 px-6 text-sm font-medium outline-none whitespace-nowrap
                ${selected 
                  ? 'text-blue-600 border-b-2 border-blue-500 bg-white' 
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              My Pay
            </Tab>
            
            {(isManager || isOwner) && (
              <Tab 
                className={({ selected }) => `
                  py-4 px-6 text-sm font-medium outline-none whitespace-nowrap
                  ${selected 
                    ? 'text-blue-600 border-b-2 border-blue-500 bg-white' 
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `}
              >
                Pay Admin
              </Tab>
            )}
            
            {isOwner && (
              <Tab 
                className={({ selected }) => `
                  py-4 px-6 text-sm font-medium outline-none whitespace-nowrap
                  ${selected 
                    ? 'text-blue-600 border-b-2 border-blue-500 bg-white' 
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `}
              >
                Pay Settings
              </Tab>
            )}
          </Tab.List>
          
          <Tab.Panels className="p-6">
            <Tab.Panel>
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <MyPay userData={userData} />
              )}
            </Tab.Panel>
            
            {(isManager || isOwner) && (
              <Tab.Panel>
                {loading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                  </div>
                ) : (
                  <PayAdmin userData={userData} isOwner={isOwner} />
                )}
              </Tab.Panel>
            )}
            
            {isOwner && (
              <Tab.Panel>
                {loading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                  </div>
                ) : (
                  <PaySettings userData={userData} />
                )}
              </Tab.Panel>
            )}
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  );
};

export default PayManagement; 