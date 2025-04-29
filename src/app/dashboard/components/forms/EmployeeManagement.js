'use client';
import React, { useState, useEffect, useCallback, memo, Fragment, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { axiosInstance, backendHrApiInstance, resetCircuitBreakers } from '@/lib/axiosConfig';
import { countries } from 'countries-list';
import { format, parseISO } from 'date-fns';
import { refreshUserSession } from '@/utils/refreshUserSession';
import { Dialog, Transition } from '@headlessui/react';
import { toast } from 'react-hot-toast';
import { useTable, usePagination, useSortBy } from 'react-table';
import { extractTenantId, getSecureTenantId } from '@/utils/tenantUtils';
import { getCacheValue, setCacheValue } from '@/utils/appCache';
import { Button, Typography, Alert } from '@mui/material';
// Import the API utilities
import api from '@/utils/api';
import { logger } from '@/utils/logger';
import { employeeApi } from '@/utils/apiClient';
import { invalidateCache } from '@/utils/apiHelpers';
import { verifyBackendConnection } from '@/lib/axiosConfig';
import BackendConnectionCheck from '../BackendConnectionCheck';
import { getCurrentUser, getUserProfile } from '@/services/userService';

// Add getEmployeeById to employeeApi if it doesn't exist (this is a temporary workaround)
if (!employeeApi.getEmployeeById) {
  employeeApi.getEmployeeById = async (employeeId) => {
    try {
      logger.debug('[employeeApi] Fetching employee by ID:', employeeId);
      const tenantId = await getSecureTenantId();
      
      const response = await api.hr.get(`/api/hr/employees/${employeeId}`, {
        headers: {
          'X-Tenant-ID': tenantId
        }
      });
      
      if (response && response.data) {
        logger.debug('[employeeApi] Employee data retrieved:', response.data);
        return response.data;
      }
      return null;
    } catch (error) {
      logger.error('[employeeApi] Error fetching employee by ID:', error);
      throw error;
    }
  };
}

// Employee Form Component
// Personal Information Tab component - direct display of Cognito attributes
const PersonalInfoTab = () => {
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Load user data from Cognito on component mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setIsLoading(true);
        
        // Get user attributes from Cognito directly
        const cognitoUser = await getCurrentUser();
        if (!cognitoUser) {
          setError('Unable to retrieve user information');
          return;
        }
        
        // Check for employee ID in Cognito attributes
        const employeeId = cognitoUser['custom:employeeid'] || cognitoUser.custom_employeeid;
        
        if (employeeId) {
          // If employee ID exists, fetch the employee record from API
          logger.debug('[PersonalInfoTab] Found employee ID in Cognito attributes:', employeeId);
          try {
            const employee = await employeeApi.getEmployeeById(employeeId);
            if (employee) {
              logger.debug('[PersonalInfoTab] Employee data retrieved successfully:', employee);
              // Use the employee data from the API
              setUserData({
                first_name: employee.first_name,
                last_name: employee.last_name,
                email: employee.email,
                phone_number: employee.phone_number || '',
                job_title: employee.job_title || 'Not specified',
                department: employee.department || 'Not specified',
                business_name: cognitoUser.custom_businessname || cognitoUser['custom:businessname'] || '',
                employee_id: employeeId
              });
              return;
            }
          } catch (employeeError) {
            logger.warn('[PersonalInfoTab] Error fetching employee data with ID:', employeeId, employeeError);
            // Continue to use Cognito data as fallback
          }
        }
        
        // Fallback to Cognito attributes if no employee record found
        logger.debug('[PersonalInfoTab] No employee record found, using Cognito data');
        const formattedData = {
          first_name: cognitoUser.given_name || cognitoUser.firstName || '',
          last_name: cognitoUser.family_name || cognitoUser.lastName || '',
          email: cognitoUser.email || '',
          phone_number: cognitoUser.phone_number || '',
          job_title: 'Owner', // Default for owner
          department: 'Management', // Default for owner
          business_name: cognitoUser.custom_businessname || cognitoUser['custom:businessname'] || '',
          employee_id: employeeId || 'Not linked'
        };
        
        // Log successful data retrieval
        logger.debug('[PersonalInfoTab] User data loaded from Cognito (fallback):', formattedData);
        
        setUserData(formattedData);
      } catch (error) {
        logger.error('[PersonalInfoTab] Error loading user data:', error);
        setError('Failed to load your information. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUserData();
  }, []);
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Loading your information...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-medium text-lg mb-2">Error</h3>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }
  
  if (!userData) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-yellow-800 font-medium text-lg mb-2">No Information Available</h3>
        <p className="text-yellow-700">Your personal information could not be loaded at this time.</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <Typography variant="h5" component="h2">
          Personal Information
        </Typography>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Typography variant="subtitle2" color="textSecondary">
            First Name
          </Typography>
          <Typography variant="body1">
            {userData.first_name}
          </Typography>
        </div>
        <div>
          <Typography variant="subtitle2" color="textSecondary">
            Last Name
          </Typography>
          <Typography variant="body1">
            {userData.last_name}
          </Typography>
        </div>
        <div>
          <Typography variant="subtitle2" color="textSecondary">
            Email
          </Typography>
          <Typography variant="body1">
            {userData.email}
          </Typography>
        </div>
        <div>
          <Typography variant="subtitle2" color="textSecondary">
            Phone Number
          </Typography>
          <Typography variant="body1">
            {userData.phone_number || 'Not provided'}
          </Typography>
        </div>
        <div>
          <Typography variant="subtitle2" color="textSecondary">
            Job Title
          </Typography>
          <Typography variant="body1">
            {userData.job_title}
          </Typography>
        </div>
        <div>
          <Typography variant="subtitle2" color="textSecondary">
            Department
          </Typography>
          <Typography variant="body1">
            {userData.department}
          </Typography>
        </div>
        {userData.business_name && (
          <div>
            <Typography variant="subtitle2" color="textSecondary">
              Business Name
            </Typography>
            <Typography variant="body1">
              {userData.business_name}
            </Typography>
          </div>
        )}
        <div>
          <Typography variant="subtitle2" color="textSecondary">
            Employee ID
          </Typography>
          <Typography variant="body1">
            {userData.employee_id}
          </Typography>
        </div>
      </div>
    </div>
  );
};


