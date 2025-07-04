'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeftIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  XCircleIcon,
  ArrowRightIcon,
  InformationCircleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import StandardSpinner from '@/components/ui/StandardSpinner';
import { captureEvent } from '@/lib/posthog';

const DataMapperPage = () => {
  const router = useRouter();
  const [fileData, setFileData] = useState(null);
  const [excelHeaders, setExcelHeaders] = useState([]);
  const [dottFields, setDottFields] = useState([]);
  const [mappings, setMappings] = useState({});
  const [aiSuggestions, setAiSuggestions] = useState({});
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [validationResults, setValidationResults] = useState({});
  const [selectedDataType, setSelectedDataType] = useState('products');

  // Field definitions for each data type
  const fieldDefinitions = {
    products: [
      { id: 'name', label: 'Product Name', required: true, type: 'string' },
      { id: 'sku', label: 'SKU/Code', required: false, type: 'string' },
      { id: 'description', label: 'Description', required: false, type: 'text' },
      { id: 'unit_price', label: 'Unit Price', required: true, type: 'number' },
      { id: 'cost_price', label: 'Cost Price', required: false, type: 'number' },
      { id: 'category', label: 'Category', required: false, type: 'string' },
      { id: 'quantity_on_hand', label: 'Current Stock', required: false, type: 'number' },
      { id: 'reorder_level', label: 'Reorder Level', required: false, type: 'number' },
      { id: 'tax_rate', label: 'Tax Rate', required: false, type: 'number' },
      { id: 'barcode', label: 'Barcode', required: false, type: 'string' },
      { id: 'supplier', label: 'Supplier', required: false, type: 'string' },
      { id: 'location', label: 'Location/Warehouse', required: false, type: 'string' },
    ],
    customers: [
      { id: 'name', label: 'Customer Name', required: true, type: 'string' },
      { id: 'email', label: 'Email', required: false, type: 'email' },
      { id: 'phone', label: 'Phone', required: false, type: 'string' },
      { id: 'company', label: 'Company', required: false, type: 'string' },
      { id: 'address_line1', label: 'Address Line 1', required: false, type: 'string' },
      { id: 'address_line2', label: 'Address Line 2', required: false, type: 'string' },
      { id: 'city', label: 'City', required: false, type: 'string' },
      { id: 'state', label: 'State/Province', required: false, type: 'string' },
      { id: 'postal_code', label: 'Postal Code', required: false, type: 'string' },
      { id: 'country', label: 'Country', required: false, type: 'string' },
      { id: 'tax_id', label: 'Tax ID', required: false, type: 'string' },
      { id: 'credit_limit', label: 'Credit Limit', required: false, type: 'number' },
    ],
  };

  useEffect(() => {
    // Load file data from session storage
    const storedData = sessionStorage.getItem('importFileData');
    if (storedData) {
      const data = JSON.parse(storedData);
      setFileData(data);
      setSelectedDataType(data.dataTypes[0] || 'products');
      
      // Simulate loading Excel headers
      setTimeout(() => {
        // Mock Excel headers for demo
        const mockHeaders = [
          'Product Name',
          'SKU',
          'Price',
          'Cost',
          'Category',
          'Stock',
          'Min Stock',
          'Tax %',
          'Barcode Number',
          'Vendor',
          'Warehouse'
        ];
        setExcelHeaders(mockHeaders);
        setDottFields(fieldDefinitions[data.dataTypes[0] || 'products']);
        setLoading(false);
        
        // Automatically analyze with AI
        analyzeWithAI(mockHeaders, fieldDefinitions[data.dataTypes[0] || 'products']);
      }, 1000);
    } else {
      // No file data, redirect back
      router.push('/dashboard/import-export');
    }
  }, [router]);

  const analyzeWithAI = async (headers, fields) => {
    setAnalyzing(true);
    captureEvent('data_mapper_ai_analysis_started');
    
    try {
      // First check if user has AI analysis remaining
      const limitsResponse = await fetch('/api/import-export/check-limits');
      if (limitsResponse.ok) {
        const limitsData = await limitsResponse.json();
        if (!limitsData.remaining.canUseAI) {
          setAnalyzing(false);
          alert(`You've reached your monthly AI analysis limit (${limitsData.limits.aiAnalysisPerMonth}). Manual mapping is still available.`);
          return;
        }
      }

      // Update AI analysis usage
      await fetch('/api/import-export/check-limits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'ai_analysis' })
      });

      // Call Claude API for field analysis
      const response = await fetch('/api/import-export/analyze-fields', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          excelHeaders: headers,
          dataType: selectedDataType
        })
      });

      if (!response.ok) {
        throw new Error('Failed to analyze fields');
      }

      const result = await response.json();
      const { mappings: aiMappings, unmappedRequired, generalSuggestions } = result.analysis;
      
      // Process AI mappings into our format
      const suggestions = {};
      const validation = {};
      const autoMappings = {};
      
      headers.forEach(header => {
        const aiMapping = aiMappings[header];
        
        if (aiMapping && aiMapping.field) {
          const field = fields.find(f => f.id === aiMapping.field);
          if (field) {
            suggestions[header] = {
              field: aiMapping.field,
              confidence: aiMapping.confidence,
              suggestion: aiMapping.suggestion,
              status: aiMapping.confidence >= 95 ? 'perfect' : aiMapping.confidence >= 80 ? 'good' : 'manual',
              dataQualityNotes: aiMapping.dataQualityNotes
            };
            
            validation[header] = aiMapping.confidence >= 95 ? 'success' : 
                               aiMapping.confidence >= 80 ? 'warning' : 'error';
            
            // Auto-apply high confidence mappings
            if (aiMapping.confidence >= 80) {
              autoMappings[header] = aiMapping.field;
            }
          }
        } else {
          suggestions[header] = {
            field: null,
            confidence: 0,
            suggestion: 'No match found - manual mapping required',
            status: 'manual'
          };
          validation[header] = 'error';
        }
      });
      
      setAiSuggestions(suggestions);
      setValidationResults(validation);
      setMappings(autoMappings);
      
      // Store general suggestions if any
      if (generalSuggestions) {
        sessionStorage.setItem('importGeneralSuggestions', generalSuggestions);
      }
      
      captureEvent('data_mapper_ai_analysis_completed', {
        totalHeaders: headers.length,
        autoMapped: Object.keys(autoMappings).length,
        unmappedRequired: unmappedRequired?.length || 0,
        confidence: 'high'
      });
      
    } catch (error) {
      console.error('AI analysis error:', error);
      captureEvent('data_mapper_ai_analysis_error', { error: error.message });
      
      // Fallback to basic matching if AI fails
      const fallbackSuggestions = {};
      const fallbackValidation = {};
      
      headers.forEach(header => {
        fallbackSuggestions[header] = {
          field: null,
          confidence: 0,
          suggestion: 'AI analysis unavailable - please map manually',
          status: 'manual'
        };
        fallbackValidation[header] = 'error';
      });
      
      setAiSuggestions(fallbackSuggestions);
      setValidationResults(fallbackValidation);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleMappingChange = (excelHeader, dottFieldId) => {
    setMappings(prev => ({
      ...prev,
      [excelHeader]: dottFieldId
    }));
    
    // Update validation
    if (dottFieldId) {
      setValidationResults(prev => ({
        ...prev,
        [excelHeader]: 'success'
      }));
    }
  };

  const getFieldStatus = (excelHeader) => {
    const validation = validationResults[excelHeader];
    if (validation === 'success') return { color: 'green', icon: CheckCircleIcon };
    if (validation === 'warning') return { color: 'yellow', icon: ExclamationTriangleIcon };
    return { color: 'red', icon: XCircleIcon };
  };

  const handleProceedToImport = () => {
    // Validate required fields are mapped
    const requiredFields = dottFields.filter(f => f.required);
    const mappedFields = Object.values(mappings).filter(Boolean);
    const missingRequired = requiredFields.filter(
      field => !mappedFields.includes(field.id)
    );
    
    if (missingRequired.length > 0) {
      alert(`Please map the following required fields: ${missingRequired.map(f => f.label).join(', ')}`);
      return;
    }
    
    captureEvent('data_mapper_proceed_to_import', {
      totalMappings: Object.keys(mappings).length,
      dataType: selectedDataType
    });
    
    // Store mappings and proceed
    sessionStorage.setItem('importMappings', JSON.stringify({
      mappings,
      dataType: selectedDataType,
      fileData
    }));
    
    router.push('/dashboard/import-export/import-progress');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <StandardSpinner size="large" />
        <span className="ml-3 text-gray-600">Loading file data...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard/import-export')}
          className="text-blue-600 hover:text-blue-800 flex items-center mb-4"
        >
          <ChevronLeftIcon className="h-4 w-4 mr-1" />
          Back to Import
        </button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Data Mapper</h1>
            <p className="text-gray-600 mt-1">
              Map your Excel columns to Dott fields for {selectedDataType}
            </p>
          </div>
          
          {analyzing && (
            <div className="flex items-center text-blue-600">
              <SparklesIcon className="h-5 w-5 mr-2 animate-pulse" />
              <span className="text-sm">AI is analyzing your data...</span>
            </div>
          )}
        </div>
      </div>

      {/* AI Insights Box */}
      {!analyzing && Object.keys(aiSuggestions).length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-blue-900">AI Mapping Analysis</h3>
              <p className="text-sm text-blue-700 mt-1">
                Claude AI has analyzed your Excel file and automatically mapped {
                  Object.values(aiSuggestions).filter(s => s.confidence >= 80).length
                } of {excelHeaders.length} columns with high confidence.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mapping Interface */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-6">
          <div className="grid grid-cols-5 gap-4 text-sm font-medium text-gray-700 mb-4">
            <div>Excel Column</div>
            <div className="text-center">Status</div>
            <div>Maps To</div>
            <div className="col-span-2">AI Suggestion</div>
          </div>

          <div className="space-y-3">
            {excelHeaders.map((header, index) => {
              const status = getFieldStatus(header);
              const StatusIcon = status.icon;
              const suggestion = aiSuggestions[header];
              
              return (
                <div key={index} className="grid grid-cols-5 gap-4 items-center p-3 rounded-lg hover:bg-gray-50">
                  {/* Excel Column */}
                  <div className="font-medium text-gray-900">{header}</div>
                  
                  {/* Status */}
                  <div className="flex justify-center">
                    <StatusIcon className={`h-5 w-5 text-${status.color}-500`} />
                  </div>
                  
                  {/* Mapping Dropdown */}
                  <div>
                    <select
                      value={mappings[header] || ''}
                      onChange={(e) => handleMappingChange(header, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- Select Field --</option>
                      {dottFields.map(field => (
                        <option key={field.id} value={field.id}>
                          {field.label} {field.required && '*'}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* AI Suggestion */}
                  <div className="col-span-2 text-sm">
                    {suggestion && (
                      <div className={`flex items-center ${
                        suggestion.status === 'perfect' ? 'text-green-700' :
                        suggestion.status === 'good' ? 'text-yellow-700' :
                        'text-gray-500'
                      }`}>
                        <SparklesIcon className="h-4 w-4 mr-1" />
                        <span>{suggestion.suggestion}</span>
                        {suggestion.confidence > 0 && (
                          <span className="ml-2 text-xs">
                            ({suggestion.confidence}% confidence)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Required Fields Note */}
        <div className="px-6 py-3 bg-gray-50 border-t">
          <p className="text-sm text-gray-600">
            * Required fields must be mapped before importing
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => router.push('/dashboard/import-export')}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Cancel Import
        </button>
        
        <button
          onClick={handleProceedToImport}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
        >
          Proceed to Import
          <ArrowRightIcon className="h-4 w-4 ml-2" />
        </button>
      </div>
    </div>
  );
};

export default DataMapperPage;