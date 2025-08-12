'use client';

import React, { useState, useEffect } from 'react';
import { performanceMonitor, buildHealthMonitor } from '@/utils/monitoring';

/**
 * Performance Monitoring Dashboard
 * Real-time performance metrics for production
 */
const PerformanceDashboard = () => {
  const [metrics, setMetrics] = useState({
    memory: null,
    buildHealth: null,
    bundleSize: null,
    apiCalls: [],
    slowComponents: [],
  });

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development or for admins
    const isDev = process.env.NODE_ENV === 'development';
    const isAdmin = window.localStorage.getItem('isAdmin') === 'true';
    
    if (isDev || isAdmin) {
      // Update metrics
      const updateMetrics = () => {
        setMetrics(prev => ({
          ...prev,
          memory: performanceMonitor.trackMemoryUsage(),
          buildHealth: buildHealthMonitor.checkArchitecture(),
          bundleSize: buildHealthMonitor.trackBundleSize(),
        }));
      };

      updateMetrics();
      const interval = setInterval(updateMetrics, 5000); // Every 5 seconds

      return () => clearInterval(interval);
    }
  }, []);

  // Toggle with keyboard shortcut (Ctrl+Shift+P)
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (!isVisible || !metrics.buildHealth) return null;

  const memoryUsagePercent = metrics.memory 
    ? (metrics.memory.usedJSHeapSize / metrics.memory.jsHeapSizeLimit) * 100 
    : 0;

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-xl z-50 max-w-md">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold">Performance Monitor</h3>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          ×
        </button>
      </div>

      {/* Memory Usage */}
      {metrics.memory && (
        <div className="mb-3">
          <div className="text-xs text-gray-400 mb-1">Memory Usage</div>
          <div className="bg-gray-800 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-full transition-all ${
                memoryUsagePercent > 80 ? 'bg-red-500' : 
                memoryUsagePercent > 60 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${memoryUsagePercent}%` }}
            />
          </div>
          <div className="text-xs mt-1">
            {metrics.memory.usedJSHeapSize}MB / {metrics.memory.jsHeapSizeLimit}MB
          </div>
        </div>
      )}

      {/* Build Health */}
      <div className="mb-3">
        <div className="text-xs text-gray-400 mb-1">Build Health</div>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            metrics.buildHealth.status === 'healthy' ? 'bg-green-500' :
            metrics.buildHealth.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
          }`} />
          <span className="text-xs">
            {metrics.buildHealth.healthScore}% - {metrics.buildHealth.status}
          </span>
        </div>
        <div className="mt-1 space-y-1">
          {Object.entries(metrics.buildHealth.checks).map(([key, value]) => (
            <div key={key} className="flex items-center text-xs">
              <span className={value ? 'text-green-400' : 'text-red-400'}>
                {value ? '✓' : '✗'}
              </span>
              <span className="ml-1 text-gray-400">{key}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bundle Size */}
      {metrics.bundleSize && (
        <div className="mb-3">
          <div className="text-xs text-gray-400 mb-1">Bundle Size</div>
          <div className="text-sm font-mono">{metrics.bundleSize.sizeMB}MB</div>
        </div>
      )}

      <div className="text-xs text-gray-500 mt-2">
        Press Ctrl+Shift+P to toggle
      </div>
    </div>
  );
};

export default PerformanceDashboard;