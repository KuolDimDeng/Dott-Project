/**
 * Database Administration Component
 * 
 * Provides UI for testing database connections and synchronizing tenant data
 * between Django (AWS RDS) and local PostgreSQL databases.
 */
import { useState, useEffect } from 'react';

export default function DatabaseAdmin() {
  const [testResults, setTestResults] = useState(null);
  const [syncResults, setSyncResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncDirection, setSyncDirection] = useState('both');
  const [error, setError] = useState(null);

  // Test both database connections
  const testDatabases = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/tenant/test-database');
      const data = await response.json();
      setTestResults(data);
    } catch (err) {
      setError(`Error testing databases: ${err.message}`);
      console.error('Database test error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Synchronize tenant data between databases
  const syncDatabases = async () => {
    setLoading(true);
    setError(null);
    setSyncResults(null);
    
    try {
      const response = await fetch(`/api/tenant/sync-databases?direction=${syncDirection}`);
      const data = await response.json();
      setSyncResults(data);
    } catch (err) {
      setError(`Error synchronizing databases: ${err.message}`);
      console.error('Database sync error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Database Administration</h2>
      
      {/* Database testing section */}
      <div className="mb-6 border-b pb-4">
        <h3 className="text-lg font-medium mb-3">Test Database Connections</h3>
        <button
          onClick={testDatabases}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Connections'}
        </button>
        
        {testResults && (
          <div className="mt-4">
            <h4 className="font-medium">Test Results:</h4>
            <div className="mt-2 grid grid-cols-2 gap-4">
              {/* Local Database Results */}
              <div className={`p-3 rounded-lg ${testResults.localDatabase.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <h5 className="font-medium">Local Database</h5>
                <p className="text-sm">Host: {testResults.localDatabase.config.host}</p>
                <p className="text-sm">Database: {testResults.localDatabase.config.database}</p>
                <p className="text-sm">
                  Status: {testResults.localDatabase.success ? '✅ Connected' : '❌ Failed'}
                </p>
                {!testResults.localDatabase.success && (
                  <p className="text-sm text-red-600">{testResults.localDatabase.error}</p>
                )}
              </div>
              
              {/* Django Database Results */}
              <div className={`p-3 rounded-lg ${testResults.djangoDatabase.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <h5 className="font-medium">Django Database (AWS RDS)</h5>
                <p className="text-sm">Host: {testResults.djangoDatabase.config.host}</p>
                <p className="text-sm">Database: {testResults.djangoDatabase.config.database}</p>
                <p className="text-sm">
                  Status: {testResults.djangoDatabase.success ? '✅ Connected' : '❌ Failed'}
                </p>
                {!testResults.djangoDatabase.success && (
                  <p className="text-sm text-red-600">{testResults.djangoDatabase.error}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Database synchronization section */}
      <div>
        <h3 className="text-lg font-medium mb-3">Synchronize Tenant Data</h3>
        
        <div className="flex items-center mb-4">
          <label className="mr-3">Direction:</label>
          <select
            value={syncDirection}
            onChange={(e) => setSyncDirection(e.target.value)}
            className="px-3 py-2 border rounded"
          >
            <option value="both">Both Ways</option>
            <option value="to-django">Local → Django</option>
            <option value="to-local">Django → Local</option>
          </select>
        </div>
        
        <button
          onClick={syncDatabases}
          disabled={loading}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
        >
          {loading ? 'Synchronizing...' : 'Synchronize Databases'}
        </button>
        
        {syncResults && (
          <div className="mt-4">
            <h4 className="font-medium">Synchronization Results:</h4>
            <div className="mt-2 p-3 bg-gray-50 rounded-lg border">
              <p>Status: {syncResults.success ? '✅ Success' : '❌ Failed'}</p>
              
              {syncResults.success && syncResults.output && (
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs max-h-40 overflow-auto">
                  {syncResults.output}
                </pre>
              )}
              
              {syncResults.warnings && (
                <div className="mt-2">
                  <p className="text-yellow-600 font-medium">Warnings:</p>
                  <pre className="p-2 bg-yellow-50 rounded text-xs max-h-20 overflow-auto">
                    {syncResults.warnings}
                  </pre>
                </div>
              )}
              
              {!syncResults.success && syncResults.error && (
                <p className="mt-2 text-red-600">{syncResults.error}</p>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Error display */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200">
          {error}
        </div>
      )}
    </div>
  );
}