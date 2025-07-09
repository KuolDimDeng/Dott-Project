'use client';

import React, { useState } from 'react';
import { useSession } from '@/hooks/useSession-v2';
import { toast } from 'react-hot-toast';
import { WrenchScrewdriverIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import StandardSpinner from '@/components/ui/StandardSpinner';

export default function FixCalendarSchema() {
  const { session, loading: sessionLoading } = useSession();
  const [isFixing, setIsFixing] = useState(false);
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  
  const tenantId = 'cb86762b-3e32-43bb-963d-f5d5b0bc009e'; // The affected tenant
  
  const addLog = (message, type = 'info') => {
    setLogs(prev => [...prev, { message, type, timestamp: new Date().toISOString() }]);
  };
  
  const fixCalendarSchema = async () => {
    if (!session?.user || session.user.role !== 'OWNER') {
      toast.error('Only owners can run this fix');
      return;
    }
    
    setIsFixing(true);
    setLogs([]);
    setStatus(null);
    
    try {
      addLog('Starting calendar schema fix...', 'info');
      addLog(`Tenant ID: ${tenantId}`, 'info');
      
      // Step 1: Check current schema status
      addLog('Checking current schema status...', 'info');
      const statusResponse = await fetch(`/api/admin/schema-setup?tenantId=${tenantId}`);
      const statusData = await statusResponse.json();
      
      if (statusData.error) {
        addLog(`Status check: ${statusData.message || 'Unknown status'}`, 'warning');
      } else {
        addLog(`Current status: ${statusData.status || 'Unknown'}`, 'info');
      }
      
      // Step 2: Attempt to trigger schema setup
      addLog('Triggering schema setup...', 'info');
      const setupResponse = await fetch('/api/admin/schema-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tenantId }),
      });
      
      const setupData = await setupResponse.json();
      
      if (setupResponse.status === 404) {
        // Backend endpoint doesn't exist, provide manual instructions
        addLog('Automated setup not available', 'warning');
        addLog('Manual intervention required:', 'error');
        
        if (setupData.command) {
          addLog(`Run on backend: ${setupData.command}`, 'error');
        }
        
        if (setupData.alternativeCommands) {
          addLog('Alternative commands:', 'info');
          setupData.alternativeCommands.forEach(cmd => {
            addLog(`  ${cmd}`, 'info');
          });
        }
        
        setStatus('manual');
      } else if (setupResponse.ok) {
        addLog('Schema setup completed successfully!', 'success');
        setStatus('success');
        
        // Test calendar API
        addLog('Testing calendar API...', 'info');
        const testResponse = await fetch(`/api/calendar/events?tenantId=${tenantId}`);
        if (testResponse.ok) {
          const events = await testResponse.json();
          addLog(`Calendar API working! Found ${events.length} events.`, 'success');
        } else {
          addLog('Calendar API test failed', 'error');
        }
      } else {
        addLog(`Setup failed: ${setupData.error || 'Unknown error'}`, 'error');
        setStatus('error');
      }
      
    } catch (error) {
      console.error('Schema fix error:', error);
      addLog(`Error: ${error.message}`, 'error');
      setStatus('error');
    } finally {
      setIsFixing(false);
    }
  };
  
  if (sessionLoading) {
    return <div className="p-6"><StandardSpinner size="large" /></div>;
  }
  
  if (!session?.user || session.user.role !== 'OWNER') {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">This page is only accessible to account owners.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <WrenchScrewdriverIcon className="h-6 w-6 text-blue-600 mr-2" />
          Fix Calendar Schema
        </h1>
        <p className="text-gray-600 mt-2">
          This tool fixes the calendar database schema for tenant {tenantId}
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Issue Details</h2>
          <div className="bg-gray-50 rounded p-4 text-sm">
            <p className="mb-2"><strong>Problem:</strong> Calendar events table not created for this tenant</p>
            <p className="mb-2"><strong>Symptoms:</strong> Events save but don't appear on calendar</p>
            <p><strong>Solution:</strong> Run database migrations to create the events table</p>
          </div>
        </div>
        
        <div className="mb-6">
          <button
            onClick={fixCalendarSchema}
            disabled={isFixing}
            className={`flex items-center px-6 py-3 rounded-lg text-white font-medium ${
              isFixing 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isFixing ? (
              <>
                <StandardSpinner size="small" className="mr-2" />
                Running Fix...
              </>
            ) : (
              <>
                <WrenchScrewdriverIcon className="h-5 w-5 mr-2" />
                Run Schema Fix
              </>
            )}
          </button>
        </div>
        
        {logs.length > 0 && (
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Execution Log</h3>
            <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm overflow-x-auto">
              {logs.map((log, index) => (
                <div 
                  key={index} 
                  className={`mb-1 ${
                    log.type === 'error' ? 'text-red-400' :
                    log.type === 'warning' ? 'text-yellow-400' :
                    log.type === 'success' ? 'text-green-400' :
                    'text-gray-300'
                  }`}
                >
                  [{new Date(log.timestamp).toLocaleTimeString()}] {log.message}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {status && (
          <div className="mt-6">
            {status === 'success' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start">
                <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-900">Success!</h4>
                  <p className="text-green-800">The calendar schema has been fixed. Users can now create and view calendar events.</p>
                </div>
              </div>
            )}
            
            {status === 'manual' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start">
                <ExclamationCircleIcon className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-yellow-900">Manual Intervention Required</h4>
                  <p className="text-yellow-800">The automated fix is not available. Please run the commands shown in the log on the backend server.</p>
                </div>
              </div>
            )}
            
            {status === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
                <ExclamationCircleIcon className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-900">Error</h4>
                  <p className="text-red-800">The schema fix failed. Please check the logs above and contact support if needed.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="mt-6 bg-blue-50 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Manual Fix Instructions</h3>
        <p className="text-blue-800 text-sm mb-2">If the automated fix doesn't work, SSH into the backend server and run:</p>
        <code className="block bg-blue-100 rounded p-2 text-xs font-mono text-blue-900">
          python manage.py migrate events --run-syncdb
        </code>
        <p className="text-blue-800 text-sm mt-2">Or for tenant-specific migration:</p>
        <code className="block bg-blue-100 rounded p-2 text-xs font-mono text-blue-900">
          python manage.py migrate_tenant {tenantId}
        </code>
      </div>
    </div>
  );
}