'use client';

import React, { useEffect } from 'react';
import OptimizedInventoryList from '../components/OptimizedInventoryList';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import { optimizedInventoryService } from '@/services/optimizedInventoryService';

/**
 * Optimized Inventory Page
 * This page uses the optimized inventory components and services
 * for better performance and user experience
 */
export default function OptimizedInventoryPage() {
  const router = useRouter();

  // Prefetch data when the page loads
  useEffect(() => {
    logger.info('Initializing optimized inventory page');
    
    // Prefetch product data in the background
    optimizedInventoryService.prefetchProducts().catch(error => {
      logger.warn('Failed to prefetch product data:', error);
    });
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="p-6 mb-6 rounded-lg shadow-md bg-gradient-to-r from-purple-900 to-purple-700">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Optimized Inventory Management
            </h1>
            <p className="text-white mt-2 opacity-90">
              Enhanced performance with optimized backend and frontend
            </p>
          </div>
          <button
            className="bg-purple-200 hover:bg-purple-300 text-purple-900 font-bold py-2 px-4 rounded inline-flex items-center"
            onClick={() => router.push('/inventory')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Standard View
          </button>
        </div>
      </div>

      {/* Information alert */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              About Optimized Inventory
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                This page uses optimized endpoints and advanced caching strategies for better performance.
                It includes features like progressive loading, stale-while-revalidate caching, and offline support.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance features */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { title: 'Lightweight API', description: 'Optimized endpoints return only essential data' },
          { title: 'Progressive Loading', description: 'Load basic data first, then details as needed' },
          { title: 'Smart Caching', description: 'Stale-while-revalidate strategy for faster loading' },
          { title: 'Offline Support', description: 'Continue working even when offline' }
        ].map((feature, index) => (
          <div key={index} className="bg-white p-4 rounded shadow-md border-l-4 border-purple-700">
            <h3 className="text-lg font-bold">{feature.title}</h3>
            <p className="text-sm text-gray-600">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* Main inventory component */}
      <OptimizedInventoryList />
    </div>
  );
}