import React, { useState, useRef } from 'react';
import { 
  ArrowUpTrayIcon, 
  XMarkIcon, 
  DocumentIcon, 
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { unifiedInventoryService } from '@/services/unifiedInventoryService';
import { logger } from '@/utils/logger';

/**
 * Product Import Dialog Component
 * Provides UI for importing products from CSV, Excel, or other formats
 */
const ProductImportDialog = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [importStats, setImportStats] = useState(null);
  const [step, setStep] = useState('upload'); // upload, mapping, preview, importing, complete
  const fileInputRef = useRef(null);

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setError(null);
      setImportStats(null);
      setStep('upload');
    }
  }, [isOpen]);

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    if (!selectedFile) {
      return;
    }
    
    // Validate file type
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/json'
    ];
    
    if (!validTypes.includes(selectedFile.type)) {
      setError('Invalid file type. Please upload CSV, Excel, or JSON file.');
      return;
    }
    
    setFile(selectedFile);
    setError(null);
    setStep('mapping');
  };

  // Trigger file input click
  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  // Handle import
  const handleImport = async () => {
    try {
      setLoading(true);
      setError(null);
      setStep('importing');
      
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await unifiedInventoryService.importProducts(formData);
      
      setImportStats(response);
      setStep('complete');
      onSuccess?.(response);
    } catch (error) {
      logger.error('Error importing products:', error);
      setError(error.message || 'Failed to import products');
      setStep('mapping');
    } finally {
      setLoading(false);
    }
  };

  // If dialog is not open, return null
  if (!isOpen) {
    return null;
  }

  return (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Import Products</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        {/* Content */}
        <div className="mb-6">
          {step === 'upload' && (
            <div className="text-center">
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 mb-4 cursor-pointer hover:bg-gray-50"
                onClick={triggerFileInput}
              >
                <ArrowUpTrayIcon className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                <p className="text-sm text-gray-600 mb-1">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                  CSV, Excel, or JSON (max 10MB)
                </p>
                <input
                  type="file"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv,.xlsx,.xls,.json"
                />
              </div>
              
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-4">
                  <ExclamationTriangleIcon className="h-5 w-5 inline-block mr-1" />
                  {error}
                </div>
              )}
              
              <div className="text-xs text-gray-500">
                <p className="mb-2">Supported file formats:</p>
                <ul className="list-disc text-left ml-5">
                  <li>CSV with headers</li>
                  <li>Excel spreadsheets (.xlsx, .xls)</li>
                  <li>JSON arrays of product objects</li>
                </ul>
              </div>
            </div>
          )}
          
          {step === 'mapping' && (
            <div>
              <div className="flex items-center mb-4">
                <DocumentIcon className="h-8 w-8 text-blue-500 mr-3" />
                <div>
                  <p className="font-medium">{file?.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file?.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-md mb-4">
                <p className="text-sm text-blue-700">
                  We'll try to automatically map columns from your file to product fields.
                  You'll have a chance to review and adjust the mapping before import.
                </p>
              </div>
              
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-4">
                  <ExclamationTriangleIcon className="h-5 w-5 inline-block mr-1" />
                  {error}
                </div>
              )}
            </div>
          )}
          
          {step === 'importing' && (
            <div className="text-center p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-700 mb-2">Importing products...</p>
              <p className="text-sm text-gray-500">
                This may take a few moments depending on file size
              </p>
            </div>
          )}
          
          {step === 'complete' && importStats && (
            <div className="text-center">
              <div className="bg-green-100 rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4">
                <CheckIcon className="h-8 w-8 text-green-600" />
              </div>
              
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Import Complete
              </h3>
              
              <div className="bg-gray-50 rounded-lg p-4 text-left mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Total Records</p>
                    <p className="text-lg font-medium">{importStats.total_records || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Imported</p>
                    <p className="text-lg font-medium">{importStats.imported || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Updated</p>
                    <p className="text-lg font-medium">{importStats.updated || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Failed</p>
                    <p className="text-lg font-medium">{importStats.failed || 0}</p>
                  </div>
                </div>
              </div>
              
              {importStats.failed > 0 && (
                <div className="bg-yellow-50 p-3 rounded-md text-sm text-yellow-700 mb-4">
                  <ExclamationTriangleIcon className="h-5 w-5 inline-block mr-1" />
                  Some records could not be imported. Check server logs for details.
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex justify-end space-x-3">
          {step !== 'importing' && step !== 'complete' && (
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          
          {step === 'mapping' && (
            <button
              onClick={handleImport}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Start Import
            </button>
          )}
          
          {step === 'complete' && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductImportDialog; 