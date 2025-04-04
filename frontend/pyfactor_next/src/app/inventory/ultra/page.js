'use client';

import React, { useEffect } from 'react';
import UltraOptimizedInventoryList from '../components/UltraOptimizedInventoryList';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import { ultraOptimizedInventoryService } from '@/services/ultraOptimizedInventoryService';

/**
 * Ultra-Optimized Inventory Page
 * This page uses the ultra-optimized inventory components and services
 * for maximum performance and user experience
 */
export default function UltraOptimizedInventoryPage() {
  const router = useRouter();

  // Prefetch data when the page loads
  useEffect(() => {
    logger.info('Initializing ultra-optimized inventory page');
    
    // Prefetch essential data in the background
    ultraOptimizedInventoryService.prefetchEssentialData().catch(error => {
      logger.warn('Failed to prefetch essential data:', error);
    });
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="p-6 mb-6 rounded-lg shadow-lg bg-gradient-to-r from-indigo-900 to-indigo-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              Ultra-Optimized Inventory
            </h1>
            <p className="text-white mt-2 opacity-90">
              Maximum performance with ultra-optimized backend and frontend
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              className="bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-4 rounded inline-flex items-center"
              onClick={() => router.push('/inventory/optimized')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Optimized View
            </button>
            <button
              className="border border-white text-white hover:bg-white hover:bg-opacity-10 font-medium py-2 px-4 rounded inline-flex items-center"
              onClick={() => router.push('/inventory')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Standard View
            </button>
          </div>
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
              About Ultra-Optimized Inventory
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                This page uses ultra-optimized endpoints and advanced caching strategies for maximum performance.
                It includes features like progressive loading, stale-while-revalidate caching, offline support, and more.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance features */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { 
            title: 'Ultra-Lightweight API', 
            description: 'Minimal data transfer with only essential fields' 
          },
          { 
            title: 'Advanced Caching', 
            description: 'Stale-while-revalidate pattern with tiered TTLs' 
          },
          { 
            title: 'Progressive Loading', 
            description: 'Load critical data first, then enhance with details' 
          },
          { 
            title: 'Offline Support', 
            description: 'Continue working even when offline' 
          },
          { 
            title: 'Prefetching', 
            description: 'Preload data during browser idle time' 
          },
          { 
            title: 'Optimized Rendering', 
            description: 'Lazy loading and code splitting for faster UI' 
          },
          { 
            title: 'Database Optimizations', 
            description: 'Specialized indexes and query optimizations' 
          },
          { 
            title: 'Adaptive View Modes', 
            description: 'Choose between ultra-fast, standard, or detailed views' 
          }
        ].map((feature, index) => (
          <div key={index} className="bg-white p-4 rounded shadow-md border-l-4 border-indigo-700">
            <h3 className="text-lg font-bold">{feature.title}</h3>
            <p className="text-sm text-gray-600">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* Performance comparison */}
      <div className="bg-white p-6 mb-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-800 mb-3 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Performance Comparison
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          The ultra-optimized inventory system offers significant performance improvements over the standard implementation:
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="font-semibold text-blue-600 mb-2">Standard Implementation</h3>
            <div className="border-b border-gray-200 mb-2"></div>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 30-second API timeout</li>
              <li>• Full data serialization</li>
              <li>• Basic caching</li>
              <li>• No offline support</li>
              <li>• No prefetching</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-purple-600 mb-2">Optimized Implementation</h3>
            <div className="border-b border-gray-200 mb-2"></div>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 15-second API timeout</li>
              <li>• Lightweight serialization</li>
              <li>• Redis caching (5 min TTL)</li>
              <li>• Basic offline support</li>
              <li>• Simple prefetching</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold text-green-600 mb-2">Ultra-Optimized Implementation</h3>
            <div className="border-b border-gray-200 mb-2"></div>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 5-second API timeout</li>
              <li>• Ultra-lightweight serialization</li>
              <li>• Tiered caching with stale-while-revalidate</li>
              <li>• Full offline support</li>
              <li>• Intelligent prefetching</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Main inventory component */}
      <UltraOptimizedInventoryList />
    </div>
  );
}