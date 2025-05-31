'use client';

import { useEffect, useState } from 'react';
import { cognitoAuth } from '@/lib/cognitoDirectAuth';
import { CognitoAttributes } from '@/utils/CognitoAttributes';

export default function AuthDebugPage() {
  const [debugData, setDebugData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const gatherDebugInfo = () => {
      try {
        // Check authentication status
        const isAuthenticated = cognitoAuth.isAuthenticated();
        
        // Get current user
        const currentUser = cognitoAuth.getCurrentUser();
        
        // Get custom attributes
        const customAttributes = cognitoAuth.getCustomAttributes();
        
        // Get all user attributes
        const allAttributes = cognitoAuth.getUserAttributes();
        
        // Get tenant ID using different methods
        const tenantIdFromAuth = cognitoAuth.getTenantId();
        const tenantIdFromCognito = CognitoAttributes.getTenantId(customAttributes);
        
        // Get localStorage data
        const localStorageData = {};
        const relevantKeys = [
          'idToken', 'accessToken', 'refreshToken', 'userInfo', 
          'tenant_id', 'tenantId', 'businessId', 'user_profile',
          'user_email', 'cognito_sub'
        ];
        
        relevantKeys.forEach(key => {
          const value = localStorage.getItem(key);
          if (value) {
            try {
              // Try to parse as JSON, otherwise store as string
              localStorageData[key] = JSON.parse(value);
            } catch {
              localStorageData[key] = value;
            }
          }
        });
        
        // Decode ID token if available
        let decodedIdToken = null;
        const idToken = localStorage.getItem('idToken');
        if (idToken) {
          try {
            const payload = JSON.parse(atob(idToken.split('.')[1]));
            decodedIdToken = payload;
          } catch (error) {
            decodedIdToken = { error: 'Failed to decode token' };
          }
        }
        
        // Check app cache
        const appCache = typeof window !== 'undefined' ? window.__APP_CACHE : null;
        
        setDebugData({
          isAuthenticated,
          currentUser,
          customAttributes,
          allAttributes,
          tenantIdFromAuth,
          tenantIdFromCognito,
          localStorageData,
          decodedIdToken,
          appCache,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        setDebugData({
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        });
      } finally {
        setLoading(false);
      }
    };

    gatherDebugInfo();
  }, []);

  const refreshData = () => {
    setLoading(true);
    setTimeout(() => {
      const gatherDebugInfo = () => {
        // Same logic as above
        try {
          const isAuthenticated = cognitoAuth.isAuthenticated();
          const currentUser = cognitoAuth.getCurrentUser();
          const customAttributes = cognitoAuth.getCustomAttributes();
          const allAttributes = cognitoAuth.getUserAttributes();
          const tenantIdFromAuth = cognitoAuth.getTenantId();
          const tenantIdFromCognito = CognitoAttributes.getTenantId(customAttributes);
          
          const localStorageData = {};
          const relevantKeys = [
            'idToken', 'accessToken', 'refreshToken', 'userInfo', 
            'tenant_id', 'tenantId', 'businessId', 'user_profile',
            'user_email', 'cognito_sub'
          ];
          
          relevantKeys.forEach(key => {
            const value = localStorage.getItem(key);
            if (value) {
              try {
                localStorageData[key] = JSON.parse(value);
              } catch {
                localStorageData[key] = value;
              }
            }
          });
          
          let decodedIdToken = null;
          const idToken = localStorage.getItem('idToken');
          if (idToken) {
            try {
              const payload = JSON.parse(atob(idToken.split('.')[1]));
              decodedIdToken = payload;
            } catch (error) {
              decodedIdToken = { error: 'Failed to decode token' };
            }
          }
          
          const appCache = typeof window !== 'undefined' ? window.__APP_CACHE : null;
          
          setDebugData({
            isAuthenticated,
            currentUser,
            customAttributes,
            allAttributes,
            tenantIdFromAuth,
            tenantIdFromCognito,
            localStorageData,
            decodedIdToken,
            appCache,
            timestamp: new Date().toISOString()
          });
          
        } catch (error) {
          setDebugData({
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
          });
        } finally {
          setLoading(false);
        }
      };

      gatherDebugInfo();
    }, 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2">Loading debug information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">OAuth Authentication Debug</h1>
            <button
              onClick={refreshData}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Refresh Data
            </button>
          </div>
          
          {debugData.error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
              <p className="text-red-700">{debugData.error}</p>
              {debugData.stack && (
                <pre className="mt-2 text-xs text-red-600 overflow-auto">
                  {debugData.stack}
                </pre>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Authentication Status */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h2 className="text-lg font-semibold mb-2">Authentication Status</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium">Is Authenticated:</span>
                    <span className={`ml-2 px-2 py-1 rounded text-sm ${
                      debugData.isAuthenticated ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {debugData.isAuthenticated ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Tenant ID (Auth):</span>
                    <span className="ml-2 text-sm text-gray-600">
                      {debugData.tenantIdFromAuth || 'Not found'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Tenant ID (Cognito):</span>
                    <span className="ml-2 text-sm text-gray-600">
                      {debugData.tenantIdFromCognito || 'Not found'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Last Updated:</span>
                    <span className="ml-2 text-sm text-gray-600">
                      {new Date(debugData.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Current User */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h2 className="text-lg font-semibold mb-2">Current User</h2>
                <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-64">
                  {JSON.stringify(debugData.currentUser, null, 2)}
                </pre>
              </div>

              {/* Custom Attributes */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h2 className="text-lg font-semibold mb-2">Custom Attributes</h2>
                <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-64">
                  {JSON.stringify(debugData.customAttributes, null, 2)}
                </pre>
              </div>

              {/* All Attributes */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h2 className="text-lg font-semibold mb-2">All User Attributes</h2>
                <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-64">
                  {JSON.stringify(debugData.allAttributes, null, 2)}
                </pre>
              </div>

              {/* Decoded ID Token */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h2 className="text-lg font-semibold mb-2">Decoded ID Token</h2>
                <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-64">
                  {JSON.stringify(debugData.decodedIdToken, null, 2)}
                </pre>
              </div>

              {/* Local Storage */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h2 className="text-lg font-semibold mb-2">Local Storage Data</h2>
                <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-64">
                  {JSON.stringify(debugData.localStorageData, null, 2)}
                </pre>
              </div>

              {/* App Cache */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h2 className="text-lg font-semibold mb-2">App Cache</h2>
                <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-64">
                  {JSON.stringify(debugData.appCache, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 