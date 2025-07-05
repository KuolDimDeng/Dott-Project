'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
// Secure API that processes on backend
const bankTransactionsApi = {
  importCSV: async (file, bankInfo) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bank_name', bankInfo.bankName);
    formData.append('account_name', bankInfo.accountName || 'Imported Account');
    
    const response = await fetch('/api/banking/import', {
      method: 'POST',
      body: formData,
      credentials: 'include' // Important for session cookies
    });
    
    if (!response.ok) {
      throw new Error('Import failed');
    }
    
    return response.json();
  }
};
import { toast } from 'react-hot-toast';
import { format, parse } from 'date-fns';
import {
  CloudArrowUpIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowDownTrayIcon,
  CogIcon
} from '@heroicons/react/24/outline';

// Bank-specific CSV format mappings
const BANK_FORMATS = {
  generic: {
    name: 'Generic/Other',
    dateFormat: 'MM/dd/yyyy',
    columns: {
      date: ['Date', 'Transaction Date', 'Posted Date'],
      description: ['Description', 'Details', 'Transaction Details', 'Memo'],
      amount: ['Amount', 'Transaction Amount'],
      debit: ['Debit', 'Withdrawal', 'Money Out'],
      credit: ['Credit', 'Deposit', 'Money In'],
      balance: ['Balance', 'Running Balance', 'Account Balance']
    }
  },
  chase: {
    name: 'Chase Bank',
    dateFormat: 'MM/dd/yyyy',
    columns: {
      date: ['Posting Date', 'Transaction Date'],
      description: ['Description'],
      amount: ['Amount'],
      type: ['Type'],
      balance: ['Balance']
    }
  },
  wellsfargo: {
    name: 'Wells Fargo',
    dateFormat: 'MM/dd/yyyy',
    columns: {
      date: ['Date'],
      description: ['Description'],
      amount: ['Amount'],
      balance: ['Balance']
    }
  },
  bofa: {
    name: 'Bank of America',
    dateFormat: 'MM/dd/yyyy',
    columns: {
      date: ['Date'],
      description: ['Description'],
      amount: ['Amount'],
      balance: ['Running Bal.']
    }
  },
  // African banks
  absa: {
    name: 'ABSA Bank (Africa)',
    dateFormat: 'dd/MM/yyyy',
    columns: {
      date: ['Date'],
      description: ['Description'],
      debit: ['Debit Amount'],
      credit: ['Credit Amount'],
      balance: ['Balance']
    }
  },
  standardbank: {
    name: 'Standard Bank (Africa)',
    dateFormat: 'yyyy/MM/dd',
    columns: {
      date: ['Date'],
      description: ['Description'],
      amount: ['Amount'],
      balance: ['Balance']
    }
  },
  // European banks
  hsbc: {
    name: 'HSBC',
    dateFormat: 'dd/MM/yyyy',
    columns: {
      date: ['Date'],
      description: ['Description'],
      amount: ['Amount'],
      balance: ['Balance']
    }
  },
  // Asian banks
  dbs: {
    name: 'DBS Bank (Asia)',
    dateFormat: 'dd MMM yyyy',
    columns: {
      date: ['Transaction Date'],
      description: ['Transaction Ref1', 'Transaction Ref2'],
      debit: ['Withdrawal'],
      credit: ['Deposit'],
      balance: ['Balance']
    }
  }
};

// Smart column detection using common patterns
const detectColumns = (headers) => {
  const detectedColumns = {};
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());
  
  // Detect date column
  const datePatterns = ['date', 'transaction date', 'posted date', 'posting date', 'value date'];
  detectedColumns.date = headers[lowerHeaders.findIndex(h => 
    datePatterns.some(pattern => h.includes(pattern))
  )];
  
  // Detect description column
  const descPatterns = ['description', 'details', 'memo', 'narrative', 'reference'];
  detectedColumns.description = headers[lowerHeaders.findIndex(h => 
    descPatterns.some(pattern => h.includes(pattern))
  )];
  
  // Detect amount columns
  const amountPatterns = ['amount', 'transaction amount', 'value'];
  const debitPatterns = ['debit', 'withdrawal', 'money out', 'out'];
  const creditPatterns = ['credit', 'deposit', 'money in', 'in'];
  
  detectedColumns.amount = headers[lowerHeaders.findIndex(h => 
    amountPatterns.some(pattern => h.includes(pattern))
  )];
  detectedColumns.debit = headers[lowerHeaders.findIndex(h => 
    debitPatterns.some(pattern => h.includes(pattern))
  )];
  detectedColumns.credit = headers[lowerHeaders.findIndex(h => 
    creditPatterns.some(pattern => h.includes(pattern))
  )];
  
  // Detect balance column
  const balancePatterns = ['balance', 'running balance', 'account balance'];
  detectedColumns.balance = headers[lowerHeaders.findIndex(h => 
    balancePatterns.some(pattern => h.includes(pattern))
  )];
  
  return detectedColumns;
};

