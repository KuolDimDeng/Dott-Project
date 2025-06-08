'use client';

import { useState, useEffect } from 'react';
import { createNewTenantId, setDevTenantId, getDevTenantId } from '@/utils/devTools';

/**
 * Development mode component for managing tenant IDs
 * Only shown in development mode
 */
export default function TenantControls() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentTenantId, setCurrentTenantId] = useState('');
  const [customTenantId, setCustomTenantId] = useState('');
  const [message, setMessage] = useState('');
  const [usingRealDb, setUsingRealDb] = useState(false);
  
  useEffect(() => {
    // Only initialize in development mode
    if (process.env.NODE_ENV !== 'development') {
      return;
    }
    
    // Get current tenant ID
    const tenantId = getDevTenantId() || 'No tenant ID set';
    setCurrentTenantId(tenantId);
    
    // Check if using real DB
    const isUsingRealDb = localStorage.getItem('dev_use_real_db') === 'true';
    setUsingRealDb(isUsingRealDb);
    
    // Add keyboard shortcut (Ctrl+Shift+T) to toggle the panel
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'T') {
        event.preventDefault();
        setIsVisible(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Only render in development mode
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  // Create a new tenant
  const handleCreateNewTenant = (prefix = 'tenant') => {
    const newTenantId = createNewTenantId(prefix);
    setCurrentTenantId(newTenantId);
    setMessage(`Created new tenant ID: ${newTenantId}`);
    
    // Clear message after 3 seconds
    setTimeout(() => setMessage(''), 3000);
  };
  
  // Set custom tenant ID
  const handleSetCustomTenant = () => {
    if (!customTenantId.trim()) {
      setMessage('Please enter a tenant ID');
      return;
    }
    
    setDevTenantId(customTenantId);
    setCurrentTenantId(customTenantId);
    setMessage(`Set tenant ID to: ${customTenantId}`);
    setCustomTenantId('');
    
    // Clear message after 3 seconds
    setTimeout(() => setMessage(''), 3000);
  };
  
  // Toggle between real and mock DB
  const toggleDatabase = () => {
    const newValue = !usingRealDb;
    localStorage.setItem('dev_use_real_db', newValue ? 'true' : 'false');
    setUsingRealDb(newValue);
    setMessage(`${newValue ? 'Enabled' : 'Disabled'} real database. Refresh to apply.`);
  };
  
  // If not visible, just show a small button
  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 bg-blue-500 text-white text-xs px-2 py-1 rounded shadow opacity-60 hover:opacity-100"
      >
        🔧 Dev
      </button>
    );
  }
  
  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-lg shadow-lg max-w-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Developer Tenant Controls
        </h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-gray-500"
        >
          ✕
        </button>
      </div>
      
      <div className="mb-4">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current Tenant ID:</div>
        <div className="text-sm font-mono p-1 bg-gray-100 dark:bg-gray-700 rounded">
          {currentTenantId}
        </div>
      </div>
      
      <div className="space-y-2">
        <button
          onClick={() => handleCreateNewTenant()}
          className="text-xs bg-green-500 text-white py-1 px-2 rounded hover:bg-green-600 w-full"
        >
          Create New Tenant ID
        </button>
        
        <div className="flex gap-2">
          <input
            type="text"
            value={customTenantId}
            onChange={(e) => setCustomTenantId(e.target.value)}
            placeholder="Custom tenant ID"
            className="text-xs flex-1 border border-gray-300 dark:border-gray-600 rounded px-2 py-1"
          />
          <button
            onClick={handleSetCustomTenant}
            className="text-xs bg-blue-500 text-white py-1 px-2 rounded hover:bg-blue-600"
          >
            Set
          </button>
        </div>
        
        <div className="flex items-center gap-2 mt-2">
          <div className="text-xs text-gray-600 dark:text-gray-300">Using Real Database:</div>
          <div 
            className={`w-8 h-4 rounded-full ${usingRealDb ? 'bg-green-500' : 'bg-gray-300'} cursor-pointer relative transition-colors`}
            onClick={toggleDatabase}
          >
            <div 
              className={`absolute w-3 h-3 rounded-full bg-white top-0.5 ${usingRealDb ? 'right-0.5' : 'left-0.5'} transition-all`}
            />
          </div>
        </div>
      </div>
      
      {message && (
        <div className="mt-2 text-xs text-green-600 dark:text-green-400">
          {message}
        </div>
      )}
      
      <div className="mt-2 text-xs text-gray-400 italic">
        Press Ctrl+Shift+T to toggle this panel
      </div>
    </div>
  );
} 