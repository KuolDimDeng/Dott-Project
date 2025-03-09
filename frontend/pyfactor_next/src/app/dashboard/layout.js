'use client';

// In /app/dashboard/layout.js
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { logger } from '@/utils/logger';

// Dynamically import the ReactErrorDebugger to avoid SSR issues
const ReactErrorDebugger = dynamic(
  () => import('@/components/Debug/ReactErrorDebugger'),
  {
    ssr: false,
    loading: () => null
  }
);

export default function DashboardLayout({ children }) {
    const [showDebugger, setShowDebugger] = useState(false);
    
    // Disable the debugger by default
    useEffect(() => {
        // Force disable the debugger
        setShowDebugger(false);
        localStorage.setItem('enableReactDebugger', 'false');
        
        // Still allow keyboard shortcut to enable it if needed
        const handleKeyDown = (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                setShowDebugger(prev => {
                    const newValue = !prev;
                    localStorage.setItem('enableReactDebugger', newValue.toString());
                    logger.debug(`[DashboardLayout] ${newValue ? 'Enabling' : 'Disabling'} React error debugger`);
                    return newValue;
                });
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
    
    // Add error boundary to catch any rendering errors
    useEffect(() => {
        // Set up global error handler for React errors
        const originalError = console.error;
        console.error = (...args) => {
            // Check if this is a React error
            const errorString = args.join(' ');
            if (errorString.includes('render is not a function')) {
                logger.error('[DashboardLayout] Caught "render is not a function" error:', {
                    args,
                    stack: new Error().stack
                });
            }
            
            // Call original error handler
            originalError.apply(console, args);
        };
        
        return () => {
            console.error = originalError;
        };
    }, []);
    
    return (
        <>
            {children}
            {showDebugger && <ReactErrorDebugger enabled={true} />}
        </>
    );
}