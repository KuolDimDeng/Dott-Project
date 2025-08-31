'use client';

import React, { useState, useEffect } from 'react';
import { getInteractionButtonText, getInteractionStatsLabel } from '@/utils/businessInteractionHelpers';
import BusinessSearch from './BusinessSearch';
import ConsumerOrders from './ConsumerOrders';

export default function MarketplaceDashboard() {
  const [activeTab, setActiveTab] = useState('search');
  const [businessType, setBusinessType] = useState('other');
  
  useEffect(() => {
    // Get business type from localStorage or API
    const storedType = localStorage.getItem('businessType');
    if (storedType) {
      setBusinessType(storedType);
    }
  }, []);
  
  const interactionText = getInteractionButtonText(businessType);
  
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Discover</h1>
        <p className="text-gray-600 mt-2">
          Find businesses, book services, order products, and connect with local providers
        </p>
      </div>
      
      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('search')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'search'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <span>Search Businesses</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'orders'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>My {interactionText}</span>
              </div>
            </button>
          </nav>
        </div>
        
        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'search' && <BusinessSearch />}
          {activeTab === 'orders' && <ConsumerOrders />}
        </div>
      </div>
    </div>
  );
}