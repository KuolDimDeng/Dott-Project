'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { 
  CalculatorIcon, 
  DocumentTextIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PlusIcon,
  PencilIcon,
  EyeIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { apiService } from '@/services/apiService';
import { StandardSpinner } from '@/components/ui/StandardSpinner';

// Tooltip component for field help
const FieldTooltip = ({ text, position = 'top' }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  return (
    <div className="relative inline-flex items-center ml-1">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className="cursor-help"
      >
        <svg className="w-4 h-4 text-gray-400 hover:text-gray-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      </div>
      
      {showTooltip && (
        <div className={`absolute z-50 ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 w-72`}>
          <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 shadow-lg">
            <div className="relative">
              {text}
              <div className={`absolute ${position === 'top' ? 'top-full' : 'bottom-full'} left-4`}>
                <div className={`${position === 'top' ? '' : 'rotate-180'}`}>
                  <svg className="w-2 h-2 text-gray-900" fill="currentColor" viewBox="0 0 8 4">
                    <path d="M0 0l4 4 4-4z"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Multi-state Apportionment Calculator Component
 * Calculates and manages apportionment factors for multi-state income tax filing
 */
const MultistateApportionmentCalculator = () => {
  const [activeTab, setActiveTab] = useState('calculator');
  const [loading, setLoading] = useState(true);
  const [nexusProfile, setNexusProfile] = useState(null);
  const [apportionmentFactors, setApportionmentFactors] = useState([]);
  const [calculationResults, setCalculationResults] = useState(null);
  
  // Calculator form state
  const [calculatorData, setCalculatorData] = useState({
    tax_year: new Date().getFullYear(),
    total_income: '',
    total_sales: '',
    total_payroll: '',
    total_property: '',
    filing_method: 'separate',
    state_data: {}
  });

  const [stateDataForm, setStateDataForm] = useState({
    state: '',
    sales: '',
    payroll: '',
    property: ''
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load nexus profiles
      const profilesResponse = await apiService.get('/api/taxes/multistate/nexus-profiles/');
      if (profilesResponse.data?.length > 0) {
        const profile = profilesResponse.data[0];
        setNexusProfile(profile);
        
        // Load apportionment factors
        const factorsResponse = await apiService.get('/api/taxes/multistate/apportionment-factors/');
        setApportionmentFactors(factorsResponse.data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load apportionment data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addStateData = () => {
    if (stateDataForm.state && !calculatorData.state_data[stateDataForm.state]) {
      setCalculatorData({
        ...calculatorData,
        state_data: {
          ...calculatorData.state_data,
          [stateDataForm.state]: {
            sales: parseFloat(stateDataForm.sales) || 0,
            payroll: parseFloat(stateDataForm.payroll) || 0,
            property: parseFloat(stateDataForm.property) || 0
          }
        }
      });
      setStateDataForm({ state: '', sales: '', payroll: '', property: '' });
    }
  };

  const removeStateData = (state) => {
    const newStateData = { ...calculatorData.state_data };
    delete newStateData[state];
    setCalculatorData({
      ...calculatorData,
      state_data: newStateData
    });
  };

  const calculateApportionment = async () => {
    if (!nexusProfile) {
      toast.error('Please create a nexus profile first');
      return;
    }

    if (Object.keys(calculatorData.state_data).length === 0) {
      toast.error('Please add at least one state');
      return;
    }

    try {
      setLoading(true);
      const response = await apiService.post(
        `/api/taxes/multistate/nexus-profiles/${nexusProfile.id}/calculate_apportionment/`,
        calculatorData
      );
      
      setCalculationResults(response.data);
      toast.success('Apportionment calculation completed');
      loadData(); // Refresh the factors list
    } catch (error) {
      console.error('Error calculating apportionment:', error);
      toast.error('Failed to calculate apportionment');
    } finally {
      setLoading(false);
    }
  };

  const finalizeFactors = async (factorsId) => {
    try {
      await apiService.post(`/api/taxes/multistate/apportionment-factors/${factorsId}/finalize/`);
      toast.success('Apportionment factors finalized');
      loadData();
    } catch (error) {
      console.error('Error finalizing factors:', error);
      toast.error('Failed to finalize factors');
    }
  };

  if (loading && !calculationResults) {
    return (
      <div className="flex items-center justify-center h-64">
        <StandardSpinner size="large" />
      </div>
    );
  }

  const tabs = [
    { id: 'calculator', name: 'Calculator', icon: CalculatorIcon },
    { id: 'history', name: 'History', icon: DocumentTextIcon },
    { id: 'analysis', name: 'Analysis', icon: ChartBarIcon }
  ];

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black mb-2 flex items-center">
          <CalculatorIcon className="h-6 w-6 text-blue-600 mr-2" />
          Multi-State Apportionment Calculator
        </h1>
        <p className="text-gray-600">
          Calculate state income tax apportionment factors for multi-state operations
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'calculator' && (
        <CalculatorTab
          calculatorData={calculatorData}
          setCalculatorData={setCalculatorData}
          stateDataForm={stateDataForm}
          setStateDataForm={setStateDataForm}
          addStateData={addStateData}
          removeStateData={removeStateData}
          calculateApportionment={calculateApportionment}
          calculationResults={calculationResults}
          loading={loading}
        />
      )}

      {activeTab === 'history' && (
        <HistoryTab
          apportionmentFactors={apportionmentFactors}
          finalizeFactors={finalizeFactors}
          onRefresh={loadData}
        />
      )}

      {activeTab === 'analysis' && (
        <AnalysisTab
          apportionmentFactors={apportionmentFactors}
          calculationResults={calculationResults}
        />
      )}
    </div>
  );
};

// Calculator Tab Component
const CalculatorTab = ({
  calculatorData,
  setCalculatorData,
  stateDataForm,
  setStateDataForm,
  addStateData,
  removeStateData,
  calculateApportionment,
  calculationResults,
  loading
}) => {
  return (
    <div className="space-y-8">
      {/* Business Information */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Business Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tax Year
              <FieldTooltip text="Tax year for which to calculate apportionment factors" />
            </label>
            <select
              value={calculatorData.tax_year}
              onChange={(e) => setCalculatorData({...calculatorData, tax_year: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {[...Array(5)].map((_, i) => {
                const year = new Date().getFullYear() - i;
                return <option key={year} value={year}>{year}</option>;
              })}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total Income
              <FieldTooltip text="Total business income subject to apportionment" />
            </label>
            <input
              type="number"
              value={calculatorData.total_income}
              onChange={(e) => setCalculatorData({...calculatorData, total_income: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total Sales
              <FieldTooltip text="Total sales across all states (used for sales factor calculation)" />
            </label>
            <input
              type="number"
              value={calculatorData.total_sales}
              onChange={(e) => setCalculatorData({...calculatorData, total_sales: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filing Method
              <FieldTooltip text="Choose separate filing for individual state returns or combined for unified reporting" />
            </label>
            <select
              value={calculatorData.filing_method}
              onChange={(e) => setCalculatorData({...calculatorData, filing_method: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="separate">Separate Filing</option>
              <option value="combined">Combined Filing</option>
              <option value="consolidated">Consolidated Filing</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total Payroll
              <FieldTooltip text="Total payroll across all states (used for payroll factor calculation)" />
            </label>
            <input
              type="number"
              value={calculatorData.total_payroll}
              onChange={(e) => setCalculatorData({...calculatorData, total_payroll: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total Property
              <FieldTooltip text="Total property value across all states (used for property factor calculation)" />
            </label>
            <input
              type="number"
              value={calculatorData.total_property}
              onChange={(e) => setCalculatorData({...calculatorData, total_property: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      {/* State Data Entry */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">State-by-State Data</h3>
        
        {/* Add State Form */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
            <select
              value={stateDataForm.state}
              onChange={(e) => setStateDataForm({...stateDataForm, state: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select State</option>
              <option value="CA">California</option>
              <option value="NY">New York</option>
              <option value="TX">Texas</option>
              <option value="FL">Florida</option>
              <option value="IL">Illinois</option>
              <option value="PA">Pennsylvania</option>
              <option value="OH">Ohio</option>
              <option value="MI">Michigan</option>
              <option value="GA">Georgia</option>
              <option value="NC">North Carolina</option>
              {/* Add more states as needed */}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sales
              <FieldTooltip text="Sales sourced to this state" />
            </label>
            <input
              type="number"
              value={stateDataForm.sales}
              onChange={(e) => setStateDataForm({...stateDataForm, sales: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payroll
              <FieldTooltip text="Payroll paid in this state" />
            </label>
            <input
              type="number"
              value={stateDataForm.payroll}
              onChange={(e) => setStateDataForm({...stateDataForm, payroll: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Property
              <FieldTooltip text="Property value located in this state" />
            </label>
            <input
              type="number"
              value={stateDataForm.property}
              onChange={(e) => setStateDataForm({...stateDataForm, property: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={addStateData}
              disabled={!stateDataForm.state}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add State
            </button>
          </div>
        </div>

        {/* State Data Table */}
        {Object.keys(calculatorData.state_data).length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    State
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sales
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payroll
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Property
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(calculatorData.state_data).map(([state, data]) => (
                  <tr key={state}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {state}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${data.sales?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${data.payroll?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${data.property?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => removeStateData(state)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Calculate Button */}
      <div className="flex justify-center">
        <button
          onClick={calculateApportionment}
          disabled={loading || Object.keys(calculatorData.state_data).length === 0}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {loading ? (
            <StandardSpinner size="small" className="mr-2" />
          ) : (
            <CalculatorIcon className="h-5 w-5 mr-2" />
          )}
          Calculate Apportionment
        </button>
      </div>

      {/* Calculation Results */}
      {calculationResults && (
        <CalculationResults results={calculationResults} />
      )}
    </div>
  );
};

// Calculation Results Component
const CalculationResults = ({ results }) => {
  const { apportionment_factors, filing_method_recommendation, validation_warnings, calculation_summary } = results;
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">Calculation Results</h3>
        <div className="flex items-center space-x-2">
          <CheckCircleIcon className="h-5 w-5 text-green-600" />
          <span className="text-sm text-green-600 font-medium">Calculation Complete</span>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">Total Apportionment</p>
          <p className="text-2xl font-bold text-blue-900">
            {(calculation_summary.total_apportionment * 100).toFixed(2)}%
          </p>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">States Included</p>
          <p className="text-2xl font-bold text-green-900">
            {calculation_summary.states_included}
          </p>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4">
          <p className="text-sm text-purple-600 font-medium">Filing Method</p>
          <p className="text-lg font-bold text-purple-900 capitalize">
            {filing_method_recommendation.replace('_', ' ')}
          </p>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600 font-medium">Calculation Date</p>
          <p className="text-lg font-bold text-gray-900">
            {new Date(calculation_summary.calculation_date).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Validation Warnings */}
      {validation_warnings && validation_warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center mb-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
            <h4 className="text-sm font-medium text-yellow-800">Validation Warnings</h4>
          </div>
          <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
            {validation_warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* State Breakdown */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4">State-by-State Breakdown</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  State
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sales Factor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payroll Factor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Property Factor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Apportionment %
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {apportionment_factors.state_breakdown?.map((state) => (
                <tr key={state.state}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {state.state}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(state.sales_factor * 100).toFixed(4)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(state.payroll_factor * 100).toFixed(4)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(state.property_factor * 100).toFixed(4)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {(state.apportionment_percentage * 100).toFixed(4)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// History Tab Component
const HistoryTab = ({ apportionmentFactors, finalizeFactors, onRefresh }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Apportionment History</h3>
        </div>
        
        {apportionmentFactors.length === 0 ? (
          <div className="text-center py-12">
            <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No apportionment calculations yet</p>
            <p className="text-sm text-gray-400 mt-1">Use the calculator to create your first apportionment</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {apportionmentFactors.map((factors) => (
              <FactorsCard 
                key={factors.id} 
                factors={factors} 
                onFinalize={() => finalizeFactors(factors.id)}
                onRefresh={onRefresh}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Factors Card Component
const FactorsCard = ({ factors, onFinalize, onRefresh }) => {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-lg font-medium text-gray-900">Tax Year {factors.tax_year}</h4>
          <p className="text-sm text-gray-600">
            Calculated on {new Date(factors.calculation_date).toLocaleDateString()}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {factors.is_final ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <CheckCircleIcon className="h-3 w-3 mr-1" />
              Finalized
            </span>
          ) : (
            <button
              onClick={onFinalize}
              className="inline-flex items-center px-3 py-1 border border-green-300 text-sm font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100"
            >
              <CheckCircleIcon className="h-4 w-4 mr-1" />
              Finalize
            </button>
          )}
          
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-400 hover:text-gray-600"
          >
            <EyeIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-600">Total Income</p>
          <p className="text-lg font-medium text-gray-900">
            ${factors.total_income?.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Total Sales</p>
          <p className="text-lg font-medium text-gray-900">
            ${factors.total_sales?.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Method</p>
          <p className="text-lg font-medium text-gray-900 capitalize">
            {factors.calculation_method?.replace('_', ' ')}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Total Apportionment</p>
          <p className="text-lg font-medium text-gray-900">
            {factors.total_apportionment ? (factors.total_apportionment * 100).toFixed(2) : '0.00'}%
          </p>
        </div>
      </div>

      {/* Validation Warnings */}
      {factors.validation_warnings && factors.validation_warnings.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <div className="flex items-center mb-1">
            <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600 mr-1" />
            <span className="text-sm font-medium text-yellow-800">Warnings</span>
          </div>
          <ul className="list-disc list-inside text-xs text-yellow-700">
            {factors.validation_warnings.slice(0, 2).map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
            {factors.validation_warnings.length > 2 && (
              <li>... and {factors.validation_warnings.length - 2} more</li>
            )}
          </ul>
        </div>
      )}

      {/* Expanded Details */}
      {expanded && factors.state_breakdown && (
        <div className="mt-4 border-t border-gray-200 pt-4">
          <h5 className="text-sm font-medium text-gray-900 mb-3">State Breakdown</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {factors.state_breakdown.map((state) => (
              <div key={state.state} className="bg-gray-50 rounded-lg p-3">
                <h6 className="font-medium text-gray-900 mb-2">{state.state}</h6>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Apportionment:</span>
                    <span className="font-medium">{(state.apportionment_percentage * 100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sales:</span>
                    <span>${state.sales?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sales Factor:</span>
                    <span>{(state.sales_factor * 100).toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Analysis Tab Component
const AnalysisTab = ({ apportionmentFactors, calculationResults }) => {
  const [selectedYear, setSelectedYear] = useState('');
  const [comparisonData, setComparisonData] = useState(null);

  const availableYears = [...new Set(apportionmentFactors.map(f => f.tax_year))].sort((a, b) => b - a);

  const generateComparison = () => {
    if (!selectedYear) return;
    
    const yearFactors = apportionmentFactors.filter(f => f.tax_year === parseInt(selectedYear));
    // Generate comparison analysis here
    setComparisonData(yearFactors);
  };

  return (
    <div className="space-y-6">
      {/* Year-over-Year Analysis */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Year-over-Year Analysis</h3>
        
        <div className="flex items-center space-x-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Year for Analysis
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Year</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={generateComparison}
              disabled={!selectedYear}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Generate Analysis
            </button>
          </div>
        </div>

        {comparisonData && comparisonData.length > 0 && (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Analysis for {selectedYear}</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-blue-600">Total Income</p>
                  <p className="font-medium text-blue-900">
                    ${comparisonData[0]?.total_income?.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-blue-600">States with Apportionment</p>
                  <p className="font-medium text-blue-900">
                    {Object.keys(comparisonData[0]?.apportionment_percentages || {}).length}
                  </p>
                </div>
                <div>
                  <p className="text-blue-600">Filing Method</p>
                  <p className="font-medium text-blue-900 capitalize">
                    {comparisonData[0]?.calculation_method?.replace('_', ' ')}
                  </p>
                </div>
                <div>
                  <p className="text-blue-600">Status</p>
                  <p className="font-medium text-blue-900">
                    {comparisonData[0]?.is_final ? 'Finalized' : 'Draft'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filing Method Comparison */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Filing Method Comparison</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Separate Filing</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Individual state returns</li>
              <li>• State-specific calculations</li>
              <li>• More complex compliance</li>
              <li>• Potential for disputes</li>
            </ul>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Combined Filing</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Unified reporting approach</li>
              <li>• Consistent apportionment</li>
              <li>• Simplified compliance</li>
              <li>• Required in some states</li>
            </ul>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Consolidated Filing</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Group-level reporting</li>
              <li>• Intercompany eliminations</li>
              <li>• Complex calculations</li>
              <li>• Regulatory requirements</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Current Period Insights */}
      {calculationResults && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Current Period Insights</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Recommended Actions</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center text-green-700">
                  <CheckCircleIcon className="h-4 w-4 mr-2" />
                  <span>Filing method: {calculationResults.filing_method_recommendation}</span>
                </div>
                {calculationResults.validation_warnings?.length === 0 && (
                  <div className="flex items-center text-green-700">
                    <CheckCircleIcon className="h-4 w-4 mr-2" />
                    <span>No validation issues found</span>
                  </div>
                )}
                {calculationResults.validation_warnings?.length > 0 && (
                  <div className="flex items-center text-yellow-700">
                    <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                    <span>Review {calculationResults.validation_warnings.length} warning(s)</span>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Key Metrics</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Apportionment:</span>
                  <span className="font-medium">
                    {(calculationResults.calculation_summary?.total_apportionment * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">States Included:</span>
                  <span className="font-medium">
                    {calculationResults.calculation_summary?.states_included}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Calculation Date:</span>
                  <span className="font-medium">
                    {new Date(calculationResults.calculation_summary?.calculation_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultistateApportionmentCalculator;