'use client';

import React, { useState, useEffect } from 'react';
import { getInteractionButtonText, getInteractionStatsLabel } from '@/utils/businessInteractionHelpers';

export default function ConsumerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [businessType, setBusinessType] = useState('other');
  
  useEffect(() => {
    // Get business type from localStorage or API
    const storedType = localStorage.getItem('businessType');
    if (storedType) {
      setBusinessType(storedType);
    }
    fetchOrders();
  }, []);
  
  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/marketplace/consumer-orders');
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const interactionText = getInteractionButtonText(businessType);
  const statsLabel = getInteractionStatsLabel(businessType);
  
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My {interactionText}</h1>
        <p className="text-gray-600 mt-2">
          View and manage your {interactionText.toLowerCase()} from the marketplace
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">{statsLabel}</h2>
        </div>
        
        {loading ? (
          <div className="p-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" 
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No {interactionText.toLowerCase()} yet
            </h3>
            <p className="text-gray-500">
              Your {interactionText.toLowerCase()} from the marketplace will appear here
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {orders.map((order, index) => (
              <div key={order.id || index} className="p-6 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {order.businessName}
                    </h3>
                    <p className="text-gray-600 mt-1">
                      {order.description || `${interactionText.slice(0, -1)} #${order.referenceNumber}`}
                    </p>
                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                      <span>Date: {new Date(order.createdAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>Status: {order.status}</span>
                      <span>•</span>
                      <span>Total: ${order.totalAmount}</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded">
                      View Details
                    </button>
                    <button className="px-3 py-1 text-sm text-green-600 hover:bg-green-50 rounded">
                      Contact
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}