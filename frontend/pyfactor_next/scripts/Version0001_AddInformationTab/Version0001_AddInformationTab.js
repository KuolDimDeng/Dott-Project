/**
 * Version0001_AddInformationTab.js
 * 
 * This script adds an Information tab to the EmployeeManagement.js file.
 * The Information tab displays payment options for business owners based on their legal structure
 * and business country.
 * 
 * Created: 2025-04-28
 * Author: AI Assistant
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define file paths
const sourceFilePath = path.join(__dirname, '../../src/app/dashboard/components/forms/EmployeeManagement.js');
const backupFilePath = path.join(__dirname, `./EmployeeManagement.js.backup.${new Date().toISOString().replace(/:/g, '-')}`);
const targetFilePath = sourceFilePath;

// Create backup
try {
  console.log('Creating backup of EmployeeManagement.js...');
  fs.copyFileSync(sourceFilePath, backupFilePath);
  console.log(`Backup created at ${backupFilePath}`);
} catch (error) {
  console.error('Error creating backup:', error);
  process.exit(1);
}

// Read the source file
try {
  console.log('Reading EmployeeManagement.js...');
  const sourceContent = fs.readFileSync(sourceFilePath, 'utf8');

  // Add the Information component
  const informationComponentCode = `
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
        'Owner\'s draw (partnership taxation)',
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
        'Owner\'s draw (subject to self-employment tax)',
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
        'Owner\'s draw (subject to income tax and CPP/EI contributions)',
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
        'Owner\'s draw (based on business profits)',
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
        return 'Partners pay tax on their share of partnership income at their individual tax rates. The partnership itself doesn\'t pay tax. ' + commonTaxConsequences;
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
};`;

  // Insert the Information component after the PersonalInfoTab component
  let updatedContent = sourceContent;
  const personalInfoTabEndIndex = sourceContent.indexOf('const EmployeeFormComponent');
  
  if (personalInfoTabEndIndex === -1) {
    throw new Error('Could not find insertion point for InformationTab component');
  }
  
  updatedContent = 
    sourceContent.substring(0, personalInfoTabEndIndex) + 
    informationComponentCode + 
    '\n\n' + 
    sourceContent.substring(personalInfoTabEndIndex);

  // Now update the main component to include the Information tab
  
  // 1. Add 'information' to the activeTab state initialization
  updatedContent = updatedContent.replace(
    "const [activeTab, setActiveTab] = useState('personal'); // Default to personal tab",
    "const [activeTab, setActiveTab] = useState('information'); // Default to information tab"
  );
  
  // 2. Add the Information tab button to the tabs section
  // Find the tabs navigation section
  const tabsNavStartIndex = updatedContent.indexOf('<div className="border-b border-gray-200 mb-6">');
  const tabsNavEndIndex = updatedContent.indexOf('</nav>', tabsNavStartIndex) + '</nav>'.length;
  
  if (tabsNavStartIndex === -1 || tabsNavEndIndex === -1) {
    throw new Error('Could not find the tabs navigation section');
  }
  
  const currentTabsNav = updatedContent.substring(tabsNavStartIndex, tabsNavEndIndex);
  
  // Create the new tabs navigation with the Information tab
  const newTabsNav = `<div className="border-b border-gray-200 mb-6">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('information')}
            className={\`px-4 py-2 font-medium text-sm border-b-2 \${
              activeTab === 'information'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }\`}
          >
            Information
          </button>
          <button
            onClick={() => setActiveTab('personal')}
            className={\`px-4 py-2 font-medium text-sm border-b-2 \${
              activeTab === 'personal'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }\`}
          >
            Personal Information
          </button>
          <button
            onClick={() => setActiveTab('employees')}
            className={\`px-4 py-2 font-medium text-sm border-b-2 \${
              activeTab === 'employees'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }\`}
          >
            Employee Management
          </button>
        </nav>
      </div>`;
  
  updatedContent = updatedContent.replace(currentTabsNav, newTabsNav);
  
  // 3. Update the tab content section to include the Information tab
  const tabContentStartIndex = updatedContent.indexOf('{/* Tab Content */}');
  const tabContentEndIndex = updatedContent.indexOf('<PersonalInfoTab />', tabContentStartIndex) + '<PersonalInfoTab />'.length;
  
  if (tabContentStartIndex === -1 || tabContentEndIndex === -1) {
    throw new Error('Could not find the tab content section');
  }
  
  const currentTabContent = updatedContent.substring(tabContentStartIndex, tabContentEndIndex);
  
  // Create the new tab content with the Information tab
  const newTabContent = `{/* Tab Content */}
      {activeTab === 'information' ? (
        <InformationTab />
      ) : activeTab === 'personal' ? (
        <PersonalInfoTab />`;
  
  updatedContent = updatedContent.replace(currentTabContent, newTabContent);
  
  // Write the updated content back to the file
  console.log('Writing updated content to EmployeeManagement.js...');
  fs.writeFileSync(targetFilePath, updatedContent, 'utf8');
  console.log('Successfully added Information tab to EmployeeManagement.js');
  
} catch (error) {
  console.error('Error updating file:', error);
  process.exit(1);
} 