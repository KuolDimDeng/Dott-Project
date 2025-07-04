'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  CheckCircleIcon, 
  XCircleIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
  CloudArrowUpIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import StandardSpinner from '@/components/ui/StandardSpinner';
import { captureEvent } from '@/lib/posthog';

const ImportProgressPage = () => {
  const router = useRouter();
  const [importStatus, setImportStatus] = useState('preparing'); // preparing, uploading, processing, validating, importing, complete, error
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({
    totalRecords: 0,
    processedRecords: 0,
    successfulRecords: 0,
    failedRecords: 0,
    duplicates: 0,
    errors: []
  });
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { id: 'upload', label: 'Uploading File', icon: CloudArrowUpIcon },
    { id: 'parse', label: 'Parsing Data', icon: DocumentDuplicateIcon },
    { id: 'validate', label: 'Validating with AI', icon: SparklesIcon },
    { id: 'import', label: 'Importing Records', icon: ArrowPathIcon },
    { id: 'complete', label: 'Import Complete', icon: CheckCircleIcon }
  ];

  useEffect(() => {
    // Get import data from session storage
    const mappingData = sessionStorage.getItem('importMappings');
    if (!mappingData) {
      router.push('/dashboard/import-export');
      return;
    }

    // Start the import process
    startImport(JSON.parse(mappingData));
  }, [router]);

  const startImport = async (importData) => {
    captureEvent('import_process_started', {
      dataType: importData.dataType,
      mappingCount: Object.keys(importData.mappings).length
    });

    try {
      // Step 1: Upload file
      setCurrentStep(0);
      setImportStatus('uploading');
      await simulateStep(20);

      // Step 2: Parse data
      setCurrentStep(1);
      setImportStatus('processing');
      await simulateStep(40);
      
      // Mock stats
      setStats(prev => ({
        ...prev,
        totalRecords: 1847,
        processedRecords: 0
      }));

      // Step 3: Validate with AI
      setCurrentStep(2);
      setImportStatus('validating');
      await simulateStep(60);

      // Step 4: Import records
      setCurrentStep(3);
      setImportStatus('importing');
      
      // Simulate progressive import
      const totalRecords = 1847;
      const batchSize = 50;
      let imported = 0;
      
      while (imported < totalRecords) {
        const batch = Math.min(batchSize, totalRecords - imported);
        imported += batch;
        
        setStats(prev => ({
          ...prev,
          processedRecords: imported,
          successfulRecords: imported - Math.floor(imported * 0.02), // 2% error rate
          failedRecords: Math.floor(imported * 0.02),
          duplicates: Math.floor(imported * 0.05) // 5% duplicates
        }));
        
        setProgress(60 + (imported / totalRecords) * 35);
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Step 5: Complete
      setCurrentStep(4);
      setImportStatus('complete');
      setProgress(100);
      
      captureEvent('import_process_completed', {
        totalRecords,
        successfulRecords: stats.successfulRecords,
        failedRecords: stats.failedRecords,
        duplicates: stats.duplicates
      });

      // Generate some mock errors for demo
      if (stats.failedRecords > 0) {
        setStats(prev => ({
          ...prev,
          errors: [
            { row: 234, field: 'unit_price', error: 'Invalid number format' },
            { row: 567, field: 'sku', error: 'Duplicate SKU found' },
            { row: 890, field: 'name', error: 'Required field is empty' }
          ]
        }));
      }

    } catch (error) {
      console.error('Import error:', error);
      setImportStatus('error');
      captureEvent('import_process_error', { error: error.message });
    }
  };

  const simulateStep = (targetProgress) => {
    return new Promise(resolve => {
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= targetProgress) {
            clearInterval(interval);
            resolve();
            return targetProgress;
          }
          return prev + 2;
        });
      }, 50);
    });
  };

  const handleViewResults = () => {
    captureEvent('import_view_results_clicked');
    // Navigate to the appropriate management page based on data type
    router.push('/dashboard/products'); // This would be dynamic based on imported data type
  };

  const handleImportMore = () => {
    captureEvent('import_more_clicked');
    sessionStorage.removeItem('importMappings');
    sessionStorage.removeItem('importFileData');
    router.push('/dashboard/import-export');
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Import Progress</h1>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isComplete = index < currentStep;
            
            return (
              <div key={step.id} className="flex-1 flex items-center">
                <div className="relative flex items-center justify-center">
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center
                    ${isComplete ? 'bg-green-500' : isActive ? 'bg-blue-500' : 'bg-gray-300'}
                    transition-colors duration-300
                  `}>
                    {isComplete ? (
                      <CheckCircleIcon className="h-6 w-6 text-white" />
                    ) : (
                      <Icon className={`h-6 w-6 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                    )}
                  </div>
                  <div className={`
                    absolute -bottom-6 text-xs font-medium whitespace-nowrap
                    ${isActive ? 'text-blue-600' : isComplete ? 'text-green-600' : 'text-gray-500'}
                  `}>
                    {step.label}
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`
                    flex-1 h-1 mx-4
                    ${isComplete ? 'bg-green-500' : 'bg-gray-300'}
                    transition-colors duration-300
                  `} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-gray-200 rounded-full h-3 mb-8 mt-12 overflow-hidden">
        <div 
          className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Status Message */}
      <div className="text-center mb-8">
        {importStatus === 'uploading' && (
          <div className="flex items-center justify-center text-gray-600">
            <StandardSpinner size="small" />
            <span className="ml-2">Uploading your file...</span>
          </div>
        )}
        {importStatus === 'processing' && (
          <div className="flex items-center justify-center text-gray-600">
            <StandardSpinner size="small" />
            <span className="ml-2">Parsing Excel data...</span>
          </div>
        )}
        {importStatus === 'validating' && (
          <div className="flex items-center justify-center text-blue-600">
            <SparklesIcon className="h-5 w-5 mr-2 animate-pulse" />
            <span>AI is validating your data...</span>
          </div>
        )}
        {importStatus === 'importing' && (
          <div className="flex items-center justify-center text-gray-600">
            <StandardSpinner size="small" />
            <span className="ml-2">Importing {stats.processedRecords} of {stats.totalRecords} records...</span>
          </div>
        )}
        {importStatus === 'complete' && (
          <div className="text-green-600 font-medium">
            ✓ Import completed successfully!
          </div>
        )}
        {importStatus === 'error' && (
          <div className="text-red-600 font-medium">
            ✗ Import failed. Please try again.
          </div>
        )}
      </div>

      {/* Statistics */}
      {stats.totalRecords > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Import Summary</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalRecords}</div>
              <div className="text-sm text-gray-500">Total Records</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{stats.successfulRecords}</div>
              <div className="text-sm text-gray-500">Imported</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">{stats.duplicates}</div>
              <div className="text-sm text-gray-500">Duplicates</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{stats.failedRecords}</div>
              <div className="text-sm text-gray-500">Failed</div>
            </div>
          </div>
        </div>
      )}

      {/* Errors */}
      {stats.errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-red-900 mb-2">Import Errors</h3>
          <div className="space-y-1 text-sm text-red-700">
            {stats.errors.slice(0, 3).map((error, index) => (
              <div key={index}>
                Row {error.row}: {error.error} (Field: {error.field})
              </div>
            ))}
            {stats.errors.length > 3 && (
              <div className="text-red-600 font-medium mt-2">
                And {stats.errors.length - 3} more errors...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      {importStatus === 'complete' && (
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={handleImportMore}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Import More Data
          </button>
          <button
            onClick={handleViewResults}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            View Imported Data
          </button>
        </div>
      )}

      {/* AI Insights */}
      {importStatus === 'complete' && stats.failedRecords > 0 && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <SparklesIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-blue-900">AI Import Insights</h3>
              <p className="text-sm text-blue-700 mt-1">
                Most errors were related to number formatting. Consider using consistent decimal 
                separators and removing currency symbols from price fields before importing.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportProgressPage;