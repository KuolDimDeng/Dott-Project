'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  getMemoryUsage,
  detectMemoryLeaks,
  clearMemoryHistory,
  disposeAll
} from '@/utils/memoryManager';

/**
 * Memory Debugger Component
 * 
 * Add this component to any page to monitor memory usage:
 * import MemoryDebug from '@/components/Debug/MemoryDebug';
 * 
 * <MemoryDebug />
 */
const MemoryDebug = ({ pollInterval = 5000 }) => {
  const [memoryData, setMemoryData] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [leaks, setLeaks] = useState([]);
  const intervalRef = useRef(null);
  const [history, setHistory] = useState([]);
  
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
      
      // Update history for simple chart
      setHistory(prev => {
        const newHistory = [...prev, {
          time: new Date().toLocaleTimeString(),
          percentage: memory.usagePercentage
        }];
        
        // Keep only the last 10 entries
        if (newHistory.length > 10) {
          return newHistory.slice(-10);
        }
        return newHistory;
      });
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
  
  // Clear memory history
  const handleClearHistory = () => {
    clearMemoryHistory();
    setLeaks([]);
    console.log('[Memory] History cleared');
  };
  
  // Attempt to force garbage collection
  const forceGC = () => {
    if (window.gc) {
      try {
        window.gc();
        console.log('[Memory] Forced garbage collection');
        setTimeout(updateMemoryData, 500); // Update after GC
      } catch (e) {
        console.error('[Memory] Failed to perform garbage collection:', e);
      }
    } else {
      console.log('[Memory] gc() not available. Start with --expose-gc flag.');
    }
  };
  
  // Clean up resources
  const cleanupResources = () => {
    disposeAll();
    console.log('[Memory] Disposable resources cleaned up');
    setTimeout(updateMemoryData, 500);
  };
  
  // If memory API is not available
  if (!memoryData) {
    return (
      <div style={{ 
        position: 'fixed', 
        bottom: '10px', 
        right: '10px',
        padding: '10px',
        background: '#f8d7da',
        borderRadius: '4px',
        color: '#721c24',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        zIndex: 9999,
        fontSize: '12px',
        lineHeight: 1.4
      }}>
        Memory monitoring not available.
        <br />
        Try Chrome with --enable-precise-memory-info flag.
      </div>
    );
  }
  
  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '10px', 
      right: '10px',
      padding: '10px',
      background: '#fff',
      borderRadius: '4px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
      zIndex: 9999,
      fontSize: '12px',
      width: expanded ? '300px' : 'auto',
      transition: 'width 0.3s ease'
    }}>
      <div style={{ 
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: expanded ? '10px' : '0',
        cursor: 'pointer'
      }} onClick={() => setExpanded(!expanded)}>
        <div style={{ fontWeight: 'bold' }}>
          Memory: {memoryData.usedJSHeapSize} ({memoryData.usagePercentage}%)
        </div>
        <div style={{ 
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.3s ease'
        }}>▼</div>
      </div>
      
      {expanded && (
        <>
          <div style={{ fontSize: '11px', marginBottom: '8px' }}>
            <div>Heap Limit: {memoryData.jsHeapSizeLimit}</div>
            <div>Total Heap: {memoryData.totalJSHeapSize}</div>
          </div>
          
          {/* Simple memory usage chart */}
          <div style={{ 
            height: '40px', 
            border: '1px solid #ddd',
            display: 'flex',
            alignItems: 'flex-end',
            marginBottom: '8px'
          }}>
            {history.map((entry, index) => (
              <div 
                key={index}
                style={{ 
                  height: `${entry.percentage}%`,
                  width: `${100 / history.length}%`,
                  backgroundColor: entry.percentage > 80 ? '#dc3545' : 
                                  entry.percentage > 60 ? '#ffc107' : '#28a745',
                  transition: 'height 0.5s ease'
                }}
                title={`${entry.time}: ${entry.percentage}%`}
              />
            ))}
          </div>
          
          <div style={{ 
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '8px'
          }}>
            <button 
              onClick={(e) => { e.stopPropagation(); checkForLeaks(); }}
              style={{ 
                padding: '4px 8px',
                fontSize: '11px',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Check Leaks
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); forceGC(); }}
              style={{ 
                padding: '4px 8px',
                fontSize: '11px',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Force GC
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleClearHistory(); }}
              style={{ 
                padding: '4px 8px',
                fontSize: '11px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Clear
            </button>
          </div>
          
          <button 
            onClick={(e) => { e.stopPropagation(); cleanupResources(); }}
            style={{ 
              padding: '4px 8px',
              fontSize: '11px',
              width: '100%',
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginBottom: '8px'
            }}
          >
            Clean Resources
          </button>
          
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
                <div key={index} style={{ marginTop: '5px', fontSize: '10px' }}>
                  <div>{leak.component}: {leak.increase}</div>
                  <div>{leak.firstMemory} → {leak.lastMemory}</div>
                  <div>{leak.timePeriod}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MemoryDebug; 