'use client';

import { useState, useEffect, useRef } from 'react';
import { useTenant } from '@/context/TenantContext';
import { apiService } from '@/lib/apiService';
import { logger } from '@/utils/logger';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';

/**
 * TenantSwitcher component allows users to switch between available tenants
 * Displays current tenant and provides dropdown to select other tenants
 * Uses Tailwind CSS for styling
 */
export default function TenantSwitcher() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [apiAvailable, setApiAvailable] = useState(true);
  const { tenantId, tenantInfo, switchTenant } = useTenant();
  const { user } = useSession();
  const router = useRouter();
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Load available tenants on component mount
  useEffect(() => {
    // Skip if no authenticated user
    if (!user) {
      setLoading(false);
      return;
    }
    
    const fetchTenants = async () => {
      try {
        setLoading(true);
        
        try {
          // Use the getUserTenants method from apiService
          const tenantsList = await apiService.getUserTenants();
          
          if (Array.isArray(tenantsList) && tenantsList.length > 0) {
            setTenants(tenantsList);
          } else {
            // If no tenants returned, use the current tenant as the only option
            if (tenantId && tenantInfo) {
              setTenants([{
                id: tenantId,
                name: tenantInfo.name || `Tenant ${tenantId.substring(0, 8)}`,
                role: 'current',
                isActive: true
              }]);
            } else {
              setTenants([]);
            }
          }
        } catch (apiError) {
          logger.warn('Error fetching tenants list, using fallback', apiError);
          
          // Use the current tenant as the only option
          if (tenantId) {
            setTenants([{
              id: tenantId,
              name: tenantInfo?.name || `Tenant ${tenantId.substring(0, 8)}`,
              role: 'current',
              isActive: true
            }]);
          } else {
            setTenants([]);
          }
        }
        
        setApiAvailable(true);
      } catch (error) {
        // Handle 404 specifically - the API endpoint doesn't exist
        if (error.response && error.response.status === 404) {
          logger.warn('Tenant API endpoint not available, hiding tenant switcher');
          setApiAvailable(false);
        } else {
          logger.error('Error loading tenants', error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTenants();
  }, [user, tenantId, tenantInfo]);

  // Handle tenant selection
  const handleTenantSelect = async (selectedTenantId) => {
    if (!selectedTenantId || selectedTenantId === tenantId) {
      setIsOpen(false);
      return;
    }
    
    try {
      logger.info(`Switching to tenant: ${selectedTenantId}`);
      
      // Use the switchTenant method from context
      const switched = await switchTenant(selectedTenantId);
      
      if (switched) {
        // Navigate to dashboard
        router.push('/dashboard');
      }
      
      setIsOpen(false);
    } catch (error) {
      logger.error('Error switching tenant', error);
    }
  };

  // Get current tenant name with fallback
  const getCurrentTenantName = () => {
    if (tenantInfo?.name) {
      return tenantInfo.name;
    } else if (tenantId) {
      return `Tenant ${tenantId.substring(0, 8)}`;
    } else {
      return 'Select Tenant';
    }
  };

  // If API is not available or user has only one tenant, don't display the switcher
  if (!apiAvailable || (tenants.length <= 1 && !loading) || !user) {
    return null;
  }

  return (
    <div className="relative z-10" ref={dropdownRef}>
      <button 
        className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
      >
        {loading ? (
          <span className="flex items-center">
            <svg className="w-4 h-4 mr-2 animate-spin text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading...
          </span>
        ) : (
          <>
            <span className="mr-1">{getCurrentTenantName()}</span>
            <svg 
              className={`w-4 h-4 ml-2 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 z-10 w-56 mt-2 origin-top-right bg-white border border-gray-200 divide-y divide-gray-100 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="py-1">
            {tenants.length === 0 ? (
              <div className="px-4 py-2 text-sm text-gray-500">
                No tenants available
              </div>
            ) : (
              tenants.map((tenant) => (
                <button
                  key={tenant.id}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${tenant.id === tenantId ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
                  onClick={() => handleTenantSelect(tenant.id)}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{tenant.name || `Tenant ${tenant.id.substring(0, 8)}`}</span>
                    {tenant.role && (
                      <span className="text-xs text-gray-500">{tenant.role}</span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
} 