// Smart date parser that handles multiple formats
const parseDate = (dateStr, format = null) => {
  if (!dateStr) return null;
  
  const formats = [
    'MM/dd/yyyy',
    'dd/MM/yyyy',
    'yyyy-MM-dd',
    'yyyy/MM/dd',
    'dd-MMM-yyyy',
    'dd MMM yyyy',
    'MMM dd, yyyy',
    'MMMM dd, yyyy'
  ];
  
  if (format) {
    try {
      return parse(dateStr, format, new Date());
    } catch (e) {
      // Fall through to try other formats
    }
  }
  
  // Try each format
  for (const fmt of formats) {
    try {
      const parsed = parse(dateStr, fmt, new Date());
      if (!isNaN(parsed)) return parsed;
    } catch (e) {
      continue;
    }
  }
  
  // Last resort - try JS Date parser
  const jsDate = new Date(dateStr);
  return isNaN(jsDate) ? null : jsDate;
};

// Auto-categorization rules
const AUTO_CATEGORIES = {
  'Income': {
    patterns: ['salary', 'payment received', 'invoice', 'sales', 'revenue'],
    keywords: ['from', 'payment', 'transfer in']
  },
  'Office Supplies': {
    patterns: ['staples', 'office depot', 'amazon', 'supplies'],
    keywords: ['paper', 'ink', 'printer']
  },
  'Utilities': {
    patterns: ['electric', 'gas', 'water', 'internet', 'phone'],
    keywords: ['utility', 'bill']
  },
  'Rent': {
    patterns: ['rent', 'lease', 'property management'],
    keywords: ['monthly rent', 'lease payment']
  },
  'Payroll': {
    patterns: ['payroll', 'salary', 'wages', 'direct deposit'],
    keywords: ['employee', 'staff']
  },
  'Software': {
    patterns: ['software', 'subscription', 'saas', 'cloud'],
    keywords: ['monthly', 'annual', 'license']
  },
  'Travel': {
    patterns: ['airline', 'hotel', 'uber', 'lyft', 'gas station'],
    keywords: ['travel', 'trip']
  },
  'Meals': {
    patterns: ['restaurant', 'cafe', 'coffee', 'lunch', 'dinner'],
    keywords: ['food', 'meal']
  },
  'Bank Fees': {
    patterns: ['bank fee', 'service charge', 'overdraft', 'atm fee'],
    keywords: ['fee', 'charge']
  }
};

const categorizeTransaction = (description) => {
  const lowerDesc = description.toLowerCase();
  
  for (const [category, rules] of Object.entries(AUTO_CATEGORIES)) {
    // Check patterns
    if (rules.patterns.some(pattern => lowerDesc.includes(pattern))) {
      return category;
    }
    // Check keywords
    if (rules.keywords.some(keyword => lowerDesc.includes(keyword))) {
      return category;
    }
  }
  
  return 'Uncategorized';
};

