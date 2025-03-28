'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getMemoryUsage, getMemoryTracking, clearMemoryTracking } from '@/utils/memoryDebug';

/**
 * Memory Monitor Component
 * 
 * This component displays real-time memory usage information and helps
 * identify memory leaks and spikes in the application.
 * 
 * Usage:
 * Import and add to any page where you want to monitor memory:
 * <MemoryMonitor />
 */
const MemoryMonitor = ({ pollInterval = 2000, maxSamples = 20 }) => {
  const [memoryData, setMemoryData] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [memoryHistory, setMemoryHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef(null);
  
  // Initialize memory monitoring
  useEffect(() => {
    // Get initial memory data
    updateMemoryData();
    
    // Set up polling interval
    intervalRef.current = setInterval(() => {
      updateMemoryData();
    }, pollInterval);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [pollInterval]);
  
  // Update memory data
  const updateMemoryData = () => {
    const memory = getMemoryUsage();
    if (memory) {
      setMemoryData(memory);
      
      // Update history
      setMemoryHistory(prev => {
        const newHistory = [...prev, {
          timestamp: new Date().toISOString(),
          ...memory
        }];
        
        // Keep only the last maxSamples
        if (newHistory.length > maxSamples) {
          return newHistory.slice(-maxSamples);
        }
        return newHistory;
      });
    }
  };
  
  // Get memory tracking data
  const getTrackingData = () => {
    setLoading(true);
    
    try {
      const trackingData = getMemoryTracking();
      console.table(trackingData);
      
      // Find potential memory leaks (components with consistently increasing memory)
      const componentGroups = {};
      
      trackingData.forEach(entry => {
        if (!componentGroups[entry.component]) {
          componentGroups[entry.component] = [];
        }
        componentGroups[entry.component].push(entry);
      });
      
      // Log potential memory leaks
      Object.entries(componentGroups).forEach(([component, entries]) => {
        if (entries.length > 3) {
          const firstEntry = entries[0];
          const lastEntry = entries[entries.length - 1];
          
          // Extract numeric values from memory strings
          const firstMemory = parseFloat(firstEntry.usedJSHeapSize);
          const lastMemory = parseFloat(lastEntry.usedJSHeapSize);
          
          if (!isNaN(firstMemory) && !isNaN(lastMemory) && lastMemory > firstMemory) {
            const increase = ((lastMemory - firstMemory) / firstMemory) * 100;
            
            if (increase > 10) {
              console.warn(`Potential memory leak in ${component}: ${increase.toFixed(2)}% increase`);
            }
          }
        }
      });
    } catch (error) {
      console.error('Error getting memory tracking data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Clear memory tracking data
  const clearTracking = () => {
    clearMemoryTracking();
    console.log('Memory tracking data cleared');
  };
  
  // If memory API is not available
  if (!memoryData) {
    return (
      <div className="p-4 m-4 bg-gray-100 border border-gray-200 rounded-lg">
        <p className="text-sm text-red-500">
          Memory monitoring not available in this browser.
          Try Chrome with --enable-precise-memory-info flag.
        </p>
      </div>
    );
  }
  
  // Calculate memory usage percentage
  const memoryPercentage = parseFloat(memoryData.percentUsed);
  const memoryColorClass = memoryPercentage > 80 ? 'text-red-500' : memoryPercentage > 60 ? 'text-amber-500' : 'text-green-500';
  
  return (
    <div className={`p-4 m-4 bg-gray-50 border border-gray-200 rounded-lg fixed bottom-0 right-0 z-50 ${expanded ? 'w-96' : 'w-48'} transition-all duration-300`}>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-bold">Memory Monitor</h3>
        <button 
          className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>
      
      <div className="flex items-center mb-2">
        <div className="relative mr-2 w-6 h-6">
          <svg className="w-6 h-6" viewBox="0 0 36 36">
            <path
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#e5e5e5"
              strokeWidth="3"
            />
            <path
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke={memoryPercentage > 80 ? '#ef4444' : memoryPercentage > 60 ? '#f59e0b' : '#22c55e'}
              strokeWidth="3"
              strokeDasharray={`${memoryPercentage}, 100`}
              strokeLinecap="round"
            />
          </svg>
        </div>
        <span className={`text-xs ${memoryColorClass}`}>
          {memoryData.usedJSHeapSize} / {memoryData.jsHeapSizeLimit} ({memoryData.percentUsed})
        </span>
      </div>
      
      {expanded && (
        <>
          <p className="text-xs mt-2 text-gray-500">
            Memory History ({memoryHistory.length} samples)
          </p>
          
          <div className="h-16 flex items-end border-b border-gray-200 mt-2">
            {memoryHistory.map((entry, index) => {
              // Extract numeric value from memory string
              const memValue = parseFloat(entry.usedJSHeapSize);
              const percentage = isNaN(memValue) ? 0 : memValue / parseFloat(entry.jsHeapSizeLimit) * 100;
              
              // Determine color based on percentage
              const barColor = percentage > 80 ? 'bg-red-500' : percentage > 60 ? 'bg-amber-500' : 'bg-green-500';
              
              return (
                <div 
                  key={index}
                  className={`${barColor} mx-[1px]`}
                  style={{
                    width: `${100 / maxSamples}%`,
                    height: `${Math.min(percentage, 100)}%`
                  }}
                  title={`${entry.usedJSHeapSize} (${percentage.toFixed(2)}%)`}
                />
              );
            })}
          </div>
          
          <div className="flex justify-between mt-4">
            <button 
              className={`px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={getTrackingData}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Analyze Memory'}
            </button>
            
            <button 
              className="px-2 py-1 text-xs border border-red-300 text-red-500 rounded hover:bg-red-50"
              onClick={clearTracking}
            >
              Clear Data
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default MemoryMonitor;