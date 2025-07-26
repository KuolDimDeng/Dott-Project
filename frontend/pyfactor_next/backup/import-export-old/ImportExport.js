'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRightIcon, ArrowUpTrayIcon, ArrowDownTrayIcon, CloudArrowUpIcon, DocumentTextIcon, InformationCircleIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline';
import { captureEvent } from '@/lib/posthog';
import StandardSpinner from '@/components/ui/StandardSpinner';
import { useSession } from '@/hooks/useSession-v2';
import * as Sentry from '@sentry/nextjs';
import { logger } from '@/utils/logger';
import { useSentryTracking } from '@/hooks/useSentryTracking';
import { useTranslation } from 'react-i18next';

const ImportExport = () => {
  const router = useRouter();
  const { t } = useTranslation('navigation');
  const { session, loading: sessionLoading } = useSession();
  const { trackUserAction, trackPageView, trackPerformance, captureError } = useSentryTracking();
  const [mode, setMode] = useState(null); // null, 'import', 'export'
  const [selectedDataTypes, setSelectedDataTypes] = useState([]);
  const [importSource, setImportSource] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [limits, setLimits] = useState(null);
  const [checkingLimits, setCheckingLimits] = useState(true);
  const fileInputRef = useRef(null);

  const checkImportLimits = useCallback(async () => {
    console.log('[ImportExport] checkImportLimits called');
    console.log('[ImportExport] Session state:', { session, loading: sessionLoading });
    
    let span;
    try {
      span = Sentry.startSpan({ name: 'check-import-limits' });
    } catch (sentryError) {
      console.error('Failed to start Sentry span:', sentryError);
    }
    
    try {
      console.log('[ImportExport] Fetching /api/import-export/check-limits');
      const response = await fetch('/api/import-export/check-limits', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('[ImportExport] check-limits response:', {
        status: response.status,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[ImportExport] Limits data received:', data);
        setLimits(data);
        if (logger && logger.info) {
          logger.info('Import limits checked successfully', { limits: data });
        }
      } else {
        const errorText = await response.text();
        console.error(`[ImportExport] Failed to check limits: ${response.status}`, errorText);
        throw new Error(`Failed to check limits: ${response.status}`);
      }
    } catch (error) {
      console.error('[ImportExport] Error in checkImportLimits:', error);
      if (logger && logger.error) {
        logger.error('Failed to check limits', error);
      }
      if (Sentry && Sentry.captureException) {
        Sentry.captureException(error, {
          tags: { component: 'ImportExport', action: 'checkLimits' }
        });
      }
      
      // Set default limits on error so the page still works
      console.log('[ImportExport] Setting default limits due to error');
      setLimits({
        plan: 'FREE',
        limits: {
          importsPerMonth: 3,
          aiAnalysisPerMonth: 3,
          maxRowsPerImport: 100,
          maxFileSize: 1048576 // 1MB
        },
        usage: {
          importsUsed: 0,
          aiAnalysisUsed: 0
        },
        remaining: {
          imports: 3,
          aiAnalysis: 3,
          canImport: true,
          canUseAI: true
        }
      });
    } finally {
      setCheckingLimits(false);
      if (span && span.end) {
        span.end();
      }
    }
  }, [session, sessionLoading]);

  // Track page view and check limits
  useEffect(() => {
    console.log('[ImportExport] useEffect triggered');
    console.log('[ImportExport] Session loading state:', sessionLoading);
    console.log('[ImportExport] Session data:', session);
    
    try {
      if (captureEvent) {
        captureEvent('import_export_page_viewed');
      }
      if (trackPageView) {
        trackPageView('Import/Export', { 
          userRole: session?.user?.role,
          subscriptionPlan: session?.user?.subscriptionPlan 
        });
      }
      
      // Only check limits if session is loaded and we have a user
      if (!sessionLoading && session?.user) {
        console.log('[ImportExport] Session loaded, checking import limits');
        checkImportLimits();
      } else if (!sessionLoading) {
        console.log('[ImportExport] No session user, skipping limit check');
        setCheckingLimits(false);
      } else {
        console.log('[ImportExport] Waiting for session to load');
      }
    } catch (error) {
      console.error('[ImportExport] Error in useEffect:', error);
    }
  }, [trackPageView, session, sessionLoading, checkImportLimits, captureEvent]);

  // Data types available for import/export
  const dataTypes = [
    { id: 'products', label: t('importExport.dataTypes.products.label', 'Products/Services'), description: t('importExport.dataTypes.products.description', 'Product catalog with prices and inventory') },
    { id: 'customers', label: t('importExport.dataTypes.customers.label', 'Customers'), description: t('importExport.dataTypes.customers.description', 'Customer database with contact information') },
    { id: 'invoices', label: t('importExport.dataTypes.invoices.label', 'Invoices'), description: t('importExport.dataTypes.invoices.description', 'Sales invoices and payment history') },
    { id: 'bills', label: t('importExport.dataTypes.bills.label', 'Bills & Expenses'), description: t('importExport.dataTypes.bills.description', 'Purchase bills and expense records') },
    { id: 'chart-of-accounts', label: t('importExport.dataTypes.chartOfAccounts.label', 'Chart of Accounts'), description: t('importExport.dataTypes.chartOfAccounts.description', 'Account structure and balances') },
    { id: 'tax-rates', label: t('importExport.dataTypes.taxRates.label', 'Tax Rates'), description: t('importExport.dataTypes.taxRates.description', 'Tax configurations by location') },
    { id: 'vendors', label: t('importExport.dataTypes.vendors.label', 'Vendors'), description: t('importExport.dataTypes.vendors.description', 'Supplier database and payment terms') },
    { id: 'employees', label: t('importExport.dataTypes.employees.label', 'Employees'), description: t('importExport.dataTypes.employees.description', 'Employee records and payroll data') },
  ];

  // Import sources
  const importSources = [
    { 
      id: 'excel', 
      label: t('importExport.importSources.excel.label', 'Excel/CSV'), 
      icon: DocumentTextIcon,
      description: t('importExport.importSources.excel.description', 'Upload .xlsx or .csv files'),
      supported: true 
    },
    { 
      id: 'quickbooks', 
      label: t('importExport.importSources.quickbooks.label', 'QuickBooks'), 
      icon: CloudArrowUpIcon,
      description: t('importExport.importSources.quickbooks.description', 'Direct import from QuickBooks Online'),
      supported: true 
    },
    { 
      id: 'wave', 
      label: t('importExport.importSources.wave.label', 'Wave'), 
      icon: CloudArrowUpIcon,
      description: t('importExport.importSources.wave.description', 'Import from Wave Accounting'),
      supported: false 
    },
    { 
      id: 'xero', 
      label: t('importExport.importSources.xero.label', 'Xero'), 
      icon: CloudArrowUpIcon,
      description: t('importExport.importSources.xero.description', 'Import from Xero'),
      supported: false 
    },
    { 
      id: 'shopify', 
      label: t('importExport.importSources.shopify.label', 'Shopify'), 
      icon: CloudArrowUpIcon,
      description: t('importExport.importSources.shopify.description', 'Import products and customers from Shopify'),
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
    const startTime = Date.now();
    setMode(selectedMode);
    
    try {
      if (captureEvent) {
        captureEvent(`import_export_mode_selected`, { mode: selectedMode });
      }
      if (trackUserAction) {
        trackUserAction('Mode Selected', { 
          mode: selectedMode,
          userPlan: session?.user?.subscriptionPlan 
        });
      }
      if (trackPerformance) {
        trackPerformance('mode-selection', startTime);
      }
    } catch (error) {
      console.error('Error in handleModeSelect tracking:', error);
    }
  };

  const handleImportSourceSelect = (source) => {
    if (!source.supported) {
      setError(t('importExport.errors.integrationComingSoon', `{{sourceName}} integration coming soon!`, { sourceName: source.label }));
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    setImportSource(source);
    
    try {
      if (captureEvent) {
        captureEvent('import_source_selected', { source: source.id });
      }
    } catch (error) {
      console.error('Error capturing event:', error);
    }
    
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
      setError(t('importExport.errors.selectDataType', 'Please select at least one data type to import'));
      return;
    }

    // Check import limits
    if (limits && !limits.remaining.canImport) {
      setError(t('importExport.errors.importLimitReached', `You've reached your monthly import limit ({{limit}} imports). Please upgrade your plan for more imports.`, { limit: limits.limits.importsPerMonth }));
      return;
    }

    // Check file size limits
    if (limits && file.size > limits.limits.maxFileSize) {
      setError(t('importExport.errors.fileSizeExceeded', `File size exceeds limit. Maximum allowed: {{maxSize}}MB`, { maxSize: (limits.limits.maxFileSize / (1024 * 1024)).toFixed(1) }));
      return;
    }

    setLoading(true);
    
    try {
      if (captureEvent) {
        captureEvent('import_file_uploaded', { 
          fileName: file.name,
          fileSize: file.size,
          dataTypes: selectedDataTypes 
        });
      }
    } catch (error) {
      console.error('Error capturing file upload event:', error);
    }
    
    try {
      if (trackUserAction) {
        trackUserAction('File Upload Started', {
          fileName: file.name,
          fileSize: file.size,
          dataTypes: selectedDataTypes,
          fileType: file.type
        });
      }
    } catch (error) {
      console.error('Error tracking file upload:', error);
    }

    // Update usage count
    try {
      await fetch('/api/import-export/check-limits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'import' })
      });
    } catch (error) {
      console.error('Failed to update usage:', error);
    }

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

  const handleExportStart = async () => {
    console.log('[ImportExport] === handleExportStart called ===');
    console.log('[ImportExport] Selected data types:', selectedDataTypes);
    console.log('[ImportExport] Full session object:', session);
    console.log('[ImportExport] Session state:', { 
      authenticated: session?.authenticated,
      hasUser: !!session?.user,
      userEmail: session?.user?.email,
      userRole: session?.user?.role,
      tenantId: session?.user?.tenant_id,
      sessionToken: session?.token || session?.sid
    });
    
    // Log cookies for debugging
    if (typeof document !== 'undefined') {
      console.log('[ImportExport] Current cookies:', document.cookie);
      const cookies = document.cookie.split(';').map(c => c.trim());
      const hasSid = cookies.some(c => c.startsWith('sid='));
      const hasSessionToken = cookies.some(c => c.startsWith('session_token='));
      console.log('[ImportExport] Cookie check:', { hasSid, hasSessionToken });
    }
    
    if (selectedDataTypes.length === 0) {
      setError(t('importExport.errors.selectDataTypeExport', 'Please select at least one data type to export'));
      return;
    }

    // Test the session validation before navigation
    try {
      console.log('[ImportExport] Testing session validation...');
      const testResponse = await fetch('/api/import-export/check-limits', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('[ImportExport] Session test response:', {
        status: testResponse.status,
        ok: testResponse.ok,
        statusText: testResponse.statusText,
        headers: Object.fromEntries(testResponse.headers.entries())
      });
      
      if (!testResponse.ok) {
        const errorText = await testResponse.text();
        console.error('[ImportExport] Session validation failed:', {
          status: testResponse.status,
          errorText: errorText.substring(0, 500)
        });
        
        if (testResponse.status === 401) {
          console.error('[ImportExport] 401 Unauthorized - Session invalid or expired');
          setError(t('importExport.errors.sessionExpired', 'Your session has expired. Please refresh the page and sign in again.'));
        } else {
          setError(t('importExport.errors.sessionValidationFailed', 'Session validation failed. Please refresh the page and try again.'));
        }
        return;
      }
      
      const testData = await testResponse.json();
      console.log('[ImportExport] Session validation successful:', testData);
      
    } catch (error) {
      console.error('[ImportExport] Session validation error:', error);
      setError(t('importExport.errors.unableToValidate', 'Unable to validate session. Please refresh the page and try again.'));
      return;
    }

    try {
      if (captureEvent) {
        captureEvent('export_started', { dataTypes: selectedDataTypes });
      }
    } catch (error) {
      console.error('[ImportExport] Error capturing export event:', error);
    }
    
    // Navigate to export options
    const exportUrl = `/dashboard/import-export/export?types=${selectedDataTypes.join(',')}`;
    console.log('[ImportExport] Navigating to:', exportUrl);
    console.log('[ImportExport] === handleExportStart complete ===');
    router.push(exportUrl);
  };

  // Reset file input when source changes
  useEffect(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [importSource]);

  // Loading state
  if (sessionLoading || checkingLimits) {
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

  if (!mode) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold text-black mb-4 flex items-center">
          <ArrowsUpDownIcon className="h-6 w-6 text-blue-600 mr-2" />
          {t('importExport.title', 'Import/Export Data')}
        </h1>
        <p className="text-gray-600 mb-8">
          {t('importExport.description', 'Seamlessly migrate your business data in and out of Dott. Import from spreadsheets or other accounting software, and export your data in multiple formats. Our AI-powered field mapper makes importing data quick and accurate.')}
        </p>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Import Card */}
          <div 
            onClick={() => handleModeSelect('import')}
            className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow border-2 border-transparent hover:border-blue-500"
          >
            <div className="flex items-center mb-4">
              <ArrowDownTrayIcon className="h-12 w-12 text-blue-600" />
              <h2 className="text-xl font-semibold ml-4">{t('importExport.import.title', 'Import Data')}</h2>
            </div>
            <p className="text-gray-600 mb-4">
              {t('importExport.import.description', 'Bring your existing data into Dott from Excel, QuickBooks, or other sources.')}
            </p>
            <ul className="text-sm text-gray-500 space-y-1">
              <li>• {t('importExport.import.features.aiMapping', 'AI-powered field mapping')}</li>
              <li>• {t('importExport.import.features.multipleFormats', 'Support for multiple file formats')}</li>
              <li>• {t('importExport.import.features.dataValidation', 'Automatic data validation')}</li>
              <li>• {t('importExport.import.features.bulkImport', 'Bulk import capabilities')}</li>
            </ul>
            <div className="mt-4 flex items-center text-blue-600">
              <span className="text-sm font-medium">{t('importExport.getStarted', 'Get Started')}</span>
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
              <h2 className="text-xl font-semibold ml-4">{t('importExport.export.title', 'Export Data')}</h2>
            </div>
            <p className="text-gray-600 mb-4">
              {t('importExport.export.description', 'Download your Dott data in various formats for backup or use in other applications.')}
            </p>
            <ul className="text-sm text-gray-500 space-y-1">
              <li>• {t('importExport.export.features.excelCsv', 'Export to Excel or CSV')}</li>
              <li>• {t('importExport.export.features.financialFormats', 'Financial report formats')}</li>
              <li>• {t('importExport.export.features.accountantReady', 'Accountant-ready files')}</li>
              <li>• {t('importExport.export.features.scheduledExports', 'Scheduled exports available')}</li>
            </ul>
            <div className="mt-4 flex items-center text-green-600">
              <span className="text-sm font-medium">{t('importExport.getStarted', 'Get Started')}</span>
              <ChevronRightIcon className="h-4 w-4 ml-1" />
            </div>
          </div>
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">{t('importExport.aiFeature.title', 'New Feature: AI-Powered Data Mapper')}</h3>
          <p className="text-sm text-blue-700">
            {t('importExport.aiFeature.description', "Our intelligent field mapping system uses Claude AI to automatically match your data fields with Dott's database structure, making imports faster and more accurate than ever.")}
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
            {t('importExport.backButton', 'Back to Import/Export')}
          </button>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('importExport.import.title', 'Import Data')}</h1>

        {/* Import Limits Display */}
        {limits && (
          <div className={`rounded-lg p-4 mb-6 ${
            limits.remaining.canImport ? 'bg-blue-50 border border-blue-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-start">
              <InformationCircleIcon className={`h-5 w-5 mt-0.5 mr-2 flex-shrink-0 ${
                limits.remaining.canImport ? 'text-blue-600' : 'text-red-600'
              }`} />
              <div className="flex-1">
                <h3 className={`font-medium ${
                  limits.remaining.canImport ? 'text-blue-900' : 'text-red-900'
                }`}>
                  {t('importExport.limits.title', 'Import Limits - {{plan}} Plan', { plan: limits.plan })}
                </h3>
                <div className="text-sm mt-1">
                  <p className={limits.remaining.canImport ? 'text-blue-700' : 'text-red-700'}>
                    • {t('importExport.limits.importsUsed', 'Imports used: {{used}} of {{limit}} this month', { used: limits.usage.importsUsed, limit: limits.limits.importsPerMonth })}
                  </p>
                  <p className={limits.remaining.canImport ? 'text-blue-700' : 'text-red-700'}>
                    • {t('importExport.limits.aiAnalysisUsed', 'AI analysis used: {{used}} of {{limit}}', { used: limits.usage.aiAnalysisUsed, limit: limits.limits.aiAnalysisPerMonth })}
                  </p>
                  <p className={limits.remaining.canImport ? 'text-blue-700' : 'text-red-700'}>
                    • {t('importExport.limits.maxFileSize', 'Max file size: {{size}}MB', { size: (limits.limits.maxFileSize / (1024 * 1024)).toFixed(0) })}
                  </p>
                  <p className={limits.remaining.canImport ? 'text-blue-700' : 'text-red-700'}>
                    • {t('importExport.limits.maxRows', 'Max rows per import: {{rows}}', { rows: limits.limits.maxRowsPerImport.toLocaleString() })}
                  </p>
                </div>
                {!limits.remaining.canImport && (
                  <button className="mt-2 text-sm font-medium text-red-700 hover:text-red-800">
                    {t('importExport.limits.upgradePlan', 'Upgrade Plan')} →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Select Data Types */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">{t('importExport.import.step1Title', 'Step 1: What would you like to import?')}</h2>
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
          <h2 className="text-lg font-semibold mb-4">{t('importExport.import.step2Title', 'Step 2: How would you like to import?')}</h2>
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
                    <div className="text-xs text-orange-600 mt-2">{t('importExport.comingSoon', 'Coming Soon')}</div>
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
            <span className="ml-2 text-gray-600">{t('importExport.processingFile', 'Processing file...')}</span>
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
            {t('importExport.backButton', 'Back to Import/Export')}
          </button>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('importExport.export.title', 'Export Data')}</h1>

        {/* Select Data Types */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">{t('importExport.export.selectData', 'Select data to export')}</h2>
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
              {t('importExport.export.dataTypesSelected', '{{count}} data type selected', { count: selectedDataTypes.length })}
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
              {t('importExport.export.continueButton', 'Continue to Export Options')}
            </button>
          </div>
        </div>

        {/* Export format options */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">{t('importExport.export.formatsTitle', 'Export Formats Available')}</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• {t('importExport.export.formats.excel', 'Excel (.xlsx) - Recommended for reimporting')}</li>
            <li>• {t('importExport.export.formats.csv', 'CSV (.csv) - Universal compatibility')}</li>
            <li>• {t('importExport.export.formats.pdf', 'PDF - For reports and documentation')}</li>
            <li>• {t('importExport.export.formats.quickbooks', 'QuickBooks format - For accountant handoff')}</li>
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