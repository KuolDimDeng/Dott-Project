'use client';

import React, { useState } from 'react';
import { 
  CloudArrowUpIcon, 
  CogIcon, 
  ArrowsRightLeftIcon,
  DocumentTextIcon,
  SparklesIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import BankCSVImport from './BankCSVImport';
import BankRulesEngine from './BankRulesEngine';
import SmartBankReconciliation from './SmartBankReconciliation';
import { toast } from 'react-hot-toast';

const BankingTools = () => {
  const [activeTab, setActiveTab] = useState('import');
  const [importedTransactions, setImportedTransactions] = useState([]);
  const [rules, setRules] = useState([]);
  const [bookTransactions, setBookTransactions] = useState([]);

  // Handle CSV import completion
  const handleImportComplete = (transactions) => {
    setImportedTransactions(transactions);
    toast.success('Transactions imported successfully!');
    
    // Apply rules to imported transactions
    if (rules.length > 0) {
      const categorizedTransactions = transactions.map(tx => {
        for (const rule of rules) {
          if (!rule.enabled) continue;
          // Apply rule logic here (simplified)
          if (tx.description.toLowerCase().includes(rule.conditions.value.toLowerCase())) {
            return { ...tx, category: rule.actions.category };
          }
        }
        return tx;
      });
      setImportedTransactions(categorizedTransactions);
    }
  };

  // Handle rules change
  const handleRulesChange = (newRules) => {
    setRules(newRules);
  };

  // Handle reconciliation completion
  const handleReconciliationComplete = (result) => {
    toast.success(`Reconciliation completed! ${result.summary.matched} transactions matched.`);
  };

  // Tab navigation
  const tabs = [
    { id: 'import', label: 'Import Transactions', icon: CloudArrowUpIcon },
    { id: 'rules', label: 'Transaction Rules', icon: CogIcon },
    { id: 'reconcile', label: 'Smart Reconciliation', icon: ArrowsRightLeftIcon }
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Security Warning - Remove when backend processing is implemented */}
      <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start">
          <svg className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-yellow-800">Development Mode</h3>
            <p className="text-sm text-yellow-700 mt-1">
              These tools process data locally in your browser. For production use with real financial data, 
              backend processing with encryption is required for security compliance.
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black mb-2 flex items-center">
          <SparklesIcon className="h-6 w-6 text-blue-600 mr-2" />
          Banking Tools
        </h1>
        <p className="text-gray-600">
          Powerful zero-cost tools to manage your bank transactions, automate categorization, and reconcile accounts
        </p>
      </div>

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center mb-2">
            <CloudArrowUpIcon className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="font-semibold text-gray-900">CSV Import</h3>
          </div>
          <p className="text-sm text-gray-600">
            Import from 8+ bank formats with automatic categorization
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center mb-2">
            <CogIcon className="h-5 w-5 text-purple-600 mr-2" />
            <h3 className="font-semibold text-gray-900">Smart Rules</h3>
          </div>
          <p className="text-sm text-gray-600">
            Create rules to auto-categorize transactions based on patterns
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center mb-2">
            <ArrowsRightLeftIcon className="h-5 w-5 text-green-600 mr-2" />
            <h3 className="font-semibold text-gray-900">AI Matching</h3>
          </div>
          <p className="text-sm text-gray-600">
            Fuzzy matching algorithm reconciles 95%+ of transactions
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center px-6 py-3 border-b-2 font-medium text-sm transition-colors
                    ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'import' && (
            <div>
              <BankCSVImport onImportComplete={handleImportComplete} />
              
              {/* Show imported transactions summary */}
              {importedTransactions.length > 0 && (
                <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                    <h3 className="font-semibold text-green-900">
                      {importedTransactions.length} Transactions Ready
                    </h3>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    Proceed to Transaction Rules to categorize them or Smart Reconciliation to match with your books
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'rules' && (
            <div>
              <BankRulesEngine onRulesChange={handleRulesChange} />
              
              {/* Apply rules to imported transactions */}
              {importedTransactions.length > 0 && rules.length > 0 && (
                <div className="mt-6">
                  <button
                    onClick={() => {
                      // Apply all active rules to imported transactions
                      let categorized = 0;
                      const updatedTransactions = importedTransactions.map(tx => {
                        for (const rule of rules) {
                          if (!rule.enabled) continue;
                          // Simplified rule application
                          if (tx.description.toLowerCase().includes(rule.conditions.value.toLowerCase())) {
                            categorized++;
                            return { ...tx, category: rule.actions.category };
                          }
                        }
                        return tx;
                      });
                      setImportedTransactions(updatedTransactions);
                      toast.success(`Categorized ${categorized} transactions using rules`);
                    }}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <SparklesIcon className="h-4 w-4 mr-2" />
                    Apply Rules to {importedTransactions.length} Imported Transactions
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'reconcile' && (
            <div>
              {importedTransactions.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Bank Transactions</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Import bank transactions first to start reconciliation
                  </p>
                  <button
                    onClick={() => setActiveTab('import')}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                    Import Transactions
                  </button>
                </div>
              ) : (
                <SmartBankReconciliation
                  bankTransactions={importedTransactions}
                  bookTransactions={bookTransactions} // Would come from your accounting system
                  onReconciliationComplete={handleReconciliationComplete}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tips Section */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">💡 Pro Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div>
            <h4 className="font-medium mb-1">For Best Results:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Import your bank CSV files monthly for easier reconciliation</li>
              <li>Set up rules for recurring transactions first</li>
              <li>Review and approve matched transactions before finalizing</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-1">Supported Banks:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>US: Chase, Wells Fargo, Bank of America</li>
              <li>Africa: ABSA, Standard Bank</li>
              <li>Europe: HSBC • Asia: DBS Bank</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BankingTools;