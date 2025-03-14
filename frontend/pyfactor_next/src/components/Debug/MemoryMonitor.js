'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Paper, Button, CircularProgress } from '@mui/material';
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
      <Paper 
        sx={{ 
          p: 2, 
          m: 2, 
          backgroundColor: '#f5f5f5',
          border: '1px solid #e0e0e0',
          borderRadius: 2
        }}
      >
        <Typography variant="body2" color="error">
          Memory monitoring not available in this browser.
          Try Chrome with --enable-precise-memory-info flag.
        </Typography>
      </Paper>
    );
  }
  
  // Calculate memory usage percentage
  const memoryPercentage = parseFloat(memoryData.percentUsed);
  const memoryColor = memoryPercentage > 80 ? 'error' : memoryPercentage > 60 ? 'warning' : 'success';
  
  return (
    <Paper 
      sx={{ 
        p: 2, 
        m: 2, 
        backgroundColor: '#f8f9fa',
        border: '1px solid #e0e0e0',
        borderRadius: 2,
        position: 'fixed',
        bottom: 0,
        right: 0,
        zIndex: 9999,
        maxWidth: expanded ? 400 : 200,
        transition: 'max-width 0.3s ease'
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2" fontWeight="bold">Memory Monitor</Typography>
        <Button 
          size="small" 
          variant="outlined" 
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Collapse' : 'Expand'}
        </Button>
      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
        <CircularProgress 
          variant="determinate" 
          value={memoryPercentage} 
          color={memoryColor}
          size={24}
          sx={{ mr: 1 }}
        />
        <Typography variant="body2">
          {memoryData.usedJSHeapSize} / {memoryData.jsHeapSizeLimit} ({memoryData.percentUsed})
        </Typography>
      </Box>
      
      {expanded && (
        <>
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            Memory History ({memoryHistory.length} samples)
          </Typography>
          
          <Box sx={{ 
            height: 60, 
            display: 'flex', 
            alignItems: 'flex-end',
            borderBottom: '1px solid #e0e0e0',
            mt: 1
          }}>
            {memoryHistory.map((entry, index) => {
              // Extract numeric value from memory string
              const memValue = parseFloat(entry.usedJSHeapSize);
              const percentage = isNaN(memValue) ? 0 : memValue / parseFloat(entry.jsHeapSizeLimit) * 100;
              
              // Determine color based on percentage
              const barColor = percentage > 80 ? '#f44336' : percentage > 60 ? '#ff9800' : '#4caf50';
              
              return (
                <Box 
                  key={index}
                  sx={{
                    width: `${100 / maxSamples}%`,
                    height: `${Math.min(percentage, 100)}%`,
                    backgroundColor: barColor,
                    mx: 0.1
                  }}
                  title={`${entry.usedJSHeapSize} (${percentage.toFixed(2)}%)`}
                />
              );
            })}
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
            <Button 
              size="small" 
              variant="outlined" 
              onClick={getTrackingData}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Analyze Memory'}
            </Button>
            
            <Button 
              size="small" 
              variant="outlined" 
              color="error"
              onClick={clearTracking}
            >
              Clear Data
            </Button>
          </Box>
        </>
      )}
    </Paper>
  );
};

export default MemoryMonitor;