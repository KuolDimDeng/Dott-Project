'use client';


import { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

const DevTenantContext = createContext(null);

export function DevTenantProvider({ children }) {
  const [currentTenant, setCurrentTenant] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load or initialize tenant on component mount
  useEffect(() => {
    const initializeTenant = () => {
      try {
        // Try to get Cognito user ID from cookies first
        const cognitoUserId = getCognitoUserId();
        
        // If we have Cognito user ID, use it as tenant ID
        if (cognitoUserId) {
          const userTenant = {
            id: cognitoUserId,
            name: `User Tenant (${cognitoUserId.substring(0, 8)})`
          };
          setCurrentTenant(userTenant);
          saveTenantToStorage(userTenant);
          console.log(`[DevTenant] Using Cognito user ID as tenant: ${cognitoUserId}`);
          return;
        }
        
        // Check local storage as fallback
        const storedTenantId = localStorage.getItem('tenantId');
        const storedTenantName = localStorage.getItem('tenant-name');
        
        if (storedTenantId) {
          const tenant = {
            id: storedTenantId,
            name: storedTenantName || `Tenant ${storedTenantId.substring(0, 8)}`
          };
          setCurrentTenant(tenant);
          console.log(`[DevTenant] Using stored tenant: ${tenant.name} (${tenant.id})`);
        } else {
          // Generate a new tenant ID if none exists
          const newTenantId = uuidv4();
          const newTenant = {
            id: newTenantId,
            name: `New Tenant (${newTenantId.substring(0, 8)})`
          };
          setCurrentTenant(newTenant);
          saveTenantToStorage(newTenant);
          console.log(`[DevTenant] Generated new tenant: ${newTenant.name} (${newTenant.id})`);
        }
      } catch (error) {
        console.error('[DevTenant] Error initializing tenant:', error);
        // Generate a fallback tenant ID
        const fallbackId = uuidv4();
        const fallbackTenant = { 
          id: fallbackId, 
          name: `Fallback Tenant (${fallbackId.substring(0, 8)})` 
        };
        setCurrentTenant(fallbackTenant);
        saveTenantToStorage(fallbackTenant);
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeTenant();
  }, []);
  
  // Get Cognito user ID from cookies
  const getCognitoUserId = () => {
    if (typeof document === 'undefined') return null;
    
    const cookies = document.cookie.split(';');
    const cognitoMatch = cookies.find(cookie => 
      cookie.trim().match(/CognitoIdentityServiceProvider\.[^.]+\.LastAuthUser=/)
    );
    
    if (cognitoMatch) {
      return cognitoMatch.trim().split('=')[1];
    }
    
    return null;
  };
  
  // Helper to save tenant to storage
  const saveTenantToStorage = (tenant) => {
    localStorage.setItem('tenantId', tenant.id);
    localStorage.setItem('tenant-name', tenant.name);
    
    // Also set in cookies for API requests
    document.cookie = `tenantId=${tenant.id}; path=/; max-age=86400`;
    
    // For server-side access, also set in sessionStorage
    sessionStorage.setItem('tenant_id', tenant.id);
  };
  
  // Create a new tenant
  const createTenant = (tenantName) => {
    if (!tenantName) {
      console.error('[DevTenant] Tenant name is required');
      return false;
    }
    
    // Create a new tenant with a UUID
    const newTenant = {
      id: uuidv4(),
      name: tenantName
    };
    
    // Switch to the new tenant
    setCurrentTenant(newTenant);
    saveTenantToStorage(newTenant);
    console.log(`[DevTenant] Created and switched to new tenant: ${newTenant.name} (${newTenant.id})`);
    
    return true;
  };
  
  // Provide access to tenant context
  const value = {
    currentTenant,
    isLoading,
    createTenant,
    // No need to switch tenants or get available tenants anymore
    getAllTenantIds: () => currentTenant ? [currentTenant.id] : []
  };
  
  return (
    <DevTenantContext.Provider value={value}>
      {children}
    </DevTenantContext.Provider>
  );
}

export function useDevTenant() {
  const context = useContext(DevTenantContext);
  if (!context) {
    throw new Error('useDevTenant must be used within a DevTenantProvider');
  }
  return context;
}

// Helper hook for testing currently active tenant
export function useCurrentTenant() {
  const { currentTenant } = useDevTenant();
  return currentTenant;
}

// Helper to get tenant ID without React context
export function getDevTenantId() {
  if (typeof window === 'undefined') return null;
  
  // Try to get Cognito user ID first (highest priority)
  const cookies = document.cookie.split(';');
  const cognitoMatch = cookies.find(cookie => 
    cookie.trim().match(/CognitoIdentityServiceProvider\.[^.]+\.LastAuthUser=/)
  );
  
  if (cognitoMatch) {
    return cognitoMatch.trim().split('=')[1];
  }
  
  // Fallbacks in order of priority
  return localStorage.getItem('tenantId') || 
         document.cookie.split('; ').find(row => row.startsWith('tenantId='))?.split('=')[1] ||
         sessionStorage.getItem('tenant_id') ||
         uuidv4(); // Generate new ID if none found
} 