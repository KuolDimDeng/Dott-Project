'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  getMemoryUsage, 
  trackMemory, 
  detectMemoryLeaks, 
  clearMemoryHistory 
} from '@/utils/memoryDebugger';

/**
 * Memory Debugger Component
 * 
 * This component provides a UI for monitoring memory usage in the application.
 * It can be added to any page to help identify memory leaks and performance issues.
 * 
 * Usage:
 * import MemoryDebugger from '@/components/Debug/MemoryDebugger';
 * 
 * // Then in your component:
 * {process.env.NODE_ENV === 'development' && <MemoryDebugger />}
 */
const MemoryDebugger = ({ pollInterval = 5000 }) => {
  const [memoryData, setMemoryData] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [leaks, setLeaks] = useState([]);
  const intervalRef = useRef(null);
  
  // Initialize memory monitoring
  useEffect(() => {
    // Only run in development mode
    if (process.env.NODE_ENV !== 'development') return;
    
    // Get initial memory data
    updateMemoryData();
    
    // Set up polling interval
    intervalRef.current = setInterval(() => {
      updateMemoryData();
    }, pollInterval);
    
    // Track component mount
    trackMemory('MemoryDebugger', 'mount');
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Track component unmount
      trackMemory('MemoryDebugger', 'unmount');
    };
  }, [pollInterval]);
  
  // Update memory data
  const updateMemoryData = () => {
    const memory = getMemoryUsage();
    if (memory) {
      setMemoryData(memory);
      trackMemory('MemoryDebugger', 'update');
    }
  };
  
  // Check for memory leaks
  const checkForLeaks = () => {
    const detectedLeaks = detectMemoryLeaks();
    setLeaks(detectedLeaks);
    
    if (detectedLeaks.length > 0) {
      console.warn('[Memory] Potential memory leaks detected:', detectedLeaks);
    } else {
      console.log('[Memory] No memory leaks detected');
    }
  };
  
  // If not in development mode or memory API is not available
  if (process.env.NODE_ENV !== 'development' || !memoryData) {
    return null;
  }
  
  // Calculate memory usage percentage
  const memoryPercentage = parseFloat(memoryData.percentUsed);
  const memoryColor = memoryPercentage > 80 ? '#ff4d4f' : 
                      memoryPercentage > 60 ? '#faad14' : '#52c41a';
  
  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '10px', 
      right: '10px', 
      zIndex: 9999,
      backgroundColor: '#f8f9fa',
      padding: '10px',
      borderRadius: '5px',
      border: '1px solid #d9d9d9',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
      width: expanded ? '300px' : '120px',
      transition: 'width 0.3s ease',
      fontFamily: 'monospace',
      fontSize: '12px'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '5px'
      }}>
        <div style={{ fontWeight: 'bold' }}>Memory Monitor</div>
        <button 
          onClick={() => setExpanded(!expanded)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '12px',
            color: '#1890ff'
          }}
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>
      
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: expanded ? '10px' : '0'
      }}>
        <div style={{ 
          width: '100%', 
          height: '10px', 
          backgroundColor: '#f0f0f0',
          borderRadius: '5px',
          overflow: 'hidden'
        }}>
          <div style={{ 
            width: `${memoryPercentage}%`, 
            height: '100%', 
            backgroundColor: memoryColor,
            transition: 'width 0.5s ease'
          }} />
        </div>
        <div style={{ marginLeft: '5px', whiteSpace: 'nowrap' }}>
          {memoryData.percentUsed}
        </div>
      </div>
      
      {expanded && (
        <>
          <div style={{ marginTop: '10px' }}>
            <div>Used: {memoryData.usedJSHeapSize}</div>
            <div>Total: {memoryData.totalJSHeapSize}</div>
            <div>Limit: {memoryData.jsHeapSizeLimit}</div>
          </div>
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginTop: '10px' 
          }}>
            <button 
              onClick={checkForLeaks}
              style={{
                backgroundColor: '#1890ff',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                padding: '5px 10px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Check Leaks
            </button>
            
            <button 
              onClick={clearMemoryHistory}
              style={{
                backgroundColor: '#ff4d4f',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                padding: '5px 10px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Clear History
            </button>
          </div>
          
          {leaks.length > 0 && (
            <div style={{ 
              marginTop: '10px', 
              maxHeight: '100px', 
              overflowY: 'auto',
              border: '1px solid #faad14',
              padding: '5px',
              backgroundColor: '#fffbe6'
            }}>
              <div style={{ fontWeight: 'bold', color: '#fa8c16' }}>
                Potential Memory Leaks:
              </div>
              {leaks.map((leak, index) => (
                <div key={index} style={{ marginTop: '5px' }}>
                  <div>{leak.component}: {leak.increase}</div>
                  <div style={{ fontSize: '10px' }}>
                    {leak.firstMemory} → {leak.lastMemory}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MemoryDebugger;