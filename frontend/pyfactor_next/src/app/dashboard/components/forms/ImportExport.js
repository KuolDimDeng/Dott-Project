'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRightIcon, ArrowUpTrayIcon, ArrowDownTrayIcon, CloudArrowUpIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { captureEvent } from '@/lib/posthog';
import StandardSpinner from '@/components/ui/StandardSpinner';

const ImportExport = () => {
  const router = useRouter();
  const [mode, setMode] = useState(null); // null, 'import', 'export'
  const [selectedDataTypes, setSelectedDataTypes] = useState([]);
  const [importSource, setImportSource] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Track page view
  useEffect(() => {
    captureEvent('import_export_page_viewed');
  }, []);

  // Data types available for import/export
  const dataTypes = [
    { id: 'products', label: 'Products/Services', description: 'Product catalog with prices and inventory' },
    { id: 'customers', label: 'Customers', description: 'Customer database with contact information' },
    { id: 'invoices', label: 'Invoices', description: 'Sales invoices and payment history' },
    { id: 'bills', label: 'Bills & Expenses', description: 'Purchase bills and expense records' },
    { id: 'chart-of-accounts', label: 'Chart of Accounts', description: 'Account structure and balances' },
    { id: 'tax-rates', label: 'Tax Rates', description: 'Tax configurations by location' },
    { id: 'vendors', label: 'Vendors', description: 'Supplier database and payment terms' },
    { id: 'employees', label: 'Employees', description: 'Employee records and payroll data' },
  ];

  // Import sources
  const importSources = [
    { 
      id: 'excel', 
      label: 'Excel/CSV', 
      icon: DocumentTextIcon,
      description: 'Upload .xlsx or .csv files',
      supported: true 
    },
    { 
      id: 'quickbooks', 
      label: 'QuickBooks', 
      icon: CloudArrowUpIcon,
      description: 'Direct import from QuickBooks Online',
      supported: true 
    },
    { 
      id: 'wave', 
      label: 'Wave', 
      icon: CloudArrowUpIcon,
      description: 'Import from Wave Accounting',
      supported: false 
    },
    { 
      id: 'xero', 
      label: 'Xero', 
      icon: CloudArrowUpIcon,
      description: 'Import from Xero',
      supported: false 
    },
    { 
      id: 'shopify', 
      label: 'Shopify', 
      icon: CloudArrowUpIcon,
      description: 'Import products and customers from Shopify',
      supported: false 
    },
  ];

  const handleDataTypeToggle = (dataTypeId) => {
    setSelectedDataTypes(prev => {
      if (prev.includes(dataTypeId)) {
        return prev.filter(id => id !== dataTypeId);
      }
      return [...prev, dataTypeId];
    });
  };

  const handleModeSelect = (selectedMode) => {
    setMode(selectedMode);
    captureEvent(`import_export_mode_selected`, { mode: selectedMode });
  };

  const handleImportSourceSelect = (source) => {
    if (!source.supported) {
      setError(`${source.label} integration coming soon!`);
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    setImportSource(source);
    captureEvent('import_source_selected', { source: source.id });
    
    if (source.id === 'excel') {
      // Trigger file upload dialog
      fileInputRef.current?.click();
    } else if (source.id === 'quickbooks') {
      // Navigate to QuickBooks OAuth flow
      router.push('/dashboard/import-export/quickbooks-auth');
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (selectedDataTypes.length === 0) {
      setError('Please select at least one data type to import');
      return;
    }

    setLoading(true);
    captureEvent('import_file_uploaded', { 
      fileName: file.name,
      fileSize: file.size,
      dataTypes: selectedDataTypes 
    });

    // Navigate to data mapper with file and selected data types
    const formData = new FormData();
    formData.append('file', file);
    formData.append('dataTypes', JSON.stringify(selectedDataTypes));
    
    // Store file in session storage temporarily (for demo)
    const fileData = {
      name: file.name,
      size: file.size,
      type: file.type,
      dataTypes: selectedDataTypes
    };
    sessionStorage.setItem('importFileData', JSON.stringify(fileData));
    
    // Navigate to data mapper
    router.push('/dashboard/import-export/data-mapper');
  };

  const handleExportStart = () => {
    if (selectedDataTypes.length === 0) {
      setError('Please select at least one data type to export');
      return;
    }

    captureEvent('export_started', { dataTypes: selectedDataTypes });
    
    // Navigate to export options
    router.push(`/dashboard/import-export/export?types=${selectedDataTypes.join(',')}`);
  };

  // Reset file input when source changes
  useEffect(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [importSource]);

  if (!mode) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Import/Export Data</h1>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Import Card */}
          <div 
            onClick={() => handleModeSelect('import')}
            className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-blue-500"
          >
            <div className="flex items-center mb-4">
              <ArrowDownTrayIcon className="h-12 w-12 text-blue-600" />
              <h2 className="text-xl font-semibold ml-4">Import Data</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Bring your existing data into Dott from Excel, QuickBooks, or other sources.
            </p>
            <ul className="text-sm text-gray-500 space-y-1">
              <li>• AI-powered field mapping</li>
              <li>• Support for multiple file formats</li>
              <li>• Automatic data validation</li>
              <li>• Bulk import capabilities</li>
            </ul>
            <div className="mt-4 flex items-center text-blue-600">
              <span className="text-sm font-medium">Get Started</span>
              <ChevronRightIcon className="h-4 w-4 ml-1" />
            </div>
          </div>

          {/* Export Card */}
          <div 
            onClick={() => handleModeSelect('export')}
            className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-green-500"
          >
            <div className="flex items-center mb-4">
              <ArrowUpTrayIcon className="h-12 w-12 text-green-600" />
              <h2 className="text-xl font-semibold ml-4">Export Data</h2>
            </div>
            <p className="text-gray-600 mb-4">
              Download your Dott data in various formats for backup or use in other applications.
            </p>
            <ul className="text-sm text-gray-500 space-y-1">
              <li>• Export to Excel or CSV</li>
              <li>• Financial report formats</li>
              <li>• Accountant-ready files</li>
              <li>• Scheduled exports available</li>
            </ul>
            <div className="mt-4 flex items-center text-green-600">
              <span className="text-sm font-medium">Get Started</span>
              <ChevronRightIcon className="h-4 w-4 ml-1" />
            </div>
          </div>
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">New Feature: AI-Powered Data Mapper</h3>
          <p className="text-sm text-blue-700">
            Our intelligent field mapping system uses Claude AI to automatically match your data fields 
            with Dott's database structure, making imports faster and more accurate than ever.
          </p>
        </div>
      </div>
    );
  }

  if (mode === 'import') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <button
            onClick={() => setMode(null)}
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            <ChevronRightIcon className="h-4 w-4 mr-1 rotate-180" />
            Back to Import/Export
          </button>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">Import Data</h1>

        {/* Step 1: Select Data Types */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Step 1: What would you like to import?</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {dataTypes.map(dataType => (
              <label
                key={dataType.id}
                className={`flex items-start p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                  selectedDataTypes.includes(dataType.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedDataTypes.includes(dataType.id)}
                  onChange={() => handleDataTypeToggle(dataType.id)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <div className="ml-3">
                  <div className="font-medium text-gray-900">{dataType.label}</div>
                  <div className="text-sm text-gray-500">{dataType.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Step 2: Select Import Source */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Step 2: How would you like to import?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {importSources.map(source => {
              const Icon = source.icon;
              return (
                <button
                  key={source.id}
                  onClick={() => handleImportSourceSelect(source)}
                  disabled={!source.supported}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    source.supported
                      ? 'border-gray-200 hover:border-blue-500 hover:shadow-md cursor-pointer'
                      : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
                  }`}
                >
                  <Icon className="h-8 w-8 text-gray-600 mb-2" />
                  <div className="font-medium text-gray-900">{source.label}</div>
                  <div className="text-sm text-gray-500 mt-1">{source.description}</div>
                  {!source.supported && (
                    <div className="text-xs text-orange-600 mt-2">Coming Soon</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="mt-6 flex items-center justify-center">
            <StandardSpinner size="default" />
            <span className="ml-2 text-gray-600">Processing file...</span>
          </div>
        )}
      </div>
    );
  }

  if (mode === 'export') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <button
            onClick={() => setMode(null)}
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            <ChevronRightIcon className="h-4 w-4 mr-1 rotate-180" />
            Back to Import/Export
          </button>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">Export Data</h1>

        {/* Select Data Types */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Select data to export</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {dataTypes.map(dataType => (
              <label
                key={dataType.id}
                className={`flex items-start p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                  selectedDataTypes.includes(dataType.id)
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedDataTypes.includes(dataType.id)}
                  onChange={() => handleDataTypeToggle(dataType.id)}
                  className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500"
                />
                <div className="ml-3">
                  <div className="font-medium text-gray-900">{dataType.label}</div>
                  <div className="text-sm text-gray-500">{dataType.description}</div>
                </div>
              </label>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {selectedDataTypes.length} data type{selectedDataTypes.length !== 1 ? 's' : ''} selected
            </div>
            <button
              onClick={handleExportStart}
              disabled={selectedDataTypes.length === 0}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                selectedDataTypes.length > 0
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Continue to Export Options
            </button>
          </div>
        </div>

        {/* Export format options */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">Export Formats Available</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Excel (.xlsx) - Recommended for reimporting</li>
            <li>• CSV (.csv) - Universal compatibility</li>
            <li>• PDF - For reports and documentation</li>
            <li>• QuickBooks format - For accountant handoff</li>
          </ul>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default ImportExport;