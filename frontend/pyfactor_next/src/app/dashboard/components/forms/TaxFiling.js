'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { useSession } from '@/hooks/useSession-v2';
import StandardSpinner, { CenteredSpinner } from '@/components/ui/StandardSpinner';
import TaxFilingSteps from './TaxFilingSteps';
import { 
  DocumentTextIcon,
  CalculatorIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  BuildingLibraryIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  DocumentArrowDownIcon,
  BellIcon,
  PlusIcon,
  ChartBarIcon,
  AcademicCapIcon,
  LightBulbIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';

export default function TaxFiling({ onNavigate }) {
  const { user, loading: sessionLoading } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [tenantId, setTenantId] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Tax settings data
  const [taxSettings, setTaxSettings] = useState(null);
  const [calculations, setCalculations] = useState({
    salesTax: { amount: 0, calculated: false },
    incomeTax: { amount: 0, calculated: false }
  });
  
  // Selected filing period
  const [filingPeriod, setFilingPeriod] = useState('quarterly');
  const [selectedQuarter, setSelectedQuarter] = useState('Q4-2024');
  
  // Actual financial data
  const [financialData, setFinancialData] = useState({
    totalSales: 0,
    taxableSales: 0,
    totalIncome: 0,
    totalExpenses: 0,
    netIncome: 0,
    period: null
  });
  
  // Reminders state
  const [reminders, setReminders] = useState([]);
  const [showReminderModal, setShowReminderModal] = useState(false);
  
  // PDF generation state
  const [generatingPDF, setGeneratingPDF] = useState(false);
  
  // Filing location state
  const [filingLocations, setFilingLocations] = useState(null);
  const [loadingLocations, setLoadingLocations] = useState(false);
  
  // Filing steps state
  const [filingSteps, setFilingSteps] = useState(null);
  const [loadingSteps, setLoadingSteps] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  
  // Initialize and load tax settings
  useEffect(() => {
    const initialize = async () => {
      try {
        const id = await getSecureTenantId();
        if (id) {
          setTenantId(id);
          
          // Load tax settings
          const response = await fetch(`/api/taxes/settings?tenantId=${id}`, {
            credentials: 'include'
          });
          
          if (response.ok) {
            const data = await response.json();
            setTaxSettings(data);
          } else {
            toast.error('Please complete Tax Settings first');
            // Redirect to Tax Settings
            if (onNavigate) {
              onNavigate('tax-settings');
            }
          }
        }
      } catch (error) {
        console.error('[TaxFiling] Error during initialization:', error);
        toast.error('Failed to load tax settings');
      } finally {
        setIsInitialized(true);
      }
    };
    
    if (!sessionLoading) {
      initialize();
    }
  }, [sessionLoading, onNavigate]);
  
  // Fetch actual financial data
  const fetchFinancialData = async () => {
    if (!tenantId) return;
    
    try {
      setIsLoading(true);
      
      // Calculate date range based on filing period
      const endDate = new Date();
      let startDate = new Date();
      
      if (filingPeriod === 'quarterly') {
        const quarterMatch = selectedQuarter.match(/Q(\d)-(\d{4})/);
        if (quarterMatch) {
          const quarter = parseInt(quarterMatch[1]);
          const year = parseInt(quarterMatch[2]);
          
          // Set start and end dates based on quarter
          switch(quarter) {
            case 1:
              startDate = new Date(year, 0, 1); // Jan 1
              endDate = new Date(year, 2, 31); // Mar 31
              break;
            case 2:
              startDate = new Date(year, 3, 1); // Apr 1
              endDate = new Date(year, 5, 30); // Jun 30
              break;
            case 3:
              startDate = new Date(year, 6, 1); // Jul 1
              endDate = new Date(year, 8, 30); // Sep 30
              break;
            case 4:
              startDate = new Date(year, 9, 1); // Oct 1
              endDate = new Date(year, 11, 31); // Dec 31
              break;
          }
        }
      } else if (filingPeriod === 'monthly') {
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (filingPeriod === 'annually') {
        startDate.setFullYear(startDate.getFullYear() - 1);
      }
      
      // Fetch sales data
      const salesResponse = await fetch(`/api/dashboard/sales-summary?tenantId=${tenantId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`, {
        credentials: 'include'
      });
      
      // Fetch income/expense data
      const incomeResponse = await fetch(`/api/accounting/income-statement?tenantId=${tenantId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`, {
        credentials: 'include'
      });
      
      if (salesResponse.ok && incomeResponse.ok) {
        const salesData = await salesResponse.json();
        const incomeData = await incomeResponse.json();
        
        setFinancialData({
          totalSales: salesData.totalSales || 0,
          taxableSales: salesData.taxableSales || salesData.totalSales || 0,
          totalIncome: incomeData.totalRevenue || 0,
          totalExpenses: incomeData.totalExpenses || 0,
          netIncome: incomeData.netIncome || 0,
          period: {
            start: startDate.toLocaleDateString(),
            end: endDate.toLocaleDateString()
          }
        });
        
        toast.success('Financial data loaded successfully');
      } else {
        console.error('[TaxFiling] Failed to fetch financial data');
        toast.error('Failed to load financial data');
      }
    } catch (error) {
      console.error('[TaxFiling] Error fetching financial data:', error);
      toast.error('Error loading financial data');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load financial data when period changes
  useEffect(() => {
    if (tenantId && isInitialized && taxSettings) {
      fetchFinancialData();
    }
  }, [filingPeriod, selectedQuarter, tenantId, isInitialized]);
  
  // Calculate taxes based on actual financial data
  const calculateTaxes = async () => {
    setIsLoading(true);
    try {
      // Ensure we have financial data loaded
      if (!financialData.totalSales && !financialData.totalIncome) {
        await fetchFinancialData();
      }
      
      const salesTaxAmount = (financialData.taxableSales * (taxSettings?.salesTaxRate || 0)) / 100;
      const incomeTaxAmount = (financialData.netIncome * (taxSettings?.incomeTaxRate || 0)) / 100;
      
      setCalculations({
        salesTax: { 
          amount: salesTaxAmount, 
          calculated: true,
          baseAmount: financialData.taxableSales 
        },
        incomeTax: { 
          amount: incomeTaxAmount, 
          calculated: true,
          baseAmount: financialData.netIncome
        }
      });
      
      toast.success('Tax calculations completed');
    } catch (error) {
      console.error('[TaxFiling] Error calculating taxes:', error);
      toast.error('Failed to calculate taxes');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Generate tax worksheet PDF
  const generateTaxWorksheet = async () => {
    setGeneratingPDF(true);
    try {
      const worksheetData = {
        businessInfo: {
          name: taxSettings.businessName,
          taxId: taxSettings.taxId,
          address: `${taxSettings.street}, ${taxSettings.city}, ${taxSettings.stateProvince} ${taxSettings.postalCode}`,
          email: taxSettings.emailForDocuments,
          phone: taxSettings.phone
        },
        period: financialData.period || {
          start: new Date().toLocaleDateString(),
          end: new Date().toLocaleDateString()
        },
        financials: {
          totalSales: financialData.totalSales,
          taxableSales: financialData.taxableSales,
          totalIncome: financialData.totalIncome,
          totalExpenses: financialData.totalExpenses,
          netIncome: financialData.netIncome
        },
        taxCalculations: {
          salesTax: {
            rate: taxSettings.salesTaxRate,
            amount: calculations.salesTax.amount
          },
          incomeTax: {
            rate: taxSettings.incomeTaxRate,
            amount: calculations.incomeTax.amount
          },
          totalTaxDue: calculations.salesTax.amount + calculations.incomeTax.amount
        }
      };
      
      const response = await fetch('/api/taxes/generate-worksheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ worksheetData, tenantId })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tax-worksheet-${selectedQuarter || 'current'}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success('Tax worksheet generated successfully');
      } else {
        throw new Error('Failed to generate worksheet');
      }
    } catch (error) {
      console.error('[TaxFiling] Error generating worksheet:', error);
      toast.error('Failed to generate tax worksheet');
    } finally {
      setGeneratingPDF(false);
    }
  };
  
  // Load reminders
  const loadReminders = async () => {
    try {
      const response = await fetch(`/api/taxes/reminders?tenantId=${tenantId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setReminders(data.reminders || []);
      }
    } catch (error) {
      console.error('[TaxFiling] Error loading reminders:', error);
    }
  };
  
  // Save reminder
  const saveReminder = async (reminderData) => {
    try {
      const response = await fetch('/api/taxes/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...reminderData, tenantId })
      });
      
      if (response.ok) {
        toast.success('Reminder saved successfully');
        loadReminders();
        setShowReminderModal(false);
      } else {
        throw new Error('Failed to save reminder');
      }
    } catch (error) {
      console.error('[TaxFiling] Error saving reminder:', error);
      toast.error('Failed to save reminder');
    }
  };
  
  // Load reminders on mount
  useEffect(() => {
    if (tenantId && isInitialized) {
      loadReminders();
    }
  }, [tenantId, isInitialized]);
  
  // Generate filing steps function
  const generateFilingSteps = () => {
    setLoadingSteps(true);
    setShowSteps(true);
    
    fetch('/api/taxes/filing-steps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        businessInfo: {
          businessName: taxSettings.businessName,
          businessType: taxSettings.businessType
        },
        taxSettings,
        filingPeriod: `${filingPeriod} - ${selectedQuarter}`,
        financialData,
        filingType: 'both' // or specific type based on what they're filing
      })
    })
    .then(response => response.json())
    .then(data => {
      setFilingSteps(data);
      toast.success('Generated personalized filing guide');
    })
    .catch(error => {
      console.error('[TaxFiling] Error generating filing steps:', error);
      toast.error('Failed to generate filing guide');
      setShowSteps(false);
    })
    .finally(() => {
      setLoadingSteps(false);
    });
  };
  
  // Fetch filing locations from smart lookup
  const fetchFilingLocations = async () => {
    if (!taxSettings) return;
    
    setLoadingLocations(true);
    try {
      const params = new URLSearchParams({
        country: taxSettings.country,
        stateProvince: taxSettings.stateProvince,
        city: taxSettings.city
      });
      
      const response = await fetch(`/api/taxes/filing-locations?${params}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setFilingLocations(data);
      } else {
        console.error('[TaxFiling] Failed to fetch filing locations');
        // Use fallback hardcoded links
        setFilingLocations(getFallbackLinks());
      }
    } catch (error) {
      console.error('[TaxFiling] Error fetching filing locations:', error);
      // Use fallback hardcoded links
      setFilingLocations(getFallbackLinks());
    } finally {
      setLoadingLocations(false);
    }
  };
  
  // Fallback filing links
  const getFallbackLinks = () => {
    const country = taxSettings?.country?.toLowerCase();
    
    return {
      federal_website: country?.includes('united states') ? 'https://www.irs.gov/filing' : '',
      federal_name: country?.includes('united states') ? 'IRS (Internal Revenue Service)' : 'Federal Tax Authority',
      state_website: taxSettings?.filingWebsite || '',
      state_name: `${taxSettings?.stateProvince} Department of Revenue`,
      local_website: '',
      local_name: '',
      filing_deadlines: {
        quarterly: '15th of month following quarter end',
        annual: 'April 15th (US) or varies by country'
      },
      special_instructions: 'Please check with your tax professional for specific requirements.'
    };
  };
  
  // Load filing locations when tax settings are loaded
  useEffect(() => {
    if (taxSettings && isInitialized) {
      fetchFilingLocations();
    }
  }, [taxSettings, isInitialized]);
  
  if (sessionLoading || !isInitialized) {
    return <CenteredSpinner size="large" text="Loading Tax Filing..." showText={true} />;
  }
  
  if (!taxSettings) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <ExclamationCircleIcon className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Tax Settings Required</h3>
          <p className="text-gray-600 mb-4">Please complete your tax settings before filing taxes.</p>
          <button
            onClick={() => onNavigate && onNavigate('tax-settings')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go to Tax Settings
          </button>
        </div>
      </div>
    );
  }
  
  
  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <DocumentTextIcon className="h-8 w-8 text-blue-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tax Filing</h1>
            <p className="text-gray-600">Calculate and file your business taxes</p>
          </div>
        </div>
      </div>
      
      {/* Business Information Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <BuildingLibraryIcon className="h-5 w-5 mr-2 text-gray-600" />
          Business Information
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Business Name:</span>
            <span className="ml-2 font-medium">{taxSettings.businessName}</span>
          </div>
          <div>
            <span className="text-gray-500">Tax ID/EIN:</span>
            <span className="ml-2 font-medium">{taxSettings.taxId || 'Not provided'}</span>
          </div>
          <div>
            <span className="text-gray-500">Address:</span>
            <span className="ml-2 font-medium">
              {taxSettings.street}, {taxSettings.city}, {taxSettings.stateProvince} {taxSettings.postalCode}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Email:</span>
            <span className="ml-2 font-medium">{taxSettings.emailForDocuments}</span>
          </div>
        </div>
      </div>
      
      {/* Financial Data Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <ChartBarIcon className="h-5 w-5 mr-2 text-gray-600" />
            Financial Summary
          </h2>
          <button
            onClick={fetchFinancialData}
            disabled={isLoading}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Refresh Data
          </button>
        </div>
        
        {financialData.period && (
          <p className="text-sm text-gray-600 mb-4">
            Period: {financialData.period.start} - {financialData.period.end}
          </p>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Total Sales</p>
            <p className="text-xl font-semibold text-gray-900">
              ${financialData.totalSales.toLocaleString()}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Total Expenses</p>
            <p className="text-xl font-semibold text-gray-900">
              ${financialData.totalExpenses.toLocaleString()}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Net Income</p>
            <p className="text-xl font-semibold text-gray-900">
              ${financialData.netIncome.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
      
      {/* Filing Period Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <CalendarIcon className="h-5 w-5 mr-2 text-gray-600" />
          Filing Period
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filing Frequency
            </label>
            <select
              value={filingPeriod}
              onChange={(e) => setFilingPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annually">Annually</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Period
            </label>
            <select
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Q4-2024">Q4 2024 (Oct-Dec)</option>
              <option value="Q3-2024">Q3 2024 (Jul-Sep)</option>
              <option value="Q2-2024">Q2 2024 (Apr-Jun)</option>
              <option value="Q1-2024">Q1 2024 (Jan-Mar)</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Tax Calculations */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <CalculatorIcon className="h-5 w-5 mr-2 text-gray-600" />
          Tax Calculations
        </h2>
        
        <div className="space-y-4">
          {/* Sales Tax */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900">Sales Tax</h3>
              <span className="text-sm text-gray-500">Rate: {taxSettings.salesTaxRate}%</span>
            </div>
            {calculations.salesTax.calculated ? (
              <div>
                <p className="text-sm text-gray-600">
                  Taxable Sales: ${calculations.salesTax.baseAmount?.toLocaleString() || '0'}
                </p>
                <p className="text-lg font-semibold text-blue-600">
                  Tax Due: ${calculations.salesTax.amount.toFixed(2)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Click calculate to determine tax amount</p>
            )}
          </div>
          
          {/* Income Tax */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium text-gray-900">Income Tax</h3>
              <span className="text-sm text-gray-500">Rate: {taxSettings.incomeTaxRate}%</span>
            </div>
            {calculations.incomeTax.calculated ? (
              <div>
                <p className="text-sm text-gray-600">
                  Taxable Income: ${calculations.incomeTax.baseAmount?.toLocaleString() || '0'}
                </p>
                <p className="text-lg font-semibold text-green-600">
                  Tax Due: ${calculations.incomeTax.amount.toFixed(2)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Click calculate to determine tax amount</p>
            )}
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={calculateTaxes}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <StandardSpinner size="small" className="mr-2" />
                Calculating...
              </>
            ) : (
              <>
                <CalculatorIcon className="h-5 w-5 mr-2" />
                Calculate Taxes
              </>
            )}
          </button>
          
          {calculations.salesTax.calculated && calculations.incomeTax.calculated && (
            <button
              onClick={generateTaxWorksheet}
              disabled={generatingPDF}
              className="flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {generatingPDF ? (
                <>
                  <StandardSpinner size="small" className="mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                  Download Worksheet
                </>
              )}
            </button>
          )}
        </div>
      </div>
      
      {/* Filing Links */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <ArrowTopRightOnSquareIcon className="h-5 w-5 mr-2 text-gray-600" />
            File Your Taxes
          </h2>
          {loadingLocations && (
            <div className="flex items-center text-sm text-gray-600">
              <StandardSpinner size="small" className="mr-2" />
              Finding filing locations...
            </div>
          )}
        </div>
        
        {filingLocations ? (
          <div className="space-y-4">
            {/* Federal Filing */}
            {filingLocations.federal_website && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Federal Taxes</h3>
                <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <a
                    href={filingLocations.federal_website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start justify-between"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-blue-600 mb-1">
                        {filingLocations.federal_name}
                      </p>
                      <p className="text-sm text-gray-600 mb-2">
                        {filingLocations.federal_website}
                      </p>
                      {filingLocations.federal_address && (
                        <p className="text-sm text-gray-700 mb-1">
                          <span className="font-medium">Address:</span> {filingLocations.federal_address}
                        </p>
                      )}
                      {filingLocations.federal_phone && (
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Phone:</span> {filingLocations.federal_phone}
                        </p>
                      )}
                    </div>
                    <ArrowTopRightOnSquareIcon className="h-5 w-5 text-gray-400 flex-shrink-0 ml-4" />
                  </a>
                </div>
              </div>
            )}
            
            {/* State Filing */}
            {filingLocations.state_website && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">State/Provincial Taxes</h3>
                <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <a
                    href={filingLocations.state_website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start justify-between"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-blue-600 mb-1">
                        {filingLocations.state_name}
                      </p>
                      <p className="text-sm text-gray-600 mb-2">
                        {filingLocations.state_website}
                      </p>
                      {filingLocations.state_address && (
                        <p className="text-sm text-gray-700 mb-1">
                          <span className="font-medium">Address:</span> {filingLocations.state_address}
                        </p>
                      )}
                      {filingLocations.state_phone && (
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Phone:</span> {filingLocations.state_phone}
                        </p>
                      )}
                    </div>
                    <ArrowTopRightOnSquareIcon className="h-5 w-5 text-gray-400 flex-shrink-0 ml-4" />
                  </a>
                </div>
              </div>
            )}
            
            {/* Local Filing */}
            {filingLocations.local_website && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Local/Municipal Taxes</h3>
                <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <a
                    href={filingLocations.local_website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start justify-between"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-blue-600 mb-1">
                        {filingLocations.local_name}
                      </p>
                      <p className="text-sm text-gray-600 mb-2">
                        {filingLocations.local_website}
                      </p>
                      {filingLocations.local_address && (
                        <p className="text-sm text-gray-700 mb-1">
                          <span className="font-medium">Address:</span> {filingLocations.local_address}
                        </p>
                      )}
                      {filingLocations.local_phone && (
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Phone:</span> {filingLocations.local_phone}
                        </p>
                      )}
                    </div>
                    <ArrowTopRightOnSquareIcon className="h-5 w-5 text-gray-400 flex-shrink-0 ml-4" />
                  </a>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>Loading filing location information...</p>
          </div>
        )}
        
        {/* Important Dates */}
        {filingLocations && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <ClockIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
              <div>
                <p className="font-medium text-yellow-900">Important Filing Deadlines</p>
                {filingLocations.filing_deadlines && Object.keys(filingLocations.filing_deadlines).length > 0 ? (
                  <div className="text-sm text-yellow-700 mt-1 space-y-1">
                    {Object.entries(filingLocations.filing_deadlines).map(([type, deadline]) => (
                      <p key={type}>
                        <span className="capitalize">{type.replace('_', ' ')}:</span> {deadline}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-yellow-700 mt-1">
                    Quarterly: 15th of month following quarter end
                  </p>
                )}
              </div>
            </div>
            
            {filingLocations.special_instructions && (
              <div className="mt-3 pt-3 border-t border-yellow-300">
                <p className="text-sm text-yellow-800">
                  <span className="font-medium">Note:</span> {filingLocations.special_instructions}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Personalized Filing Steps */}
      <TaxFilingSteps 
        filingSteps={filingSteps}
        showSteps={showSteps}
        loadingSteps={loadingSteps}
        generateFilingSteps={generateFilingSteps}
        calculations={calculations}
      />
      
      {/* Tax Reminders */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <BellIcon className="h-5 w-5 mr-2 text-gray-600" />
            Tax Filing Reminders
          </h2>
          <button
            onClick={() => setShowReminderModal(true)}
            className="flex items-center text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Reminder
          </button>
        </div>
        
        {reminders.length > 0 ? (
          <div className="space-y-3">
            {reminders.map((reminder) => (
              <div key={reminder.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{reminder.title}</p>
                  <p className="text-sm text-gray-600">
                    Due: {new Date(reminder.dueDate).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  reminder.status === 'completed' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {reminder.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No reminders set. Add reminders for important tax deadlines.</p>
        )}
      </div>
      
      {/* Reminder Modal */}
      {showReminderModal && (
        <div className="absolute inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Tax Reminder</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              saveReminder({
                title: formData.get('title'),
                description: formData.get('description'),
                dueDate: formData.get('dueDate'),
                reminderType: formData.get('reminderType'),
                status: 'pending'
              });
            }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reminder Title
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Q4 Sales Tax Filing"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    name="reminderType"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="sales_tax">Sales Tax</option>
                    <option value="income_tax">Income Tax</option>
                    <option value="quarterly">Quarterly Filing</option>
                    <option value="annual">Annual Filing</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    name="dueDate"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Additional notes or instructions"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowReminderModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}