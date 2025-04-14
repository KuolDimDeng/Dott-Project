'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDevTenant } from '@/context/DevTenantContext';
import { getCacheValue, setCacheValue } from '@/utils/appCache';

// Subscription plans for development mode
const SUBSCRIPTION_PLANS = [
  { id: 'free', name: 'Free Plan', price: 0 },
  { id: 'professional', name: 'Professional', price: 29.99 },
  { id: 'enterprise', name: 'Enterprise', price: 99.99 }
];

export default function DevLoginBypass() {
  const [isVisible, setIsVisible] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const router = useRouter();
  const { currentTenant, switchTenant, createTenant, getAvailableTenants, isLoading } = useDevTenant();
  const [newTenantName, setNewTenantName] = useState('');
  const [userName, setUserName] = useState('Dev User');
  const [availableTenants, setAvailableTenants] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState('professional');
  
  // Show component in development mode
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      setIsVisible(true);
      setAvailableTenants(getAvailableTenants());
      
      // Check if the user is already in dev mode
      const isDevMode = getCacheValue('dev-mode') === 'true';
      if (isDevMode) {
        // Start collapsed if already in dev mode
        setIsCollapsed(true);
        
        // Restore saved user info
        const savedUserName = getCacheValue('dev-user-name');
        if (savedUserName) setUserName(savedUserName);
        
        // Restore saved subscription plan
        const savedPlan = getCacheValue('dev-subscription-plan');
        if (savedPlan) setSelectedPlan(savedPlan);
      }
    }
  }, [getAvailableTenants]);
  
  // Bypass login and go to dashboard
  const handleLoginBypass = () => {
    // Store user info in AppCache for persistence
    setCacheValue('dev-user-name', userName);
    setCacheValue('dev-mode', 'true');
    setCacheValue('dev-authenticated', 'true');
    
    // Store subscription plan
    setCacheValue('dev-subscription-plan', selectedPlan);
    
    // Add plan to session storage for AppBar to access
    sessionStorage.setItem('subscription-plan', selectedPlan);
    
    // Redirect to dashboard
    router.push('/dashboard');
  };
  
  // Handle tenant switch
  const handleTenantSwitch = (e) => {
    const tenantId = e.target.value;
    switchTenant(tenantId);
  };
  
  // Create new tenant
  const handleCreateTenant = (e) => {
    e.preventDefault();
    if (newTenantName.trim()) {
      createTenant(newTenantName);
      setNewTenantName('');
    }
  };
  
  // Handle plan change
  const handlePlanChange = (e) => {
    const plan = e.target.value;
    setSelectedPlan(plan);
    
    // Immediately update AppCache and sessionStorage
    setCacheValue('dev-subscription-plan', plan);
    sessionStorage.setItem('subscription-plan', plan);
    
    // Trigger a custom event for AppBar to listen to
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('dev-plan-changed', { 
        detail: { plan } 
      });
      window.dispatchEvent(event);
    }
  };
  
  // Toggle collapsed state
  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
  };
  
  // Get plan color based on plan type
  const getPlanColor = (plan) => {
    switch(plan) {
      case 'professional': return 'bg-purple-600 hover:bg-purple-700';
      case 'enterprise': return 'bg-indigo-600 hover:bg-indigo-700';
      default: return 'bg-blue-600 hover:bg-blue-700';
    }
  };
  
  // Get plan background color based on plan type
  const getPlanBgColor = (plan) => {
    switch(plan) {
      case 'professional': return 'bg-purple-600';
      case 'enterprise': return 'bg-indigo-600';
      default: return 'bg-blue-600';
    }
  };
  
  if (!isVisible || isLoading) return null;
  
  return (
    <div className={`fixed bottom-0 left-0 w-full ${isCollapsed ? 'h-8' : 'h-auto'} bg-gray-800 text-white flex flex-col items-center z-50 shadow-md border-t-2 border-blue-600 transition-all duration-300`}>
      {/* Toggle bar */}
      <div 
        className="w-full flex justify-between items-center px-4 py-1 cursor-pointer bg-gray-700 hover:bg-gray-600"
        onClick={toggleCollapsed}
      >
        <span className="text-xs font-medium flex items-center">
          <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-md mr-2">DEV</span>
          {currentTenant?.name}
        </span>
        <span className="text-xs">
          {isCollapsed ? '▲ Expand' : '▼ Collapse'}
        </span>
      </div>
      
      {/* Collapsible content */}
      {!isCollapsed && (
        <div className="w-full p-2 bg-gray-800">
          <div className="flex flex-wrap items-center justify-between w-full px-4 mb-2 gap-2">
            <div className="flex items-center">
              <span className="text-xs font-medium mr-1">Tenant:</span>
              <select
                className="ml-1 p-1 text-xs border border-gray-600 rounded bg-gray-700 text-white"
                value={currentTenant?.id || ''}
                onChange={handleTenantSwitch}
              >
                {availableTenants.map(tenant => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center">
              <span className="text-xs font-medium mr-1">Plan:</span>
              <select
                className={`ml-1 p-1 text-xs border border-gray-600 rounded ${getPlanBgColor(selectedPlan)} text-white`}
                value={selectedPlan}
                onChange={handlePlanChange}
              >
                {SUBSCRIPTION_PLANS.map(plan => (
                  <option 
                    key={plan.id} 
                    value={plan.id}
                    className={getPlanBgColor(plan.id)}
                  >
                    {plan.name} (${plan.price})
                  </option>
                ))}
              </select>
              {selectedPlan === 'free' && (
                <span className="ml-2 text-xs text-yellow-400">Upgrade for more features</span>
              )}
            </div>
            
            <div className="flex items-center">
              <span className="text-xs font-medium mr-1">User:</span>
              <input
                type="text"
                className="ml-1 p-1 text-xs border border-gray-600 rounded bg-gray-700 text-white w-32"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Dev Username"
              />
            </div>
            
            <button
              onClick={handleLoginBypass}
              className={`${getPlanColor(selectedPlan)} text-white text-xs px-3 py-1 rounded`}
            >
              Go to Dashboard
            </button>
          </div>
          
          <div className="w-full flex items-center justify-between px-4 mt-2 pt-2 border-t border-gray-700">
            <form onSubmit={handleCreateTenant} className="flex items-center">
              <input
                type="text"
                className="p-1 text-xs border border-gray-600 rounded bg-gray-700 text-white"
                value={newTenantName}
                onChange={(e) => setNewTenantName(e.target.value)}
                placeholder="New Tenant Name"
              />
              <button
                type="submit"
                className="ml-2 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 rounded"
              >
                Create
              </button>
            </form>
            
            <div className="text-xs text-gray-400">
              ID: <span className="font-mono text-xs">{currentTenant?.id?.substring(0, 8)}...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 