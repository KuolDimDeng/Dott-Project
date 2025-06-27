'use client';

import React, { useState, useEffect } from 'react';
import { customerApi, productApi, supplierApi } from '@/utils/apiClient';

const DiagnosticPanel = () => {
  const [diagnostics, setDiagnostics] = useState({
    loading: true,
    customerApi: { status: 'checking', data: null, error: null },
    productApi: { status: 'checking', data: null, error: null },
    supplierApi: { status: 'checking', data: null, error: null },
    customerStats: { status: 'checking', data: null, error: null },
    serviceStats: { status: 'checking', data: null, error: null },
    dashboardMetrics: { status: 'checking', data: null, error: null },
    sessionCookie: { status: 'checking', data: null }
  });

  useEffect(() => {
    const runDiagnostics = async () => {
      // Check session cookie
      const sid = document.cookie.split('; ').find(row => row.startsWith('sid='));
      setDiagnostics(prev => ({
        ...prev,
        sessionCookie: {
          status: sid ? 'found' : 'missing',
          data: sid ? sid.split('=')[1] : null
        }
      }));

      // Test customerApi
      try {
        const customers = await customerApi.getAll();
        setDiagnostics(prev => ({
          ...prev,
          customerApi: {
            status: 'success',
            data: { count: customers.length, sample: customers[0] },
            error: null
          }
        }));
      } catch (error) {
        setDiagnostics(prev => ({
          ...prev,
          customerApi: {
            status: 'error',
            data: null,
            error: error.message
          }
        }));
      }

      // Test productApi
      try {
        const products = await productApi.getAll();
        setDiagnostics(prev => ({
          ...prev,
          productApi: {
            status: 'success',
            data: { count: products.length, sample: products[0] },
            error: null
          }
        }));
      } catch (error) {
        setDiagnostics(prev => ({
          ...prev,
          productApi: {
            status: 'error',
            data: null,
            error: error.message
          }
        }));
      }

      // Test supplierApi
      try {
        const suppliers = await supplierApi.getAll();
        setDiagnostics(prev => ({
          ...prev,
          supplierApi: {
            status: 'success',
            data: { count: suppliers.length, sample: suppliers[0] },
            error: null
          }
        }));
      } catch (error) {
        setDiagnostics(prev => ({
          ...prev,
          supplierApi: {
            status: 'error',
            data: null,
            error: error.message
          }
        }));
      }

      // Test customer stats endpoint
      try {
        const response = await fetch('/api/customers/stats');
        const data = await response.json();
        setDiagnostics(prev => ({
          ...prev,
          customerStats: {
            status: response.ok ? 'success' : 'error',
            data: data,
            error: response.ok ? null : `HTTP ${response.status}`
          }
        }));
      } catch (error) {
        setDiagnostics(prev => ({
          ...prev,
          customerStats: {
            status: 'error',
            data: null,
            error: error.message
          }
        }));
      }

      // Test service stats endpoint
      try {
        const response = await fetch('/api/services/stats');
        const data = await response.json();
        setDiagnostics(prev => ({
          ...prev,
          serviceStats: {
            status: response.ok ? 'success' : 'error',
            data: data,
            error: response.ok ? null : `HTTP ${response.status}`
          }
        }));
      } catch (error) {
        setDiagnostics(prev => ({
          ...prev,
          serviceStats: {
            status: 'error',
            data: null,
            error: error.message
          }
        }));
      }

      // Test dashboard metrics endpoint
      try {
        const response = await fetch('/api/dashboard/metrics/summary');
        const data = await response.json();
        setDiagnostics(prev => ({
          ...prev,
          dashboardMetrics: {
            status: response.ok ? 'success' : 'error',
            data: data,
            error: response.ok ? null : `HTTP ${response.status}`
          }
        }));
      } catch (error) {
        setDiagnostics(prev => ({
          ...prev,
          dashboardMetrics: {
            status: 'error',
            data: null,
            error: error.message
          }
        }));
      }

      setDiagnostics(prev => ({ ...prev, loading: false }));
    };

    runDiagnostics();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
      case 'found':
        return 'text-green-600';
      case 'error':
      case 'missing':
        return 'text-red-600';
      case 'checking':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  if (diagnostics.loading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-2">Running Diagnostics...</h3>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">API Diagnostics</h3>
      
      <div className="space-y-3">
        {/* Session Cookie */}
        <div className="border-b pb-2">
          <h4 className="font-medium">Session Cookie (sid)</h4>
          <p className={`text-sm ${getStatusColor(diagnostics.sessionCookie.status)}`}>
            Status: {diagnostics.sessionCookie.status}
          </p>
          {diagnostics.sessionCookie.data && (
            <p className="text-xs text-gray-600 truncate">
              Value: {diagnostics.sessionCookie.data}
            </p>
          )}
        </div>

        {/* Customer API */}
        <div className="border-b pb-2">
          <h4 className="font-medium">Customer API (customerApi.getAll)</h4>
          <p className={`text-sm ${getStatusColor(diagnostics.customerApi.status)}`}>
            Status: {diagnostics.customerApi.status}
          </p>
          {diagnostics.customerApi.data && (
            <p className="text-sm">Count: {diagnostics.customerApi.data.count}</p>
          )}
          {diagnostics.customerApi.error && (
            <p className="text-sm text-red-600">Error: {diagnostics.customerApi.error}</p>
          )}
        </div>

        {/* Product API */}
        <div className="border-b pb-2">
          <h4 className="font-medium">Product API (productApi.getAll)</h4>
          <p className={`text-sm ${getStatusColor(diagnostics.productApi.status)}`}>
            Status: {diagnostics.productApi.status}
          </p>
          {diagnostics.productApi.data && (
            <p className="text-sm">Count: {diagnostics.productApi.data.count}</p>
          )}
          {diagnostics.productApi.error && (
            <p className="text-sm text-red-600">Error: {diagnostics.productApi.error}</p>
          )}
        </div>

        {/* Supplier API */}
        <div className="border-b pb-2">
          <h4 className="font-medium">Supplier API (supplierApi.getAll)</h4>
          <p className={`text-sm ${getStatusColor(diagnostics.supplierApi.status)}`}>
            Status: {diagnostics.supplierApi.status}
          </p>
          {diagnostics.supplierApi.data && (
            <p className="text-sm">Count: {diagnostics.supplierApi.data.count}</p>
          )}
          {diagnostics.supplierApi.error && (
            <p className="text-sm text-red-600">Error: {diagnostics.supplierApi.error}</p>
          )}
        </div>

        {/* Customer Stats */}
        <div className="border-b pb-2">
          <h4 className="font-medium">Customer Stats API</h4>
          <p className={`text-sm ${getStatusColor(diagnostics.customerStats.status)}`}>
            Status: {diagnostics.customerStats.status}
          </p>
          {diagnostics.customerStats.data && (
            <pre className="text-xs bg-gray-100 p-2 rounded mt-1">
              {JSON.stringify(diagnostics.customerStats.data, null, 2)}
            </pre>
          )}
          {diagnostics.customerStats.error && (
            <p className="text-sm text-red-600">Error: {diagnostics.customerStats.error}</p>
          )}
        </div>

        {/* Service Stats */}
        <div className="border-b pb-2">
          <h4 className="font-medium">Service Stats API</h4>
          <p className={`text-sm ${getStatusColor(diagnostics.serviceStats.status)}`}>
            Status: {diagnostics.serviceStats.status}
          </p>
          {diagnostics.serviceStats.data && (
            <pre className="text-xs bg-gray-100 p-2 rounded mt-1">
              {JSON.stringify(diagnostics.serviceStats.data, null, 2)}
            </pre>
          )}
          {diagnostics.serviceStats.error && (
            <p className="text-sm text-red-600">Error: {diagnostics.serviceStats.error}</p>
          )}
        </div>

        {/* Dashboard Metrics */}
        <div>
          <h4 className="font-medium">Dashboard Metrics API</h4>
          <p className={`text-sm ${getStatusColor(diagnostics.dashboardMetrics.status)}`}>
            Status: {diagnostics.dashboardMetrics.status}
          </p>
          {diagnostics.dashboardMetrics.data && (
            <pre className="text-xs bg-gray-100 p-2 rounded mt-1 max-h-32 overflow-auto">
              {JSON.stringify(diagnostics.dashboardMetrics.data, null, 2)}
            </pre>
          )}
          {diagnostics.dashboardMetrics.error && (
            <p className="text-sm text-red-600">Error: {diagnostics.dashboardMetrics.error}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiagnosticPanel;