'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowUpTrayIcon, 
  ArrowDownTrayIcon, 
  DocumentTextIcon,
  TableCellsIcon 
} from '@heroicons/react/24/outline';
import StandardSpinner from '@/components/ui/StandardSpinner';
import { useSession } from '@/hooks/useSession-v2';

const ImportExport = () => {
  const router = useRouter();
  const { session, loading: sessionLoading } = useSession();
  const [mode, setMode] = useState(null);
  const [selectedDataTypes, setSelectedDataTypes] = useState([]);
  const [exporting, setExporting] = useState(false);

  // Show loading spinner while session loads
  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <StandardSpinner size="large" />
        <span className="ml-3 text-gray-600">Loading...</span>
      </div>
    );
  }

  // Check if user has admin/owner role
  if (session?.user) {
    const userRole = session.user.role;
    if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
      return (
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold text-red-900 mb-2">Access Restricted</h2>
            <p className="text-red-700">
              Import/Export functionality is only available to Admin and Owner users.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      );
    }
  }

  const dataTypes = [
    { id: 'customers', label: 'Customers', description: 'Customer database with contact information' },
    { id: 'products', label: 'Products', description: 'Product catalog with prices and inventory' },
    { id: 'invoices', label: 'Invoices', description: 'Sales invoices and payment history' },
    { id: 'bills', label: 'Bills & Expenses', description: 'Purchase bills and expense records' }
  ];

  const handleExport = async () => {
    if (selectedDataTypes.length === 0) {
      alert('Please select at least one data type to export');
      return;
    }

    setExporting(true);
    
    try {
      const response = await fetch('/api/import-export/export-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          dataTypes: selectedDataTypes,
          format: 'excel',
          dateRange: 'all',
          options: { headers: true, formatting: true }
        })
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      // Create download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dott_export_${selectedDataTypes.join('_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      alert('Export completed successfully!');
    } catch (error) {
      console.error('Export error:', error);
      alert(`Export failed: ${error.message}`);
    } finally {
      setExporting(false);
    }
  };

  const toggleDataType = (dataTypeId) => {
    setSelectedDataTypes(prev => 
      prev.includes(dataTypeId)
        ? prev.filter(id => id !== dataTypeId)
        : [...prev, dataTypeId]
    );
  };

  if (mode === 'export') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <button
          onClick={() => setMode(null)}
          className="mb-4 text-blue-600 hover:text-blue-800"
        >
          ← Back to Import/Export
        </button>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Export Data</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Select Data to Export</h2>
          <div className="space-y-3">
            {dataTypes.map(dataType => (
              <label key={dataType.id} className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selectedDataTypes.includes(dataType.id)}
                  onChange={() => toggleDataType(dataType.id)}
                  className="mt-1 h-4 w-4 text-blue-600 rounded"
                />
                <div className="ml-3">
                  <div className="font-medium text-gray-900">{dataType.label}</div>
                  <div className="text-sm text-gray-500">{dataType.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-between">
          <button
            onClick={() => setMode(null)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || selectedDataTypes.length === 0}
            className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center ${
              exporting || selectedDataTypes.length === 0
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {exporting ? (
              <>
                <StandardSpinner size="small" className="mr-2" />
                Exporting...
              </>
            ) : (
              <>
                <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                Export Data
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Main mode selection view
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Import/Export Data</h1>
      <p className="text-gray-600 mb-8">
        Manage your business data by importing from other systems or exporting your current data.
      </p>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Import Card */}
        <div 
          onClick={() => alert('Import functionality coming soon!')}
          className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-blue-500"
        >
          <div className="flex items-center mb-4">
            <ArrowUpTrayIcon className="h-12 w-12 text-blue-600" />
            <h2 className="text-xl font-semibold ml-4">Import Data</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Bring your existing data into Dott from Excel, CSV, or other sources.
          </p>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>• Excel/CSV file import</li>
            <li>• AI-powered field mapping</li>
            <li>• Data validation</li>
            <li>• Bulk import processing</li>
          </ul>
        </div>

        {/* Export Card */}
        <div 
          onClick={() => setMode('export')}
          className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-green-500"
        >
          <div className="flex items-center mb-4">
            <ArrowDownTrayIcon className="h-12 w-12 text-green-600" />
            <h2 className="text-xl font-semibold ml-4">Export Data</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Export your data to Excel, CSV, or other formats for backup or migration.
          </p>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>• Multiple export formats</li>
            <li>• Customizable date ranges</li>
            <li>• Clean formatted output</li>
            <li>• Secure tenant isolation</li>
          </ul>
        </div>
      </div>

      {/* Info section */}
      <div className="mt-8 bg-blue-50 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">Data Security</h3>
        <p className="text-blue-700 text-sm">
          All import/export operations are secured with tenant isolation and role-based access controls. 
          Only administrators and owners can access this functionality.
        </p>
      </div>
    </div>
  );
};

export default ImportExport;