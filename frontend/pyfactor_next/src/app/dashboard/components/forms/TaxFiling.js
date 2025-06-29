'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { getSecureTenantId } from '@/utils/tenantUtils';
import { useSession } from '@/hooks/useSession-v2';
import StandardSpinner, { CenteredSpinner } from '@/components/ui/StandardSpinner';
import { 
  DocumentTextIcon,
  CalculatorIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  BuildingLibraryIcon,
  CurrencyDollarIcon,
  CalendarIcon
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
  
  // Calculate taxes based on sales/income data
  const calculateTaxes = async () => {
    setIsLoading(true);
    try {
      // In a real implementation, this would fetch actual sales/income data
      // For now, we'll use mock calculations
      
      // Mock calculation - in reality would fetch from sales/accounting data
      const mockSalesAmount = 50000; // Would come from actual sales data
      const mockIncomeAmount = 120000; // Would come from actual income data
      
      const salesTaxAmount = (mockSalesAmount * (taxSettings?.salesTaxRate || 0)) / 100;
      const incomeTaxAmount = (mockIncomeAmount * (taxSettings?.incomeTaxRate || 0)) / 100;
      
      setCalculations({
        salesTax: { 
          amount: salesTaxAmount, 
          calculated: true,
          baseAmount: mockSalesAmount 
        },
        incomeTax: { 
          amount: incomeTaxAmount, 
          calculated: true,
          baseAmount: mockIncomeAmount
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
  
  // Get filing links based on location
  const getFilingLinks = () => {
    const state = taxSettings?.stateProvince?.toLowerCase();
    const country = taxSettings?.country?.toLowerCase();
    
    // Common tax filing websites
    const links = {
      federal: {
        us: {
          name: 'IRS (Federal)',
          url: 'https://www.irs.gov/filing',
          description: 'File federal income taxes'
        },
        canada: {
          name: 'CRA (Federal)',
          url: 'https://www.canada.ca/en/revenue-agency/services/e-services/e-services-businesses/business-account.html',
          description: 'File Canadian federal taxes'
        }
      },
      state: {
        california: {
          name: 'California Department of Tax and Fee Administration',
          url: 'https://www.cdtfa.ca.gov/',
          description: 'File California state taxes'
        },
        texas: {
          name: 'Texas Comptroller',
          url: 'https://comptroller.texas.gov/taxes/',
          description: 'File Texas state taxes'
        },
        newyork: {
          name: 'New York State Department of Taxation',
          url: 'https://www.tax.ny.gov/',
          description: 'File New York state taxes'
        }
        // Add more states as needed
      }
    };
    
    return links;
  };
  
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
  
  const filingLinks = getFilingLinks();
  
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
        
        <button
          onClick={calculateTaxes}
          disabled={isLoading}
          className="mt-6 w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
      </div>
      
      {/* Filing Links */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <ArrowTopRightOnSquareIcon className="h-5 w-5 mr-2 text-gray-600" />
          File Your Taxes
        </h2>
        
        <div className="space-y-4">
          {/* Federal Filing */}
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Federal Taxes</h3>
            <div className="space-y-2">
              {taxSettings.country?.toLowerCase().includes('united states') && (
                <a
                  href={filingLinks.federal.us.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-blue-600">{filingLinks.federal.us.name}</p>
                    <p className="text-sm text-gray-600">{filingLinks.federal.us.description}</p>
                  </div>
                  <ArrowTopRightOnSquareIcon className="h-5 w-5 text-gray-400" />
                </a>
              )}
            </div>
          </div>
          
          {/* State Filing */}
          <div>
            <h3 className="font-medium text-gray-900 mb-2">State Taxes</h3>
            <div className="space-y-2">
              {taxSettings.stateProvince && (
                <a
                  href={taxSettings.filingWebsite || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-blue-600">
                      {taxSettings.stateProvince} Department of Revenue
                    </p>
                    <p className="text-sm text-gray-600">File state sales and income taxes</p>
                  </div>
                  <ArrowTopRightOnSquareIcon className="h-5 w-5 text-gray-400" />
                </a>
              )}
            </div>
          </div>
        </div>
        
        {/* Important Dates */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <ClockIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
            <div>
              <p className="font-medium text-yellow-900">Important Filing Deadlines</p>
              <p className="text-sm text-yellow-700 mt-1">
                {taxSettings.filingDeadlines || 'Quarterly: 15th of month following quarter end'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}