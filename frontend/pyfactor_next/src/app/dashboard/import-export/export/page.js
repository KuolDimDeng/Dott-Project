'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  ChevronLeftIcon, 
  DocumentArrowDownIcon,
  TableCellsIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import StandardSpinner from '@/components/ui/StandardSpinner';
import { captureEvent } from '@/lib/posthog';

const ExportPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
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
    console.log('[ExportPage] === handleExport called ===');
    console.log('[ExportPage] Data types:', dataTypes);
    console.log('[ExportPage] Selected format:', selectedFormat);
    console.log('[ExportPage] Current URL:', window.location.href);
    console.log('[ExportPage] Current pathname:', window.location.pathname);
    
    // Log current cookies
    if (typeof document !== 'undefined') {
      console.log('[ExportPage] Current cookies:', document.cookie);
      const cookies = document.cookie.split(';').map(c => c.trim());
      const hasSid = cookies.some(c => c.startsWith('sid='));
      const hasSessionToken = cookies.some(c => c.startsWith('session_token='));
      console.log('[ExportPage] Cookie check:', { hasSid, hasSessionToken, totalCookies: cookies.length });
      
      // Test session endpoint before export
      console.log('[ExportPage] Testing session endpoint...');
      try {
        const sessionTest = await fetch('/api/auth/session-v2', {
          method: 'GET',
          credentials: 'include'
        });
        console.log('[ExportPage] Session test result:', {
          status: sessionTest.status,
          ok: sessionTest.ok,
          statusText: sessionTest.statusText
        });
        if (!sessionTest.ok) {
          console.error('[ExportPage] Session test failed - aborting export');
          alert('Session validation failed. Please refresh the page and try again.');
          return;
        }
      } catch (sessionError) {
        console.error('[ExportPage] Session test error:', sessionError);
        alert('Unable to validate session. Please refresh the page and try again.');
        return;
      }
    }
    
    if (dataTypes.length === 0) {
      alert('No data types selected');
      return;
    }

    setExporting(true);
    setExportProgress(0);
    
    console.log('[ExportPage] Capturing export_started event');
    captureEvent('export_started', {
      dataTypes,
      format: selectedFormat,
      dateRange,
      options: includeOptions
    });

    try {
      console.log('[ExportPage] Starting export process...');

      // In production, this would call an API endpoint to generate the export
      console.log('[ExportPage] Calling /api/import-export/export-data');
      const requestBody = {
        dataTypes,
        format: selectedFormat,
        dateRange,
        customDateRange: dateRange === 'custom' ? customDateRange : null,
        options: includeOptions
      };
      console.log('[ExportPage] Request body:', requestBody);
      
      const response = await fetch('/api/import-export/export-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });

      console.log('[ExportPage] Export response:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ExportPage] Export failed:', {
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get('content-type'),
          errorText: errorText.substring(0, 1000)
        });
        
        // Check if response is HTML (likely a redirect page)
        if (errorText.includes('<!DOCTYPE html>') || errorText.includes('<html>')) {
          console.error('[ExportPage] Received HTML response instead of file - likely authentication redirect');
          alert('Session expired or authentication failed. Please refresh the page and try again.');
          return;
        }
        
        if (response.status === 401) {
          console.error('[ExportPage] 401 Unauthorized');
          alert('Your session has expired. Please refresh the page and try again.');
          return;
        }
        
        // Show specific error message
        let errorMessage = 'Export failed';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (parseError) {
          errorMessage = `Export failed (${response.status}): ${errorText.substring(0, 100)}`;
        }
        
        alert(errorMessage);
        return;
      }

      // Handle the response - it should be a file blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Set filename
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `dott_export_${dataTypes.join('_')}_${timestamp}.${selectedFormat === 'excel' ? 'xlsx' : selectedFormat}`;
      a.download = filename;
      
      // Trigger download
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      captureEvent('export_completed', {
        filename,
        dataTypes,
        format: selectedFormat
      });

      // Show success message
      alert('Export complete! Your download should start automatically.');
      
      // Reset and go back after a short delay
      setTimeout(() => {
        router.push('/dashboard/import-export');
      }, 2000);

    } catch (error) {
      console.error('Export error:', error);
      captureEvent('export_error', { error: error.message });
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
      setExportProgress(0);
    }
  };

  const handleIncludeOptionChange = (option) => {
    setIncludeOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

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
            <span key={type} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
              {type.charAt(0).toUpperCase() + type.slice(1)}
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