'use client';


import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import CustomerForm from '@/app/(app)/dashboard/components/forms/CustomerForm';
import CustomerList from '@/app/dashboard/components/lists/CustomerList';
import CustomerDetails from '@/app/(app)/dashboard/components/forms/CustomerDetails';
import DashboardWrapper from '@/app/dashboard/DashboardWrapper';
import { logger } from '@/utils/logger';

/**
 * Tenant-specific customer management page
 * This is used when accessing the dashboard with a tenant ID in the URL
 */
export default function TenantCustomersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tenantId } = useParams();
  const [activeTab, setActiveTab] = useState('list');
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const listRefreshKey = useRef(0);

  // On mount, check URL params for initial state
  useEffect(() => {
    const tab = searchParams.get('tab');
    const customerId = searchParams.get('id');
    const editMode = searchParams.get('edit') === 'true';
    
    if (tab) {
      setActiveTab(tab);
    }
    
    if (customerId) {
      setSelectedCustomerId(customerId);
      setActiveTab('details');
    }

    logger.info(`[TenantCustomersPage] Initialized with tenant ID: ${tenantId}, tab: ${tab || 'list'}`);
  }, [searchParams, tenantId]);

  // When changing tabs, check if we need to refresh the list
  useEffect(() => {
    if (activeTab === 'list' && needsRefresh) {
      // Increment refresh key to force the component to refresh
      listRefreshKey.current += 1;
      setNeedsRefresh(false);
    }
  }, [activeTab, needsRefresh]);

  // Update URL params while preserving the tenant ID in the URL
  const updateUrlParams = (tab, id = null) => {
    const params = new URLSearchParams();
    params.set('tab', tab);
    if (id) {
      params.set('id', id);
    }
    
    // Update URL without full navigation, keeping the tenant ID
    window.history.pushState({}, '', `/${tenantId}/dashboard/customers?${params.toString()}`);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    updateUrlParams(tab, tab === 'details' ? selectedCustomerId : null);
  };

  const handleCreateCustomer = () => {
    setActiveTab('add');
    updateUrlParams('add');
  };

  const handleCustomerSelect = (customerId) => {
    setSelectedCustomerId(customerId);
    setActiveTab('details');
    updateUrlParams('details', customerId);
  };

  const handleBackToList = () => {
    setActiveTab('list');
    setNeedsRefresh(true);
    updateUrlParams('list');
  };

  const handleCustomerCreated = (newCustomer) => {
    logger.info('[TenantCustomersPage] New customer created:', newCustomer);
    setNeedsRefresh(true);
    setActiveTab('list');
    updateUrlParams('list');
  };

  const renderTabContent = () => {
    const editMode = searchParams.get('edit') === 'true';
    
    switch (activeTab) {
      case 'add':
        return (
          <CustomerForm 
            mode="create" 
            onBackToList={handleBackToList} 
            onCustomerCreated={handleCustomerCreated}
          />
        );
      case 'details':
        return selectedCustomerId ? 
          <CustomerDetails 
            customerId={selectedCustomerId} 
            onBackToList={handleBackToList} 
            isEditing={editMode}
          /> : 
          <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700">
            Please select a customer to view details
          </div>;
      case 'list':
      default:
        return (
          <CustomerList 
            key={`customer-list-${listRefreshKey.current}`}
            onCreateCustomer={handleCreateCustomer} 
            onCustomerSelect={handleCustomerSelect}
            refreshTrigger={listRefreshKey.current}
          />
        );
    }
  };

  return (
    <DashboardWrapper tenantId={tenantId}>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Customer Management</h1>
          <button
            onClick={handleCreateCustomer}
            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Customer
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-300 mb-6 bg-white shadow-sm rounded-t-lg">
          <nav className="flex -mb-px max-w-4xl mx-auto">
            <button 
              onClick={() => handleTabChange('list')} 
              className={`py-4 px-8 text-center border-b-2 font-medium text-md transition-colors duration-200 ease-in-out focus:outline-none flex items-center gap-2 ${
                activeTab === 'list' 
                  ? 'text-blue-600 border-blue-600 bg-blue-50' 
                  : 'text-gray-600 border-transparent hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              List Customers
            </button>
            <button 
              onClick={() => handleTabChange('add')} 
              className={`py-4 px-8 text-center border-b-2 font-medium text-md transition-colors duration-200 ease-in-out focus:outline-none flex items-center gap-2 ${
                activeTab === 'add' 
                  ? 'text-blue-600 border-blue-600 bg-blue-50' 
                  : 'text-gray-600 border-transparent hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Customer
            </button>
            <button 
              onClick={() => selectedCustomerId && handleTabChange('details')} 
              className={`py-4 px-8 text-center border-b-2 font-medium text-md transition-colors duration-200 ease-in-out focus:outline-none flex items-center gap-2 ${
                activeTab === 'details' 
                  ? 'text-blue-600 border-blue-600 bg-blue-50' 
                  : 'text-gray-600 border-transparent hover:text-gray-700 hover:border-gray-300'
              } ${!selectedCustomerId ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!selectedCustomerId}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
              Customer Details
              {selectedCustomerId && (
                <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                  Selected
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {renderTabContent()}
        </div>
      </div>
    </DashboardWrapper>
  );
} 