const BankCSVImport = ({ onImportComplete }) => {
  const [selectedBank, setSelectedBank] = useState('generic');
  const [parsedData, setParsedData] = useState(null);
  const [columnMapping, setColumnMapping] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [importStats, setImportStats] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  
  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    
    Papa.parse(file, {
      complete: (result) => {
        if (result.errors.length > 0) {
          toast.error('Error parsing CSV file');
          return;
        }
        
        const headers = result.data[0];
        const rows = result.data.slice(1).filter(row => row.some(cell => cell)); // Remove empty rows
        
        // Auto-detect columns
        const detected = detectColumns(headers);
        setColumnMapping(detected);
        
        // Parse and categorize transactions
        const transactions = rows.map((row, index) => {
          const rowData = {};
          headers.forEach((header, i) => {
            rowData[header] = row[i];
          });
          
          // Extract transaction data
          const dateStr = rowData[detected.date];
          const description = rowData[detected.description] || '';
          
          // Handle amount (could be single column or separate debit/credit)
          let amount = 0;
          if (detected.amount && rowData[detected.amount]) {
            amount = parseFloat(rowData[detected.amount].replace(/[^0-9.-]/g, ''));
          } else if (detected.debit || detected.credit) {
            const debit = parseFloat(rowData[detected.debit]?.replace(/[^0-9.-]/g, '') || 0);
            const credit = parseFloat(rowData[detected.credit]?.replace(/[^0-9.-]/g, '') || 0);
            amount = credit - debit;
          }
          
          return {
            id: `import-${index}`,
            date: parseDate(dateStr, BANK_FORMATS[selectedBank].dateFormat),
            description: description,
            amount: amount,
            category: categorizeTransaction(description),
            balance: rowData[detected.balance] ? 
              parseFloat(rowData[detected.balance].replace(/[^0-9.-]/g, '')) : null,
            original: rowData
          };
        }).filter(t => t.date && !isNaN(t.amount)); // Filter out invalid transactions
        
        setParsedData({
          headers,
          transactions,
          totalRows: rows.length,
          validTransactions: transactions.length,
          file: file // Store the original file for backend upload
        });
        setShowPreview(true);
      },
      header: false,
      skipEmptyLines: true
    });
  }, [selectedBank]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'text/plain': ['.txt']
    },
    maxFiles: 1
  });
  
  const handleImport = async () => {
    if (!parsedData || !parsedData.file) {
      toast.error('No file to import');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Send the original file to backend for secure processing
      const result = await bankTransactionsApi.importCSV(parsedData.file, {
        bankName: BANK_FORMATS[selectedBank].name,
        accountName: `${BANK_FORMATS[selectedBank].name} Import`
      });
      
      setImportStats({
        total: parsedData.transactions.length,
        imported: result.imported || 0,
        duplicates: result.duplicates || 0,
        categories: parsedData.transactions.reduce((acc, t) => {
          acc[t.category] = (acc[t.category] || 0) + 1;
          return acc;
        }, {})
      });
      
      toast.success(`Successfully imported ${result.imported} transactions`);
      
      if (result.duplicates > 0) {
        toast.info(`${result.duplicates} duplicate transactions were skipped`);
      }
      
      if (onImportComplete) {
        onImportComplete(result);
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import transactions. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <CloudArrowUpIcon className="h-6 w-6 text-blue-600 mr-2" />
        Import Bank Transactions
      </h2>
      
      {/* Bank Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Your Bank Format
        </label>
        <select
          value={selectedBank}
          onChange={(e) => setSelectedBank(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {Object.entries(BANK_FORMATS).map(([key, format]) => (
            <option key={key} value={key}>{format.name}</option>
          ))}
        </select>
      </div>
      
      {/* Drop Zone */}
      {!parsedData && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input {...getInputProps()} />
          <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">
            {isDragActive
              ? 'Drop your CSV file here...'
              : 'Drag & drop your bank CSV file here, or click to select'}
          </p>
          <p className="text-sm text-gray-500">
            Supports CSV files from major banks worldwide
          </p>
        </div>
      )}
      
      {/* Preview */}
      {showPreview && parsedData && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">
              Preview ({parsedData.validTransactions} valid transactions)
            </h3>
            <button
              onClick={() => {
                setParsedData(null);
                setShowPreview(false);
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Upload Different File
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {parsedData.transactions.slice(0, 10).map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm">{format(t.date, 'MMM dd, yyyy')}</td>
                    <td className="px-4 py-2 text-sm">{t.description}</td>
                    <td className="px-4 py-2 text-sm">
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100">
                        {t.category}
                      </span>
                    </td>
                    <td className={`px-4 py-2 text-sm text-right font-medium ${
                      t.amount >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ${Math.abs(t.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedData.transactions.length > 10 && (
              <p className="text-sm text-gray-500 text-center py-2">
                ... and {parsedData.transactions.length - 10} more transactions
              </p>
            )}
          </div>
          
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleImport}
              disabled={isProcessing}
              className={`px-4 py-2 rounded-md font-medium ${
                isProcessing
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isProcessing ? 'Importing...' : `Import ${parsedData.validTransactions} Transactions`}
            </button>
          </div>
        </div>
      )}
      
      {/* Import Results */}
      {importStats && (
        <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-green-900 mb-2">Import Complete!</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-green-600">Imported</p>
              <p className="text-2xl font-bold text-green-900">{importStats.imported}</p>
            </div>
            <div>
              <p className="text-yellow-600">Duplicates Skipped</p>
              <p className="text-2xl font-bold text-yellow-900">{importStats.duplicates}</p>
            </div>
            <div>
              <p className="text-blue-600">Categories Applied</p>
              <p className="text-2xl font-bold text-blue-900">{Object.keys(importStats.categories).length}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankCSVImport;