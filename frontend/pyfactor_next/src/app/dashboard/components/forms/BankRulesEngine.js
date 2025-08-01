'use client';

import React, { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, CogIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

// Default categories based on common business expenses
const DEFAULT_CATEGORIES = [
  'Income',
  'Office Supplies',
  'Utilities',
  'Rent',
  'Payroll',
  'Software & Subscriptions',
  'Travel & Transportation',
  'Meals & Entertainment',
  'Professional Services',
  'Insurance',
  'Taxes',
  'Bank Fees',
  'Marketing & Advertising',
  'Equipment',
  'Inventory',
  'Other'
];

const CONDITION_TYPES = {
  contains: 'Contains text',
  equals: 'Equals exactly',
  starts_with: 'Starts with',
  ends_with: 'Ends with',
  amount_equals: 'Amount equals',
  amount_greater: 'Amount greater than',
  amount_less: 'Amount less than',
  amount_between: 'Amount between'
};

const BankRulesEngine = ({ onRulesChange }) => {
  const [rules, setRules] = useState([]);
  const [showAddRule, setShowAddRule] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  
  // Load saved rules from localStorage
  useEffect(() => {
    const savedRules = localStorage.getItem('bankRules');
    if (savedRules) {
      setRules(JSON.parse(savedRules));
    } else {
      // Load default rules
      setRules(getDefaultRules());
    }
  }, []);
  
  // Save rules whenever they change
  useEffect(() => {
    localStorage.setItem('bankRules', JSON.stringify(rules));
    if (onRulesChange) {
      onRulesChange(rules);
    }
  }, [rules, onRulesChange]);
  
  const getDefaultRules = () => {
    return [
      {
        id: 'rule-1',
        name: 'Salary & Income',
        conditions: {
          type: 'contains',
          field: 'description',
          value: 'salary,payment received,invoice paid,sales'
        },
        actions: {
          category: 'Income',
          tags: ['income', 'revenue']
        },
        enabled: true
      },
      {
        id: 'rule-2',
        name: 'Office Supplies',
        conditions: {
          type: 'contains',
          field: 'description',
          value: 'staples,office depot,amazon'
        },
        actions: {
          category: 'Office Supplies',
          tags: ['supplies', 'office']
        },
        enabled: true
      },
      {
        id: 'rule-3',
        name: 'Software Subscriptions',
        conditions: {
          type: 'contains',
          field: 'description',
          value: 'adobe,microsoft,google,dropbox,zoom'
        },
        actions: {
          category: 'Software & Subscriptions',
          tags: ['software', 'subscription']
        },
        enabled: true
      },
      {
        id: 'rule-4',
        name: 'Bank Fees',
        conditions: {
          type: 'contains',
          field: 'description',
          value: 'bank fee,service charge,atm fee'
        },
        actions: {
          category: 'Bank Fees',
          tags: ['fees', 'bank']
        },
        enabled: true
      }
    ];
  };
  
  const addRule = (rule) => {
    const newRule = {
      id: `rule-${Date.now()}`,
      name: rule.name,
      conditions: rule.conditions,
      actions: rule.actions,
      enabled: true
    };
    setRules([...rules, newRule]);
    setShowAddRule(false);
    toast.success('Rule added successfully');
  };
  
  const updateRule = (id, updatedRule) => {
    setRules(rules.map(rule => rule.id === id ? { ...rule, ...updatedRule } : rule));
    setEditingRule(null);
    toast.success('Rule updated successfully');
  };
  
  const deleteRule = (id) => {
    setRules(rules.filter(rule => rule.id !== id));
    toast.success('Rule deleted');
  };
  
  const toggleRule = (id) => {
    setRules(rules.map(rule => 
      rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
    ));
  };
  
  const applyRulesToTransaction = (transaction) => {
    for (const rule of rules) {
      if (!rule.enabled) continue;
      
      const { conditions, actions } = rule;
      let matches = false;
      
      // Check conditions
      switch (conditions.type) {
        case 'contains':
          const keywords = conditions.value.split(',').map(k => k.trim().toLowerCase());
          matches = keywords.some(keyword => 
            transaction.description.toLowerCase().includes(keyword)
          );
          break;
          
        case 'equals':
          matches = transaction.description.toLowerCase() === conditions.value.toLowerCase();
          break;
          
        case 'starts_with':
          matches = transaction.description.toLowerCase().startsWith(conditions.value.toLowerCase());
          break;
          
        case 'ends_with':
          matches = transaction.description.toLowerCase().endsWith(conditions.value.toLowerCase());
          break;
          
        case 'amount_equals':
          matches = Math.abs(transaction.amount) === parseFloat(conditions.value);
          break;
          
        case 'amount_greater':
          matches = Math.abs(transaction.amount) > parseFloat(conditions.value);
          break;
          
        case 'amount_less':
          matches = Math.abs(transaction.amount) < parseFloat(conditions.value);
          break;
          
        case 'amount_between':
          const [min, max] = conditions.value.split(',').map(v => parseFloat(v.trim()));
          const absAmount = Math.abs(transaction.amount);
          matches = absAmount >= min && absAmount <= max;
          break;
      }
      
      if (matches) {
        return {
          ...transaction,
          category: actions.category,
          tags: actions.tags || [],
          matchedRule: rule.name
        };
      }
    }
    
    return transaction;
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold flex items-center">
          <CogIcon className="h-6 w-6 text-blue-600 mr-2" />
          Bank Transaction Rules
        </h2>
        <button
          onClick={() => setShowAddRule(true)}
          className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Rule
        </button>
      </div>
      
      {/* Smart Suggestions */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center mb-2">
          <SparklesIcon className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="font-medium text-blue-900">Smart Rule Suggestions</h3>
        </div>
        <p className="text-sm text-blue-700 mb-3">
          Based on your transactions, we recommend creating rules for:
        </p>
        <div className="flex flex-wrap gap-2">
          {['Uber/Lyft → Travel', 'AWS → Cloud Services', 'Starbucks → Meals'].map((suggestion) => (
            <button
              key={suggestion}
              className="px-3 py-1 bg-white border border-blue-300 rounded-full text-sm text-blue-700 hover:bg-blue-100"
              onClick={() => {
                const [keyword, category] = suggestion.split(' → ');
                setShowAddRule(true);
                // Pre-fill the form
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
      
      {/* Rules List */}
      <div className="space-y-3">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className={`border rounded-lg p-4 ${
              rule.enabled ? 'border-gray-200' : 'border-gray-200 opacity-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={() => toggleRule(rule.id)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div>
                  <h4 className="font-medium">{rule.name}</h4>
                  <p className="text-sm text-gray-600">
                    When {rule.conditions.field} {CONDITION_TYPES[rule.conditions.type].toLowerCase()}{' '}
                    <span className="font-mono text-xs bg-gray-100 px-1 rounded">
                      {rule.conditions.value}
                    </span>
                    {' → '}
                    <span className="font-medium text-blue-600">{rule.actions.category}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setEditingRule(rule)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <CogIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => deleteRule(rule.id)}
                  className="text-gray-400 hover:text-red-600"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Add/Edit Rule Modal */}
      {(showAddRule || editingRule) && (
        <RuleForm
          rule={editingRule}
          onSave={editingRule ? (rule) => updateRule(editingRule.id, rule) : addRule}
          onCancel={() => {
            setShowAddRule(false);
            setEditingRule(null);
          }}
        />
      )}
    </div>
  );
};

// Rule Form Component
const RuleForm = ({ rule, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: rule?.name || '',
    conditions: {
      type: rule?.conditions?.type || 'contains',
      field: rule?.conditions?.field || 'description',
      value: rule?.conditions?.value || ''
    },
    actions: {
      category: rule?.actions?.category || DEFAULT_CATEGORIES[0],
      tags: rule?.actions?.tags || []
    }
  });
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.conditions.value) {
      toast.error('Please fill in all required fields');
      return;
    }
    onSave(formData);
  };
  
  return (
    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">
          {rule ? 'Edit Rule' : 'Add New Rule'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rule Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Software Subscriptions"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Condition Type
            </label>
            <select
              value={formData.conditions.type}
              onChange={(e) => setFormData({
                ...formData,
                conditions: { ...formData.conditions, type: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(CONDITION_TYPES).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Value {formData.conditions.type === 'contains' && '(comma-separated)'}
            </label>
            <input
              type="text"
              value={formData.conditions.value}
              onChange={(e) => setFormData({
                ...formData,
                conditions: { ...formData.conditions, value: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={
                formData.conditions.type.includes('amount') 
                  ? formData.conditions.type === 'amount_between' ? '100,500' : '100'
                  : 'uber,lyft,taxi'
              }
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={formData.actions.category}
              onChange={(e) => setFormData({
                ...formData,
                actions: { ...formData.actions, category: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DEFAULT_CATEGORIES.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {rule ? 'Update Rule' : 'Add Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BankRulesEngine;