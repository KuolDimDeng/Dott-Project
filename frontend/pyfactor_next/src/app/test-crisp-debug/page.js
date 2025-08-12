'use client';

import { useEffect, useState } from 'react';

export default function TestCrispDebug() {
  const [crispStatus, setCrispStatus] = useState({
    scriptLoaded: false,
    crispObject: false,
    websiteId: null,
    error: null
  });

  useEffect(() => {
    // Check current state
    const checkCrispStatus = () => {
      const status = {
        scriptLoaded: !!document.querySelector('script[src="https://client.crisp.chat/l.js"]'),
        crispObject: !!window.$crisp,
        websiteId: window.CRISP_WEBSITE_ID || null,
        crispPush: typeof window.$crisp?.push === 'function',
        envVar: process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID || 'NOT SET',
        error: null
      };
      
      setCrispStatus(status);
      console.log('🔍 Crisp Status:', status);
    };

    // Initial check
    checkCrispStatus();

    // Check every second for 10 seconds
    const interval = setInterval(checkCrispStatus, 1000);
    const timeout = setTimeout(() => clearInterval(interval), 10000);

    // Try to manually initialize Crisp
    const manualInit = () => {
      try {
        console.log('🚀 Attempting manual Crisp initialization...');
        window.$crisp = [];
        window.CRISP_WEBSITE_ID = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID || '82ce1965-8acf-4c6e-b8c0-a543ead8004e';
        
        const script = document.createElement('script');
        script.src = 'https://client.crisp.chat/l.js';
        script.async = true;
        
        script.onload = () => {
          console.log('✅ Crisp script loaded successfully');
          checkCrispStatus();
        };
        
        script.onerror = (error) => {
          console.error('❌ Failed to load Crisp script:', error);
          setCrispStatus(prev => ({ ...prev, error: 'Script load failed' }));
        };
        
        document.head.appendChild(script);
      } catch (error) {
        console.error('❌ Manual init error:', error);
        setCrispStatus(prev => ({ ...prev, error: error.message }));
      }
    };

    // Try manual init after 2 seconds if not loaded
    setTimeout(() => {
      if (!window.$crisp) {
        manualInit();
      }
    }, 2000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Crisp Chat Debug Page</h1>
      
      <div className="space-y-4">
        <div className="p-4 border rounded">
          <h2 className="font-semibold mb-2">Crisp Status</h2>
          <ul className="space-y-2">
            <li>Script Loaded: {crispStatus.scriptLoaded ? '✅ Yes' : '❌ No'}</li>
            <li>$crisp Object: {crispStatus.crispObject ? '✅ Yes' : '❌ No'}</li>
            <li>Website ID: {crispStatus.websiteId || 'NOT SET'}</li>
            <li>Env Variable: {crispStatus.envVar}</li>
            <li>Error: {crispStatus.error || 'None'}</li>
          </ul>
        </div>

        <div className="p-4 border rounded">
          <h2 className="font-semibold mb-2">Actions</h2>
          <div className="space-x-2">
            <button
              onClick={() => {
                if (window.$crisp?.push) {
                  window.$crisp.push(['do', 'chat:show']);
                  console.log('📢 Attempted to show chat');
                } else {
                  console.error('❌ $crisp not available');
                }
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Show Chat
            </button>
            
            <button
              onClick={() => {
                if (window.$crisp?.push) {
                  window.$crisp.push(['do', 'chat:open']);
                  console.log('📢 Attempted to open chat');
                } else {
                  console.error('❌ $crisp not available');
                }
              }}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Open Chat
            </button>
          </div>
        </div>

        <div className="p-4 border rounded bg-gray-50">
          <h2 className="font-semibold mb-2">Instructions</h2>
          <ol className="list-decimal list-inside space-y-1">
            <li>Check the console for debug logs</li>
            <li>Wait a few seconds for Crisp to initialize</li>
            <li>Try the Show/Open Chat buttons</li>
            <li>Look for the chat widget in the bottom right corner</li>
          </ol>
        </div>
      </div>
    </div>
  );
}