// Information Tab component - displays payment options based on legal structure and business country
const InformationTab = () => {
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Load user data from Cognito on component mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setIsLoading(true);
        
        // Get user attributes from Cognito directly
        const cognitoUser = await getCurrentUser();
        if (!cognitoUser) {
          setError('Unable to retrieve user information');
          return;
        }
        
        // Format data for display
        const formattedData = {
          first_name: cognitoUser.given_name || cognitoUser.firstName || '',
          last_name: cognitoUser.family_name || cognitoUser.lastName || '',
          email: cognitoUser.email || '',
          business_name: cognitoUser.custom_businessname || cognitoUser['custom:businessname'] || '',
          legal_structure: cognitoUser.custom_legalstructure || cognitoUser['custom:legalstructure'] || '',
          business_country: cognitoUser.custom_businesscountry || cognitoUser['custom:businesscountry'] || 'USA'
        };
        
        // Log successful data retrieval
        logger.debug('[InformationTab] User data loaded from Cognito:', formattedData);
        
        setUserData(formattedData);
      } catch (error) {
        logger.error('[InformationTab] Error loading user data:', error);
        setError('Failed to load your information. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUserData();
  }, []);
  
  // Helper function to get payment options based on legal structure and country
  const getPaymentOptions = (legalStructure, country) => {
    // Default to USA if no country is specified
    const businessCountry = country || 'USA';
    
    // Define payment options for different legal structures in USA
    const usaOptions = {
      'LLC': [
        'Owner's draw (partnership taxation)',
        'Salary plus distributions (S-Corp taxation)',
        'Reasonable salary with corporate tax (C-Corp taxation)'
      ],
      'S-CORP': [
        'Salary (subject to employment tax)',
        'Distributions (not subject to self-employment tax)',
        'Combination of salary and distributions (most common)'
      ],
      'C-CORP': [
        'Salary as an employee (subject to income tax)',
        'Dividends (subject to dividend tax)',
        'Combination of salary and dividends'
      ],
      'SOLE_PROPRIETORSHIP': [
        'Owner's draw (subject to self-employment tax)',
        'No formal salary required'
      ],
      'PARTNERSHIP': [
        'Guaranteed payments (similar to salary)',
        'Partnership distributions based on ownership percentage',
        'Draw against profits'
      ]
    };
    
    // Define payment options for different legal structures in UK
    const ukOptions = {
      'LIMITED_COMPANY': [
        'Salary (PAYE)',
        'Dividends',
        'Combination of salary and dividends (most tax-efficient)'
      ],
      'SOLE_TRADER': [
        'Drawings (not a formal salary)',
        'Subject to income tax and National Insurance contributions'
      ],
      'PARTNERSHIP': [
        'Drawings based on profit share',
        'Each partner responsible for their own tax'
      ],
      'LLP': [
        'Drawings based on profit share',
        'Tax treated similarly to partnerships'
      ]
    };
    
    // Define payment options for different legal structures in Canada
    const canadaOptions = {
      'CORPORATION': [
        'Salary (subject to income tax and CPP contributions)',
        'Dividends (eligible or non-eligible)',
        'Combination of salary and dividends'
      ],
      'SOLE_PROPRIETORSHIP': [
        'Owner's draw (subject to income tax and CPP/EI contributions)',
        'No formal salary'
      ],
      'PARTNERSHIP': [
        'Drawings based on partnership agreement',
        'Each partner responsible for their own tax'
      ]
    };
    
    // Define payment options for different legal structures in Australia
    const australiaOptions = {
      'COMPANY': [
        'Salary as an employee',
        'Dividends (franked or unfranked)',
        'Combination of salary and dividends'
      ],
      'SOLE_TRADER': [
        'Drawings (not a formal salary)',
        'Subject to personal income tax'
      ],
      'PARTNERSHIP': [
        'Drawings based on partnership agreement',
        'Each partner responsible for their own tax'
      ],
      'TRUST': [
        'Distributions to beneficiaries',
        'Salary to working beneficiaries'
      ]
    };
    
    // Map country codes to payment options
    const countryMap = {
      'USA': usaOptions,
      'US': usaOptions,
      'UNITED_STATES': usaOptions,
      'UK': ukOptions,
      'GB': ukOptions,
      'UNITED_KINGDOM': ukOptions,
      'CA': canadaOptions,
      'CANADA': canadaOptions,
      'AU': australiaOptions,
      'AUSTRALIA': australiaOptions
    };
    
    // Normalize legal structure format
    const normalizedLegalStructure = legalStructure ? 
      legalStructure.toUpperCase().replace(/[^A-Z0-9_]/g, '_') : null;
    
    // Normalize country format
    const normalizedCountry = businessCountry.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    
    // Get country-specific options
    const countryOptions = countryMap[normalizedCountry] || usaOptions;
    
    // Get structure-specific options for the country
    let structureOptions = [];
    
    // Loop through available structures in the country
    for (const structure in countryOptions) {
      if (normalizedLegalStructure && structure.includes(normalizedLegalStructure)) {
        structureOptions = countryOptions[structure];
        break;
      }
    }
    
    // If no structure match found, return generic options
    if (structureOptions.length === 0) {
      structureOptions = [
        'Salary (based on market rates)',
        'Owner's draw (based on business profits)',
        'Combination of salary and profit distributions'
      ];
    }
    
    return structureOptions;
  };
  
  // Helper to get tax consequences based on legal structure and country
  const getTaxConsequences = (legalStructure, country) => {
    // Default to USA if no country is specified
    const businessCountry = country || 'USA';
    
    // Normalize inputs
    const normalizedLegalStructure = legalStructure ? 
      legalStructure.toUpperCase().replace(/[^A-Z0-9_]/g, '_') : '';
    const normalizedCountry = businessCountry.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    
    // Common tax consequences
    const commonTaxConsequences = 'Consult with a tax professional for specific advice tailored to your situation.';
    
    // USA-specific tax consequences
    if (['USA', 'US', 'UNITED_STATES'].includes(normalizedCountry)) {
      if (normalizedLegalStructure.includes('LLC')) {
        return 'LLCs have pass-through taxation by default. Members pay self-employment tax on their share of profits. If taxed as an S-Corp, you can potentially reduce self-employment taxes. ' + commonTaxConsequences;
      } else if (normalizedLegalStructure.includes('S_CORP')) {
        return 'S-Corps require payment of reasonable salary subject to employment taxes. Distributions beyond salary are not subject to self-employment taxes, potentially reducing overall tax burden. ' + commonTaxConsequences;
      } else if (normalizedLegalStructure.includes('C_CORP')) {
        return 'C-Corps face double taxation: corporate income tax on profits and personal income tax on dividends. Salary is a deductible business expense for the corporation. ' + commonTaxConsequences;
      } else if (normalizedLegalStructure.includes('SOLE_PROPRIETOR')) {
        return 'Sole proprietors face self-employment tax on all business profits. All business income passes directly to your personal tax return. ' + commonTaxConsequences;
      } else if (normalizedLegalStructure.includes('PARTNERSHIP')) {
        return 'Partners pay self-employment tax on their share of partnership income. Guaranteed payments are similar to salary but subject to self-employment tax. ' + commonTaxConsequences;
      }
    }
    // UK-specific tax consequences
    else if (['UK', 'GB', 'UNITED_KINGDOM'].includes(normalizedCountry)) {
      if (normalizedLegalStructure.includes('LIMITED_COMPANY')) {
        return 'Limited companies pay Corporation Tax on profits. Directors pay Income Tax and National Insurance on salary through PAYE. Dividends are taxed at lower rates than salary but can only be paid from profits. ' + commonTaxConsequences;
      } else if (normalizedLegalStructure.includes('SOLE_TRADER')) {
        return 'Sole traders pay Income Tax on all profits and National Insurance contributions. You must file a Self Assessment tax return. ' + commonTaxConsequences;
      } else if (normalizedLegalStructure.includes('PARTNERSHIP') || normalizedLegalStructure.includes('LLP')) {
        return 'Partners pay Income Tax and National Insurance on their share of profits. Each partner must file their own Self Assessment tax return. ' + commonTaxConsequences;
      }
    }
    // Canada-specific tax consequences
    else if (['CA', 'CANADA'].includes(normalizedCountry)) {
      if (normalizedLegalStructure.includes('CORPORATION')) {
        return 'Corporations pay corporate tax on profits. Salaries are subject to income tax and CPP contributions. Dividends receive preferential tax treatment through the dividend tax credit system. ' + commonTaxConsequences;
      } else if (normalizedLegalStructure.includes('SOLE_PROPRIETOR')) {
        return 'Sole proprietors report business income on their personal tax return (T1). All business income is subject to income tax and CPP contributions. ' + commonTaxConsequences;
      } else if (normalizedLegalStructure.includes('PARTNERSHIP')) {
        return 'Partnership income flows through to partners based on their share. Each partner reports their share on their personal tax return. ' + commonTaxConsequences;
      }
    }
    // Australia-specific tax consequences
    else if (['AU', 'AUSTRALIA'].includes(normalizedCountry)) {
      if (normalizedLegalStructure.includes('COMPANY')) {
        return 'Companies pay a flat corporate tax rate. Salaries are deductible expenses for the company. Dividends can be franked to provide tax credits for shareholders. ' + commonTaxConsequences;
      } else if (normalizedLegalStructure.includes('SOLE_TRADER')) {
        return 'Sole traders report business income on their personal tax return. All business income is taxed at personal income tax rates. ' + commonTaxConsequences;
      } else if (normalizedLegalStructure.includes('PARTNERSHIP')) {
        return 'Partners pay tax on their share of partnership income at their individual tax rates. The partnership itself doesn't pay tax. ' + commonTaxConsequences;
      } else if (normalizedLegalStructure.includes('TRUST')) {
        return 'Trusts can distribute income to beneficiaries who then pay tax at their individual rates. Undistributed income may be taxed at the highest marginal rate. ' + commonTaxConsequences;
      }
    }
    
    // Default response
    return 'Tax implications vary based on legal structure and local tax laws. ' + commonTaxConsequences;
  };
  
  // Helper to get staff payment options
  const getStaffPaymentOptions = (country) => {
    // Default to USA if no country is specified
    const businessCountry = country || 'USA';
    
    // Normalize country format
    const normalizedCountry = businessCountry.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    
    // USA-specific staff payment options
    if (['USA', 'US', 'UNITED_STATES'].includes(normalizedCountry)) {
      return [
        'W-2 Employees (withhold taxes, pay benefits)',
        '1099 Independent Contractors (no tax withholding)',
        'Part-time employees (hourly rate, limited hours)',
        'Full-time employees (salary or hourly wage plus benefits)'
      ];
    }
    // UK-specific staff payment options
    else if (['UK', 'GB', 'UNITED_KINGDOM'].includes(normalizedCountry)) {
      return [
        'PAYE Employees (full-time or part-time)',
        'Self-employed contractors',
        'Zero-hour contracts (no guaranteed hours)',
        'Agency workers'
      ];
    }
    // Canada-specific staff payment options
    else if (['CA', 'CANADA'].includes(normalizedCountry)) {
      return [
        'T4 Employees (full-time or part-time)',
        'Independent contractors',
        'Temporary workers',
        'Seasonal employees'
      ];
    }
    // Australia-specific staff payment options
    else if (['AU', 'AUSTRALIA'].includes(normalizedCountry)) {
      return [
        'Full-time employees (with entitlements)',
        'Part-time employees (pro-rata entitlements)',
        'Casual employees (higher hourly rate, no paid leave)',
        'Independent contractors'
      ];
    }
    
    // Default options
    return [
      'Full-time employees',
      'Part-time employees',
      'Independent contractors',
      'Temporary or seasonal workers'
    ];
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Loading payment information...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-medium text-lg mb-2">Error</h3>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }
  
  if (!userData) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-yellow-800 font-medium text-lg mb-2">No Information Available</h3>
        <p className="text-yellow-700">Your business information could not be loaded at this time.</p>
      </div>
    );
  }
  
  // Get payment options based on legal structure and country
  const paymentOptions = getPaymentOptions(userData.legal_structure, userData.business_country);
  const taxConsequences = getTaxConsequences(userData.legal_structure, userData.business_country);
  const staffPaymentOptions = getStaffPaymentOptions(userData.business_country);
  
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <Typography variant="h5" component="h2">
          Payment Information for Business Owners
        </Typography>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        <div className="border-b pb-4">
          <Typography variant="h6" className="mb-2">
            Business Details
          </Typography>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Typography variant="subtitle2" color="textSecondary">
                Business Name
              </Typography>
              <Typography variant="body1">
                {userData.business_name || 'Not provided'}
              </Typography>
            </div>
            <div>
              <Typography variant="subtitle2" color="textSecondary">
                Legal Structure
              </Typography>
              <Typography variant="body1">
                {userData.legal_structure || 'Not provided'}
              </Typography>
            </div>
            <div>
              <Typography variant="subtitle2" color="textSecondary">
                Business Country
              </Typography>
              <Typography variant="body1">
                {userData.business_country || 'USA'}
              </Typography>
            </div>
          </div>
        </div>
        
        <div className="border-b pb-4">
          <Typography variant="h6" className="mb-2">
            Payment Options for Business Owners
          </Typography>
          <Typography variant="body2" className="mb-3 text-gray-600">
            Based on your business's legal structure and country, here are your options for paying yourself:
          </Typography>
          <ul className="list-disc pl-5 space-y-2">
            {paymentOptions.map((option, index) => (
              <li key={index} className="text-gray-800">
                <Typography variant="body1">{option}</Typography>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="border-b pb-4">
          <Typography variant="h6" className="mb-2">
            Tax Consequences
          </Typography>
          <Typography variant="body1" className="text-gray-800">
            {taxConsequences}
          </Typography>
        </div>
        
        <div>
          <Typography variant="h6" className="mb-2">
            Options for Paying Staff
          </Typography>
          <Typography variant="body2" className="mb-3 text-gray-600">
            Here are common options for paying your employees in {userData.business_country || 'your country'}:
          </Typography>
          <ul className="list-disc pl-5 space-y-2">
            {staffPaymentOptions.map((option, index) => (
              <li key={index} className="text-gray-800">
                <Typography variant="body1">{option}</Typography>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <Typography variant="body2" className="text-blue-800">
            <strong>Note:</strong> This information is provided as general guidance only and should not be considered as tax, legal, or financial advice. 
            Always consult with qualified professionals regarding your specific situation.
          </Typography>
        </div>
      </div>
    </div>
  );
};

const EmployeeFormComponent = ({ isEdit = false, onSubmit, newEmployee, handleInputChange, isLoading, setNewEmployee, setShowAddForm }) => {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
          <input
            type="text"
            name="first_name"
            value={newEmployee.first_name || ''}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
          <input
            type="text"
            name="last_name"
            value={newEmployee.last_name || ''}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            name="email"
            value={newEmployee.email || ''}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <input
            type="text"
            name="phone_number"
            value={newEmployee.phone_number || ''}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
          <input
            type="date"
            name="dob"
            value={newEmployee.dob || ''}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded-md"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date Joined</label>
          <input
            type="date"
            name="date_joined"
            value={newEmployee.date_joined || ''}
            onChange={handleInputChange}
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>
      
      {/* Hidden input to ensure role is set to EMPLOYEE */}
      <input 
        type="hidden" 
        name="role" 
        value="employee" 
      />
      
      <div className="flex justify-end space-x-2">
        <Button 
          variant="outlined"
          color="secondary"
          onClick={() => setShowAddForm(false)}
        >
          Cancel
        </Button>
        <Button 
          type="submit"
          variant="contained"
          color="primary"
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : (isEdit ? 'Update' : 'Create')}
        </Button>
      </div>
    </form>
  );
};

// Memoize the form component to prevent unnecessary re-renders
const EmployeeForm = memo(EmployeeFormComponent);

const EmployeeManagement = () => {
  // Add tab state
  const [activeTab, setActiveTab] = useState('information'); // Default to information tab
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showConnectionChecker, setShowConnectionChecker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    job_title: '',
    department: '',
    dob: new Date().toISOString().split('T')[0],
    date_joined: new Date().toISOString().split('T')[0],
    role: 'employee',
  });
  
  // Function to manually refresh the user session
  const refreshSession = async () => {
    try {
      setLoading(true);
      const refreshed = await refreshUserSession();
      if (refreshed) {
        setError(null);
        toast.success('Session refreshed successfully');
        fetchEmployees(); // Retry fetching data
      } else {
        setError('Failed to refresh session. Please log in again.');
      }
    } catch (error) {
      logger.error('[EmployeeManagement] Error refreshing session:', error);
      setError('Failed to refresh session. Please log in again.');
    } finally {
      setLoading(false);
    }
  };

  // Function to handle login redirection on session expiration
  const redirectToLogin = () => {
    const currentPath = window.location.pathname + window.location.search;
    window.location.href = `/login?expired=true&redirect=${encodeURIComponent(currentPath)}`;
  };

  // Fetch current user information
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        logger.debug('[EmployeeManagement] Fetching current user and profile...');
        
        // Get user attributes from Cognito
        const user = await getCurrentUser();
        if (user) {
          setCurrentUser(user);
          logger.debug('[EmployeeManagement] Current user set:', user);
          
          // Get tenant ID from URL or app cache
          const tenantId = await getSecureTenantId();
          logger.debug('[EmployeeManagement] Using tenant ID for profile:', tenantId);
          
          // Check if user is an owner
          const profile = await getUserProfile(tenantId);
          logger.debug('[EmployeeManagement] User profile retrieved:', profile);
          setIsOwner(profile?.role === 'owner' || profile?.userRole === 'owner');
          
          // If user is owner, set their information as the selected employee
          logger.debug('[EmployeeManagement] Checking if user is owner:', { 
            role: profile?.role,
            userRole: profile?.userRole,
            isOwnerCheck: profile?.role === 'owner' || profile?.userRole === 'owner'
          });
          if (profile?.role === 'owner' || profile?.userRole === 'owner') {
            setSelectedEmployee({
              first_name: user.firstName,
              last_name: user.lastName,
              email: user.email,
              phone_number: user.phone_number || '',
              job_title: 'Owner',
              department: 'Management',
              role: 'owner'
            });
            setShowEmployeeDetails(true);
          }
        }
      } catch (error) {
        logger.error('[EmployeeManagement] Error fetching current user:', error);
        setError('Failed to load user information');
      }
    };

    fetchCurrentUser();
  }, []);

  // Handle creating a new employee
  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    
    try {
      // Format the employee data for the API
      const formattedEmployee = {
        ...newEmployee,
        dob: newEmployee.dob ? new Date(newEmployee.dob).toISOString().split('T')[0] : new Date().toISOString().split('T')[0], // Set today as default if not provided
        date_joined: newEmployee.date_joined ? new Date(newEmployee.date_joined).toISOString().split('T')[0] : null,
        role: 'employee', // Changed to lowercase
      };

      // Log the data being sent
      logger.debug('[EmployeeManagement] Creating employee:', formattedEmployee);
      
      // Send the API request
      const response = await employeeApi.createEmployee(formattedEmployee);
      
      // Handle the success response
      logger.info('[EmployeeManagement] Employee created successfully:', response);
      toast.success('Employee created successfully');
      
      // Update the UI
      setShowAddForm(false);
      fetchEmployees(); // Refresh the employee list
      
      // Reset the form
      setNewEmployee({
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        job_title: '',
        department: '',
        dob: new Date().toISOString().split('T')[0], // Default to today
        date_joined: new Date().toISOString().split('T')[0], // Default to today
        role: 'employee',
      });
    } catch (error) {
      // Handle errors
      logger.error('[EmployeeManagement] Error creating employee:', error);
      
      let errorMessage = 'Failed to create employee. Please try again.';
      if (error.response && error.response.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (typeof error.response.data === 'object') {
          errorMessage = Object.entries(error.response.data)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };
  
  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewEmployee(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Fetch employees from the API
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await employeeApi.getEmployees();
      setEmployees(response || []);
    } catch (error) {
      logger.error('[EmployeeManagement] Error fetching employees:', error);
      setError('Failed to load employees. Please try again.');
      setShowConnectionChecker(true);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Load employees on component mount
  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);
  
  // Handle connection restoration
  const handleConnectionRestored = () => {
    setShowConnectionChecker(false);
    fetchEmployees();
  };

  // Handle closing employee details
  const handleCloseEmployeeDetails = () => {
    setShowEmployeeDetails(false);
    setSelectedEmployee(null);
  };

  // Handle updating employee information
  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    setIsEditing(true);
    
    try {
      // Format the employee data for the API
      const formattedEmployee = {
        ...newEmployee,
        dob: newEmployee.dob ? new Date(newEmployee.dob).toISOString().split('T')[0] : null,
        date_joined: newEmployee.date_joined ? new Date(newEmployee.date_joined).toISOString().split('T')[0] : null,
      };

      // Log the data being sent
      logger.debug('[EmployeeManagement] Updating employee:', formattedEmployee);
      
      // Send the API request
      const response = await employeeApi.updateEmployee(selectedEmployee.id, formattedEmployee);
      
      // Handle the success response
      logger.info('[EmployeeManagement] Employee updated successfully:', response);
      toast.success('Information updated successfully');
      
      // Update the UI
      setShowEditForm(false);
      setSelectedEmployee(formattedEmployee);
      
      // If this is the owner, update the current user information
      if (isOwner) {
        setCurrentUser(prev => ({
          ...prev,
          firstName: formattedEmployee.first_name,
          lastName: formattedEmployee.last_name,
          email: formattedEmployee.email,
          phone_number: formattedEmployee.phone_number
        }));
      }
    } catch (error) {
      // Handle errors
      logger.error('[EmployeeManagement] Error updating employee:', error);
      
      let errorMessage = 'Failed to update information. Please try again.';
      if (error.response && error.response.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (typeof error.response.data === 'object') {
          errorMessage = Object.entries(error.response.data)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setIsEditing(false);
    }
  };

  const renderEmployeesList = () => {
    // ... existing code ...
    return (
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        {/* Extract key from table props */}
        {(() => {
          return (
            <table {...getTableProps()} className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                {headerGroups.map(headerGroup => {
                  return (
                    <tr {...headerGroup.getHeaderGroupProps()}>
                      {headerGroup.headers.map(column => {
                        // Extract key from props and pass it separately to avoid React warning
                        return (
                          <th {...column.getHeaderProps(column.getSortByToggleProps())}
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {column.render('Header')}
                            <span>
                              {column.isSorted
                                ? column.isSortedDesc
                                  ? ' 🔽'
                                  : ' 🔼'
                                : ''}
                            </span>
                          </th>
                        );
                      })}
                    </tr>
                  );
                })}
              </thead>
              {(() => {
                return (
                  <tbody {...getTableBodyProps()} className="bg-white divide-y divide-gray-200">
                    {page.map((row, i) => {
                      prepareRow(row);
                      return (
                        <tr key={`row-${row.id}`} {...row.getRowProps()} 
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => {
                            setSelectedEmployee(row.original);
                            setShowEmployeeDetails(true);
                          }}
                        >
                          {row.cells.map(cell => {
                            return (
                              <td key={`cell-${row.id}-${cell.column.id}`} {...cell.getCellProps()}
                                className="px-6 py-4 whitespace-nowrap"
                                onClick={(e) => {
                                  // Prevent row click for action buttons
                                  if (cell.column.id === 'actions') {
                                    e.stopPropagation();
                                  }
                                }}
                              >
                                {cell.render('Cell')}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                );
              })()}
            </table>
          );
        })()}
      </div>
    );
  };

  return (
    <div className="relative">
      {/* Tabs for navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('information')}
            className={`px-4 py-2 font-medium text-sm border-b-2 ${
              activeTab === 'information'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Information
          </button>
          <button
            onClick={() => setActiveTab('personal')}
            className={`px-4 py-2 font-medium text-sm border-b-2 ${
              activeTab === 'personal'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Personal Information
          </button>
          <button
            onClick={() => setActiveTab('employees')}
            className={`px-4 py-2 font-medium text-sm border-b-2 ${
              activeTab === 'employees'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Employee Management
          </button>
        </nav>
      </div>
      </div>

      {/* Error display with connection checker */}
      {error && (
        <div className="mb-4">
          <Alert severity="error" className="mb-2">
            {error}
          </Alert>
          {showConnectionChecker && (
            <BackendConnectionCheck onConnectionRestored={handleConnectionRestored} />
          )}
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'information' ? (
        <InformationTab />
      ) : activeTab === 'personal' ? (
        <PersonalInfoTab />
      ) : activeTab === 'add_employee' ? (
        <>
          {/* Add Employee Form */}
          <div className="mb-6">
            <Typography variant="h4" component="h1" className="mb-4">
              Add New Employee
            </Typography>
            <EmployeeForm 
              onSubmit={handleCreateEmployee}
              newEmployee={newEmployee}
              handleInputChange={handleInputChange}
              isLoading={isCreating}
              setNewEmployee={setNewEmployee}
              setShowAddForm={setShowAddForm}
            />
          </div>
        </>
      ) : (
        <>
          {/* List Employees (formerly Employee Management tab) */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <Typography variant="h4" component="h1" className="mb-4 sm:mb-0">
                Employee List
              </Typography>
            </div>
          </div>
          
          {/* Rest of employee management content */}
          {/* Employee Forms */}
          <div className="mt-4">
            {showEditForm && selectedEmployee && (
              <EmployeeForm 
                isEdit={true}
                onSubmit={handleUpdateEmployee}
                newEmployee={newEmployee}
                handleInputChange={handleInputChange}
                isLoading={isEditing}
                setNewEmployee={setNewEmployee}
                setShowEditForm={setShowEditForm}
              />
            )}
          </div>
          
          {/* Employee Details Dialog */}
          <Transition.Root show={showEmployeeDetails} as={Fragment}>
            <Dialog as="div" className="relative z-10" onClose={handleCloseEmployeeDetails}>
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
              </Transition.Child>
    
              <div className="fixed inset-0 z-10 overflow-y-auto">
                <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                  <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                    enterTo="opacity-100 translate-y-0 sm:scale-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                    leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                  >
                    <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                      <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                        <button
                          type="button"
                          className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                          onClick={handleCloseEmployeeDetails}
                        >
                          <span className="sr-only">Close</span>
                          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="sm:flex sm:items-start">
                        <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                          <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                            Employee Details
                          </Dialog.Title>
                          <div className="mt-4">
                            <div className="grid grid-cols-1 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700">First Name</label>
                                <p className="mt-1 text-sm text-gray-900">{selectedEmployee?.first_name}</p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Last Name</label>
                                <p className="mt-1 text-sm text-gray-900">{selectedEmployee?.last_name}</p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <p className="mt-1 text-sm text-gray-900">{selectedEmployee?.email}</p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                                <p className="mt-1 text-sm text-gray-900">{selectedEmployee?.phone_number || 'Not provided'}</p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Job Title</label>
                                <p className="mt-1 text-sm text-gray-900">{selectedEmployee?.job_title}</p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700">Department</label>
                                <p className="mt-1 text-sm text-gray-900">{selectedEmployee?.department}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                        <Button
                          type="button"
                          variant="contained"
                          color="primary"
                          onClick={() => {
                            setShowEditForm(true);
                            setIsEditing(true);
                            setNewEmployee(selectedEmployee);
                          }}
                          className="w-full sm:ml-3 sm:w-auto"
                        >
                          Edit Information
                        </Button>
                        <Button
                          type="button"
                          variant="outlined"
                          color="secondary"
                          onClick={handleCloseEmployeeDetails}
                          className="mt-3 w-full sm:mt-0 sm:w-auto"
                        >
                          Close
                        </Button>
                      </div>
                    </Dialog.Panel>
                  </Transition.Child>
                </div>
              </div>
            </Dialog>
          </Transition.Root>
        </>
      )}
    </div>
  );
};

export default EmployeeManagement; 