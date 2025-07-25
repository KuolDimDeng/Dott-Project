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
  ExclamationTriangleIcon
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
  const [sessionCheckResult, setSessionCheckResult] = useState(null);

  // Get selected data types from URL params
  const dataTypes = searchParams.get('types')?.split(',') || [];

  // Debug logging on component mount
  useEffect(() => {
    console.log('🚀 [ExportPage] === Component Mounted ===');
    console.log('🚀 [ExportPage] Initial state:', {
      dataTypes,
      selectedFormat,
      dateRange,
      pathname: window.location.pathname,
      search: window.location.search,
      searchParams: Object.fromEntries(searchParams.entries())
    });

    // Check session state
    console.log('🚀 [ExportPage] Session state:', {
      loading: sessionLoading,
      hasSession: !!session,
      authenticated: session?.authenticated,
      hasUser: !!session?.user,
      userEmail: session?.user?.email,
      userRole: session?.user?.role
    });

    // Check cookies
    if (typeof document !== 'undefined') {
      const cookies = document.cookie.split(';').map(c => c.trim());
      const sidCookie = cookies.find(c => c.startsWith('sid='));
      const sessionTokenCookie = cookies.find(c => c.startsWith('session_token='));
      console.log('🚀 [ExportPage] Cookie status:', {
        hasSid: !!sidCookie,
        hasSessionToken: !!sessionTokenCookie,
        sidValue: sidCookie ? sidCookie.substring(0, 20) + '...' : 'not found',
        sessionTokenValue: sessionTokenCookie ? sessionTokenCookie.substring(0, 30) + '...' : 'not found',
        totalCookies: cookies.length
      });
    }

    return () => {
      console.log('🚀 [ExportPage] === Component Unmounting ===');
    };
  }, []);

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

  // Session validation check
  useEffect(() => {
    const checkSession = async () => {
      if (!sessionLoading && !session) {
        console.log('❌ [ExportPage] No session available after loading');
        setSessionCheckResult('no_session');
        return;
      }

      if (!sessionLoading && session) {
        console.log('✅ [ExportPage] Session loaded successfully');
        setSessionCheckResult('session_valid');
        
        // Perform additional validation
        try {
          console.log('🔍 [ExportPage] Performing session validation check...');
          const response = await fetch('/api/auth/session-v2', {
            method: 'GET',
            credentials: 'include'
          });
          
          console.log('🔍 [ExportPage] Session validation response:', {
            status: response.status,
            ok: response.ok,
            contentType: response.headers.get('content-type')
          });
          
          if (!response.ok) {
            console.error('❌ [ExportPage] Session validation failed');
            setSessionCheckResult('session_invalid');
          }
        } catch (error) {
          console.error('❌ [ExportPage] Session validation error:', error);
          setSessionCheckResult('session_error');
        }
      }
    };

    checkSession();
  }, [session, sessionLoading]);

  const handleExport = async () => {
    console.log('📤 [ExportPage] === handleExport START ===');
    console.log('📤 [ExportPage] Export parameters:', {
      dataTypes,
      selectedFormat,
      dateRange,
      customDateRange,
      includeOptions,
      timestamp: new Date().toISOString()
    });
    
    // Clear any previous errors
    setExportError(null);
    
    // Session check
    console.log('📤 [ExportPage] Session check:', {
      hasSession: !!session,
      sessionCheckResult,
      authenticated: session?.authenticated,
      userEmail: session?.user?.email
    });
    
    if (!session || sessionCheckResult === 'no_session') {
      const error = 'No active session. Please sign in and try again.';
      console.error('❌ [ExportPage]', error);
      setExportError(error);
      return;
    }
    
    // Log current cookies for debugging
    if (typeof document !== 'undefined') {
      const cookies = document.cookie.split(';').map(c => c.trim());
      const sidCookie = cookies.find(c => c.startsWith('sid='));
      const sessionTokenCookie = cookies.find(c => c.startsWith('session_token='));
      console.log('🍪 [ExportPage] Cookie status before export:', {
        hasSid: !!sidCookie,
        hasSessionToken: !!sessionTokenCookie,
        sidLength: sidCookie ? sidCookie.length : 0,
        sessionTokenLength: sessionTokenCookie ? sessionTokenCookie.length : 0
      });
      
      // Pre-flight session check
      console.log('🔍 [ExportPage] Performing pre-flight session check...');
      try {
        const preFlightResponse = await fetch('/api/auth/session-v2', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        
        console.log('🔍 [ExportPage] Pre-flight response:', {
          status: preFlightResponse.status,
          ok: preFlightResponse.ok,
          statusText: preFlightResponse.statusText,
          headers: Object.fromEntries(preFlightResponse.headers.entries())
        });
        
        if (!preFlightResponse.ok) {
          const errorText = await preFlightResponse.text();
          console.error('❌ [ExportPage] Pre-flight check failed:', errorText.substring(0, 200));
          setExportError('Session validation failed. Please refresh the page and try again.');
          return;
        }
        
        const sessionData = await preFlightResponse.json();
        console.log('✅ [ExportPage] Pre-flight session data:', {
          hasUser: !!sessionData.user,
          userEmail: sessionData.user?.email,
          authenticated: sessionData.authenticated
        });
      } catch (preFlightError) {
        console.error('❌ [ExportPage] Pre-flight error:', preFlightError);
        setExportError('Unable to validate session. Please refresh the page and try again.');
        return;
      }
    }
    
    // Validate inputs
    if (dataTypes.length === 0) {
      const error = 'No data types selected';
      console.error('❌ [ExportPage]', error);
      setExportError(error);
      return;
    }

    setExporting(true);
    setExportProgress(10);
    
    console.log('📊 [ExportPage] Capturing analytics event');
    try {
      captureEvent('export_started', {
        dataTypes,
        format: selectedFormat,
        dateRange,
        options: includeOptions
      });
    } catch (analyticsError) {
      console.warn('⚠️ [ExportPage] Analytics error:', analyticsError);
    }

    try {
      console.log('🚀 [ExportPage] Starting export API call...');
      setExportProgress(20);

      // Prepare request body
      const requestBody = {
        dataTypes,
        format: selectedFormat,
        dateRange,
        customDateRange: dateRange === 'custom' ? customDateRange : null,
        options: includeOptions
      };
      console.log('📦 [ExportPage] Request body:', JSON.stringify(requestBody, null, 2));
      
      // Make the export API call
      console.log('📡 [ExportPage] Making POST request to /api/import-export/export-data');
      const startTime = Date.now();
      
      const response = await fetch('/api/import-export/export-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/csv, application/pdf',
          'Cache-Control': 'no-cache'
        },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });
      
      const responseTime = Date.now() - startTime;
      console.log(`📡 [ExportPage] Response received in ${responseTime}ms`);
      
      setExportProgress(50);
      
      // Log response details
      const responseHeaders = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      
      console.log('📡 [ExportPage] Response details:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length'),
        contentDisposition: response.headers.get('content-disposition'),
        headers: responseHeaders
      });

      if (!response.ok) {
        console.error('❌ [ExportPage] Export request failed');
        setExportProgress(0);
        
        let errorText = '';
        let errorData = null;
        
        try {
          // Get response body
          const contentType = response.headers.get('content-type');
          console.log('❌ [ExportPage] Error response content-type:', contentType);
          
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json();
            errorText = JSON.stringify(errorData);
            console.error('❌ [ExportPage] JSON error response:', errorData);
          } else {
            errorText = await response.text();
            console.error('❌ [ExportPage] Text error response:', errorText.substring(0, 500));
          }
        } catch (bodyError) {
          console.error('❌ [ExportPage] Failed to read error response body:', bodyError);
          errorText = 'Unable to read error response';
        }
        
        // Analyze error type
        let errorMessage = 'Export failed';
        let errorType = 'unknown';
        
        if (errorText.includes('<!DOCTYPE html>') || errorText.includes('<html>')) {
          errorType = 'html_response';
          errorMessage = 'Authentication error. Please sign in again.';
          console.error('❌ [ExportPage] Received HTML instead of data - authentication issue');
        } else if (response.status === 401) {
          errorType = 'unauthorized';
          errorMessage = 'Your session has expired. Please refresh the page and sign in again.';
          console.error('❌ [ExportPage] 401 Unauthorized - session expired');
        } else if (response.status === 403) {
          errorType = 'forbidden';
          errorMessage = 'You do not have permission to export data.';
          console.error('❌ [ExportPage] 403 Forbidden - insufficient permissions');
        } else if (response.status === 500) {
          errorType = 'server_error';
          errorMessage = 'Server error occurred. Please try again later.';
          console.error('❌ [ExportPage] 500 Server Error');
        } else if (errorData?.error) {
          errorMessage = errorData.error;
        } else if (errorData?.message) {
          errorMessage = errorData.message;
        } else if (errorData?.detail) {
          errorMessage = errorData.detail;
        }
        
        console.error('❌ [ExportPage] Error summary:', {
          status: response.status,
          statusText: response.statusText,
          errorType,
          errorMessage,
          errorText: errorText.substring(0, 200)
        });
        
        setExportError(errorMessage);
        return;
      }

      // Success - handle the file download
      console.log('✅ [ExportPage] Export successful, processing response...');
      setExportProgress(70);
      
      let blob;
      try {
        blob = await response.blob();
        console.log('✅ [ExportPage] Blob created:', {
          size: blob.size,
          type: blob.type,
          sizeKB: (blob.size / 1024).toFixed(2),
          sizeMB: (blob.size / (1024 * 1024)).toFixed(2)
        });
      } catch (blobError) {
        console.error('❌ [ExportPage] Failed to create blob:', blobError);
        setExportError('Failed to process export file');
        return;
      }
      
      setExportProgress(80);
      
      // Extract filename from Content-Disposition header or generate one
      let filename = '';
      const contentDisposition = response.headers.get('content-disposition');
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+?)"?(?:;|$)/);
        if (filenameMatch) {
          filename = filenameMatch[1];
          console.log('📄 [ExportPage] Filename from header:', filename);
        }
      }
      
      if (!filename) {
        const timestamp = new Date().toISOString().split('T')[0];
        const extension = selectedFormat === 'excel' ? 'xlsx' : selectedFormat;
        filename = `dott_export_${dataTypes.join('_')}_${timestamp}.${extension}`;
        console.log('📄 [ExportPage] Generated filename:', filename);
      }
      
      setExportProgress(90);
      
      // Create download link and trigger download
      try {
        console.log('💾 [ExportPage] Creating download link...');
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        
        console.log('💾 [ExportPage] Triggering download...');
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          console.log('🧹 [ExportPage] Cleanup completed');
        }, 100);
        
        setExportProgress(100);
        
        // Track success
        console.log('📊 [ExportPage] Tracking export success');
        try {
          captureEvent('export_completed', {
            filename,
            dataTypes,
            format: selectedFormat,
            fileSize: blob.size,
            exportTime: Date.now() - startTime
          });
        } catch (trackError) {
          console.warn('⚠️ [ExportPage] Failed to track success:', trackError);
        }
        
        // Show success message
        console.log('✅ [ExportPage] Export completed successfully!');
        
        // Navigate back after a short delay
        setTimeout(() => {
          console.log('🔙 [ExportPage] Navigating back to import-export page');
          router.push('/dashboard/import-export');
        }, 2000);
        
      } catch (downloadError) {
        console.error('❌ [ExportPage] Download error:', downloadError);
        setExportError('Failed to download file. Please try again.');
      }

    } catch (error) {
      console.error('❌ [ExportPage] Unexpected export error:', error);
      console.error('❌ [ExportPage] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      // Track error
      try {
        captureEvent('export_error', { 
          error: error.message,
          errorType: error.name,
          dataTypes,
          format: selectedFormat
        });
      } catch (trackError) {
        console.warn('⚠️ [ExportPage] Failed to track error:', trackError);
      }
      
      setExportError(`Export failed: ${error.message}`);
    } finally {
      setExporting(false);
      if (exportProgress !== 100) {
        setExportProgress(0);
      }
      console.log('📤 [ExportPage] === handleExport END ===');
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
          <span className="ml-3 text-gray-600">Loading session...</span>
        </div>
      </div>
    );
  }

  // Show error if no session
  if (!session || sessionCheckResult === 'no_session') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-900 mb-2">Session Required</h2>
          <p className="text-red-700 mb-4">
            You must be signed in to export data. Please sign in and try again.
          </p>
          <button
            onClick={() => router.push('/auth/signin')}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Sign In
          </button>
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

      {/* Success Message */}
      {exportProgress === 100 && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-green-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Export Successful!</h3>
              <p className="mt-1 text-sm text-green-700">Your download should start automatically. Redirecting...</p>
            </div>
          </div>
        </div>
      )}

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