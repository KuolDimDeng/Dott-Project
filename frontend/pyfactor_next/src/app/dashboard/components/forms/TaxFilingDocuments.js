'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-hot-toast';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { useSession } from '@/hooks/useSession-v2';
import StandardSpinner, { CenteredSpinner, ButtonSpinner } from '@/components/ui/StandardSpinner';
import {
  DocumentIcon,
  DocumentTextIcon,
  PhotoIcon,
  TrashIcon,
  CloudArrowUpIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  XCircleIcon,
  DocumentArrowUpIcon,
  FolderIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

// Document type categories
const DOCUMENT_TYPES = {
  income: {
    label: 'Income Documents',
    types: [
      { value: 'w2', label: 'W-2 Form' },
      { value: '1099', label: '1099 Form' },
      { value: 'k1', label: 'Schedule K-1' },
      { value: 'income_statement', label: 'Income Statement' },
      { value: 'profit_loss', label: 'Profit & Loss Statement' }
    ]
  },
  deductions: {
    label: 'Deductions & Credits',
    types: [
      { value: 'receipts', label: 'Business Receipts' },
      { value: 'mileage_log', label: 'Mileage Log' },
      { value: 'home_office', label: 'Home Office Expenses' },
      { value: 'charitable', label: 'Charitable Donations' },
      { value: 'medical', label: 'Medical Expenses' }
    ]
  },
  business: {
    label: 'Business Documents',
    types: [
      { value: 'ein_letter', label: 'EIN Letter' },
      { value: 'business_license', label: 'Business License' },
      { value: 'bank_statements', label: 'Bank Statements' },
      { value: 'credit_card_statements', label: 'Credit Card Statements' },
      { value: 'loan_documents', label: 'Loan Documents' }
    ]
  },
  tax_forms: {
    label: 'Tax Forms',
    types: [
      { value: 'prior_tax_return', label: 'Prior Year Tax Return' },
      { value: 'estimated_payments', label: 'Estimated Tax Payments' },
      { value: 'state_tax_forms', label: 'State Tax Forms' },
      { value: 'local_tax_forms', label: 'Local Tax Forms' },
      { value: 'other_tax_forms', label: 'Other Tax Forms' }
    ]
  }
};

// File type validations
const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc']
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function TaxFilingDocuments() {
  const { user, loading: sessionLoading } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [tenantId, setTenantId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  // Initialize tenant ID
  useEffect(() => {
    const initialize = async () => {
      try {
        const id = await getSecureTenantId();
        if (id) {
          setTenantId(id);
          fetchDocuments(id);
        }
      } catch (error) {
        console.error('[TaxFilingDocuments] Error during initialization:', error);
        toast.error('Failed to initialize');
      }
    };

    if (!sessionLoading) {
      initialize();
    }
  }, [sessionLoading]);

  // Fetch existing documents
  const fetchDocuments = async (tenantId) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/taxes/documents?tenantId=${tenantId}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      } else {
        console.error('[TaxFilingDocuments] Failed to fetch documents');
      }
    } catch (error) {
      console.error('[TaxFilingDocuments] Error fetching documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setIsLoading(false);
    }
  };

  // Upload file to backend
  const uploadFile = async (file, documentType) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);
    formData.append('tenantId', tenantId);

    try {
      // Create XMLHttpRequest for progress tracking
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(prev => ({
              ...prev,
              [file.name]: percentComplete
            }));
          }
        });

        xhr.onload = function() {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } else {
            reject(new Error('Upload failed'));
          }
        };

        xhr.onerror = function() {
          reject(new Error('Upload failed'));
        };

        xhr.open('POST', '/api/taxes/documents/upload');
        xhr.withCredentials = true;
        xhr.send(formData);
      });
    } catch (error) {
      console.error('[TaxFilingDocuments] Upload error:', error);
      throw error;
    }
  };

  // Handle file drop
  const onDrop = useCallback(async (acceptedFiles, rejectedFiles) => {
    // Handle rejected files
    rejectedFiles.forEach(file => {
      const error = file.errors[0];
      if (error.code === 'file-too-large') {
        toast.error(`${file.file.name} is too large. Maximum size is 10MB.`);
      } else if (error.code === 'file-invalid-type') {
        toast.error(`${file.file.name} is not a supported file type.`);
      }
    });

    // Process accepted files
    for (const file of acceptedFiles) {
      try {
        // Show document type selection modal
        const documentType = await selectDocumentType(file);
        if (!documentType) {
          toast.error('Please select a document type');
          continue;
        }

        toast.loading(`Uploading ${file.name}...`, { id: file.name });

        const response = await uploadFile(file, documentType);

        if (response.success) {
          toast.success(`${file.name} uploaded successfully`, { id: file.name });
          
          // Add to documents list with preview
          const newDocument = {
            id: response.documentId,
            name: file.name,
            type: documentType,
            size: file.size,
            uploadedAt: new Date().toISOString(),
            url: response.url,
            thumbnailUrl: response.thumbnailUrl,
            mimeType: file.type
          };

          setDocuments(prev => [...prev, newDocument]);
        } else {
          throw new Error(response.error || 'Upload failed');
        }
      } catch (error) {
        console.error('[TaxFilingDocuments] Error uploading file:', error);
        toast.error(`Failed to upload ${file.name}`, { id: file.name });
      } finally {
        // Clear progress
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[file.name];
          return newProgress;
        });
      }
    }
  }, [tenantId]);

  // Document type selection helper
  const selectDocumentType = (file) => {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50';
      modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full">
          <h3 class="text-lg font-semibold text-gray-900 mb-4">Select Document Type</h3>
          <p class="text-sm text-gray-600 mb-4">File: ${file.name}</p>
          <select id="documentTypeSelect" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4">
            <option value="">Choose document type...</option>
            ${Object.entries(DOCUMENT_TYPES).map(([category, data]) => `
              <optgroup label="${data.label}">
                ${data.types.map(type => `
                  <option value="${type.value}">${type.label}</option>
                `).join('')}
              </optgroup>
            `).join('')}
          </select>
          <div class="flex gap-3">
            <button id="cancelBtn" class="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button id="confirmBtn" class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Upload
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      const select = modal.querySelector('#documentTypeSelect');
      const cancelBtn = modal.querySelector('#cancelBtn');
      const confirmBtn = modal.querySelector('#confirmBtn');

      const cleanup = () => {
        document.body.removeChild(modal);
      };

      cancelBtn.onclick = () => {
        cleanup();
        resolve(null);
      };

      confirmBtn.onclick = () => {
        const value = select.value;
        cleanup();
        resolve(value);
      };

      // Also handle clicking outside
      modal.onclick = (e) => {
        if (e.target === modal) {
          cleanup();
          resolve(null);
        }
      };
    });
  };

  // Delete document
  const deleteDocument = async (documentId) => {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      const response = await fetch(`/api/taxes/documents/${documentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tenantId })
      });

      if (response.ok) {
        toast.success('Document deleted successfully');
        setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      } else {
        throw new Error('Failed to delete document');
      }
    } catch (error) {
      console.error('[TaxFilingDocuments] Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  // Download document
  const downloadDocument = async (document) => {
    try {
      const response = await fetch(`/api/taxes/documents/${document.id}/download?tenantId=${tenantId}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = document.name;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('[TaxFilingDocuments] Error downloading document:', error);
      toast.error('Failed to download document');
    }
  };

  // Setup dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: true
  });

  // Get document type label
  const getDocumentTypeLabel = (typeValue) => {
    for (const [category, data] of Object.entries(DOCUMENT_TYPES)) {
      const type = data.types.find(t => t.value === typeValue);
      if (type) return type.label;
    }
    return typeValue;
  };

  // Get file icon based on mime type
  const getFileIcon = (mimeType) => {
    if (mimeType.includes('pdf')) {
      return <DocumentTextIcon className="h-8 w-8 text-red-500" />;
    } else if (mimeType.includes('image')) {
      return <PhotoIcon className="h-8 w-8 text-blue-500" />;
    } else {
      return <DocumentIcon className="h-8 w-8 text-gray-500" />;
    }
  };

  // Filter documents by category
  const filteredDocuments = selectedCategory === 'all' 
    ? documents 
    : documents.filter(doc => {
        for (const [category, data] of Object.entries(DOCUMENT_TYPES)) {
          if (category === selectedCategory) {
            return data.types.some(type => type.value === doc.type);
          }
        }
        return false;
      });

  if (sessionLoading) {
    return <CenteredSpinner size="large" text="Loading documents..." showText={true} />;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <DocumentArrowUpIcon className="h-6 w-6 text-blue-600 mr-2" />
          Tax Filing Documents
        </h1>
        <p className="text-gray-600 mt-1">Upload and manage your tax-related documents</p>
      </div>

      {/* Info Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex">
          <InformationCircleIcon className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Document Requirements</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Supported formats: PDF, JPG, PNG, DOCX</li>
                <li>Maximum file size: 10MB per document</li>
                <li>All documents are encrypted and stored securely</li>
                <li>Organize documents by type for easier tax filing</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400 bg-gray-50'
          }`}
        >
          <input {...getInputProps()} />
          <CloudArrowUpIcon className={`mx-auto h-12 w-12 ${
            isDragActive ? 'text-blue-500' : 'text-gray-400'
          }`} />
          <p className="mt-2 text-sm text-gray-900">
            {isDragActive 
              ? 'Drop files here...' 
              : 'Drag and drop files here, or click to browse'
            }
          </p>
          <p className="mt-1 text-xs text-gray-500">
            PDF, JPG, PNG, DOCX up to 10MB
          </p>
        </div>

        {/* Upload Progress */}
        {Object.entries(uploadProgress).length > 0 && (
          <div className="mt-4 space-y-2">
            {Object.entries(uploadProgress).map(([filename, progress]) => (
              <div key={filename} className="bg-gray-100 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">{filename}</span>
                  <span className="text-sm text-gray-600">{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Document Categories Filter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center space-x-2 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Documents ({documents.length})
          </button>
          {Object.entries(DOCUMENT_TYPES).map(([key, data]) => {
            const count = documents.filter(doc => 
              data.types.some(type => type.value === doc.type)
            ).length;
            
            return (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                  selectedCategory === key
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {data.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <FolderIcon className="h-5 w-5 text-gray-600 mr-2" />
            Uploaded Documents
          </h2>
        </div>

        {isLoading ? (
          <div className="p-12">
            <CenteredSpinner size="large" text="Loading documents..." showText={true} />
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="p-12 text-center">
            <DocumentIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
            <p className="mt-1 text-sm text-gray-500">
              {selectedCategory === 'all' 
                ? 'Get started by uploading your first document.' 
                : 'No documents in this category.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredDocuments.map((document) => (
              <div key={document.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-start space-x-3">
                    {/* File Icon or Thumbnail */}
                    <div className="flex-shrink-0">
                      {document.thumbnailUrl && document.mimeType.includes('image') ? (
                        <img 
                          src={document.thumbnailUrl} 
                          alt={document.name}
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        getFileIcon(document.mimeType)
                      )}
                    </div>

                    {/* Document Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {document.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {getDocumentTypeLabel(document.type)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {(document.size / 1024 / 1024).toFixed(2)} MB • 
                        Uploaded {new Date(document.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedDocument(document);
                        setShowPreview(true);
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600"
                      title="Preview"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => downloadDocument(document)}
                      className="p-2 text-gray-400 hover:text-gray-600"
                      title="Download"
                    >
                      <ArrowDownTrayIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => deleteDocument(document.id)}
                      className="p-2 text-gray-400 hover:text-red-600"
                      title="Delete"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Document Preview Modal */}
      {showPreview && selectedDocument && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedDocument.name}
              </h3>
              <button
                onClick={() => {
                  setShowPreview(false);
                  setSelectedDocument(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-4 overflow-auto" style={{ maxHeight: 'calc(90vh - 8rem)' }}>
              {selectedDocument.mimeType.includes('image') ? (
                <img 
                  src={selectedDocument.url} 
                  alt={selectedDocument.name}
                  className="max-w-full h-auto mx-auto"
                />
              ) : selectedDocument.mimeType.includes('pdf') ? (
                <iframe
                  src={selectedDocument.url}
                  className="w-full h-[70vh]"
                  title={selectedDocument.name}
                />
              ) : (
                <div className="text-center py-12">
                  <DocumentIcon className="mx-auto h-16 w-16 text-gray-400" />
                  <p className="mt-2 text-gray-600">
                    Preview not available for this file type
                  </p>
                  <button
                    onClick={() => downloadDocument(selectedDocument)}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Download to View
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}