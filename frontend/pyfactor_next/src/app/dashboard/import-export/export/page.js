'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ChevronLeftIcon, 
  DocumentArrowDownIcon,
  TableCellsIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import StandardSpinner from '@/components/ui/StandardSpinner';
import { captureEvent } from '@/lib/posthog';
import { useSession } from '@/hooks/useSession-v2';

const ExportPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, loading: sessionLoading } = useSession();
  const [selectedFormat, setSelectedFormat] = useState('excel');
  const [dateRange, setDateRange] = useState('all');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [includeOptions, setIncludeOptions] = useState({
    headers: true,
    formulas: false,
    formatting: true,
    images: false
  });
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState(null);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Get selected data types from URL params
  const dataTypes = searchParams.get('types')?.split(',') || [];

  const exportFormats = [
    {
      id: 'excel',
      label: 'Excel (.xlsx)',
      icon: TableCellsIcon,
      description: 'Best for reimporting or further analysis',
      recommended: true
    },
    {
      id: 'csv',
      label: 'CSV (.csv)',
      icon: DocumentTextIcon,
      description: 'Universal format, compatible with all systems'
    },
    {
      id: 'pdf',
      label: 'PDF',
      icon: DocumentArrowDownIcon,
      description: 'Best for reports and documentation'
    },
    {
      id: 'quickbooks',
      label: 'QuickBooks',
      icon: ChartBarIcon,
      description: 'IIF format for QuickBooks import'
    }
  ];

  const dateRangeOptions = [
    { id: 'all', label: 'All Time' },
    { id: 'thisMonth', label: 'This Month' },
    { id: 'lastMonth', label: 'Last Month' },
    { id: 'thisQuarter', label: 'This Quarter' },
    { id: 'thisYear', label: 'This Year' },
    { id: 'custom', label: 'Custom Range' }
  ];

  const handleExport = async () => {
    setExportError(null);
    setExportSuccess(false);
    setExporting(true);
    setExportProgress(10);

    try {
      // Track export start
      captureEvent('export_started', {
        dataTypes,
        format: selectedFormat,
        dateRange,
        options: includeOptions
      });

      setExportProgress(20);

      // Prepare request body
      const requestBody = {
        dataTypes,
        format: selectedFormat,
        dateRange,
        customDateRange: dateRange === 'custom' ? customDateRange : null,
        options: includeOptions
      };

      console.log('Starting export with:', requestBody);
      
      // Make the export API call
      const response = await fetch('/api/import-export/export-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });
      
      setExportProgress(50);
      
      if (!response.ok) {
        let errorMessage = 'Export failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || `Export failed: ${response.status}`;
        } catch (e) {
          errorMessage = `Export failed: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      setExportProgress(70);
      
      // Handle the file download
      const blob = await response.blob();
      setExportProgress(80);
      
      // Extract filename from Content-Disposition header or generate one
      let filename = '';
      const contentDisposition = response.headers.get('content-disposition');
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+?)"?(?:;|$)/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      if (!filename) {
        const timestamp = new Date().toISOString().split('T')[0];
        const extension = selectedFormat === 'excel' ? 'xlsx' : selectedFormat;
        filename = `dott_export_${dataTypes.join('_')}_${timestamp}.${extension}`;
      }
      
      setExportProgress(90);
      
      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);
      
      setExportProgress(100);
      setExportSuccess(true);
      
      // Track success
      captureEvent('export_completed', {
        filename,
        dataTypes,
        format: selectedFormat,
        fileSize: blob.size
      });
      
      // Navigate back after a short delay
      setTimeout(() => {
        router.push('/dashboard/import-export');
      }, 2000);

    } catch (error) {
      console.error('Export error:', error);
      setExportError(error.message);
      
      // Track error
      captureEvent('export_error', { 
        error: error.message,
        dataTypes,
        format: selectedFormat
      });
    } finally {
      setExporting(false);
      if (!exportSuccess) {
        setExportProgress(0);
      }
    }
  };

  const handleIncludeOptionChange = (option) => {
    setIncludeOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  // Show loading state while session is loading
  if (sessionLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-center py-12">
          <StandardSpinner size="large" />
          <span className="ml-3 text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  if (dataTypes.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No data types selected for export</p>
          <button
            onClick={() => router.push('/dashboard/import-export')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard/import-export')}
          className="text-blue-600 hover:text-blue-800 flex items-center mb-4"
        >
          <ChevronLeftIcon className="h-4 w-4 mr-1" />
          Back to Import/Export
        </button>
        
        <h1 className="text-2xl font-bold text-gray-900">Export Options</h1>
        <p className="text-gray-600 mt-1">
          Configure how you want to export your {dataTypes.join(', ')} data
        </p>
      </div>

      {/* Selected Data Types */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-blue-900 mb-2">Data to Export</h3>
        <div className="flex flex-wrap gap-2">
          {dataTypes.map(type => (
            <span key={type} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center">
              <CheckIcon className="h-4 w-4 mr-1" />
              {type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ')}
            </span>
          ))}
        </div>
      </div>

      {/* Export Format */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Select Export Format</h2>
        <div className="grid md:grid-cols-2 gap-3">
          {exportFormats.map(format => {
            const Icon = format.icon;
            return (
              <label
                key={format.id}
                className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  selectedFormat === format.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="format"
                  value={format.id}
                  checked={selectedFormat === format.id}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                  className="mt-0.5 h-4 w-4 text-blue-600"
                />
                <div className="ml-3 flex-1">
                  <div className="flex items-center">
                    <Icon className="h-5 w-5 text-gray-600 mr-2" />
                    <span className="font-medium text-gray-900">{format.label}</span>
                    {format.recommended && (
                      <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{format.description}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Date Range */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Date Range</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {dateRangeOptions.map(option => (
            <label
              key={option.id}
              className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                dateRange === option.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="dateRange"
                value={option.id}
                checked={dateRange === option.id}
                onChange={(e) => setDateRange(e.target.value)}
                className="h-4 w-4 text-blue-600"
              />
              <span className="ml-2 text-gray-900">{option.label}</span>
            </label>
          ))}
        </div>
        
        {dateRange === 'custom' && (
          <div className="mt-4 grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={customDateRange.start}
                onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={customDateRange.end}
                onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Additional Options */}
      {selectedFormat === 'excel' && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Excel Options</h2>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeOptions.headers}
                onChange={() => handleIncludeOptionChange('headers')}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <span className="ml-2 text-gray-700">Include column headers</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeOptions.formulas}
                onChange={() => handleIncludeOptionChange('formulas')}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <span className="ml-2 text-gray-700">Include formulas</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={includeOptions.formatting}
                onChange={() => handleIncludeOptionChange('formatting')}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <span className="ml-2 text-gray-700">Preserve formatting</span>
            </label>
          </div>
        </div>
      )}

      {/* Error Message */}
      {exportError && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Export Error</h3>
              <p className="mt-1 text-sm text-red-700">{exportError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {exportSuccess && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <CheckIcon className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Export Successful!</h3>
              <p className="mt-1 text-sm text-green-700">Your download should start automatically. Redirecting...</p>
            </div>
          </div>
        </div>
      )}

      {/* Export Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/dashboard/import-export')}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        
        <button
          onClick={handleExport}
          disabled={exporting}
          className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center ${
            exporting
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {exporting ? (
            <>
              <StandardSpinner size="small" className="mr-2" />
              Exporting... {exportProgress}%
            </>
          ) : (
            <>
              <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
              Export Data
            </>
          )}
        </button>
      </div>

      {/* Export Tips */}
      <div className="mt-8 bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-2">Export Tips</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Excel format preserves all data types and relationships</li>
          <li>• CSV format is best for universal compatibility</li>
          <li>• PDF format is ideal for reports and documentation</li>
          <li>• Large exports may take several minutes to complete</li>
        </ul>
      </div>
    </div>
  );
};

export default ExportPage;