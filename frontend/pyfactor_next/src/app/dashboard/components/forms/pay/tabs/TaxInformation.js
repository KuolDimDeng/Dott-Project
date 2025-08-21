'use client';

import React, { useState, useEffect } from 'react';
import { IdentificationIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

// Map countries to social security names
const SOCIAL_SECURITY_NAMES = {
  'US': 'Social Security Number (SSN)',
  'GB': 'National Insurance Number',
  'UK': 'National Insurance Number', 
  'CA': 'Social Insurance Number (SIN)',
  'AU': 'Tax File Number (TFN)',
  'NZ': 'IRD Number',
  'IN': 'PAN Card Number',
  'ZA': 'ID Number',
  'SG': 'NRIC Number',
  'MY': 'MyKad Number',
  'PH': 'TIN Number',
  'ID': 'KTP Number',
  'TH': 'Thai ID Number',
  'VN': 'CMND/CCCD Number',
  'JP': 'My Number',
  'KR': 'Resident Registration Number',
  'CN': 'Resident Identity Card Number',
  'HK': 'HKID Number',
  'TW': 'National ID Number',
  'AE': 'Emirates ID',
  'SA': 'Iqama Number',
  'BR': 'CPF Number',
  'MX': 'CURP',
  'AR': 'DNI Number',
  'CL': 'RUT Number',
  'CO': 'Cédula Number',
  'PE': 'DNI Number',
  'VE': 'Cédula Number',
  'FR': 'Social Security Number',
  'DE': 'Sozialversicherungsnummer',
  'IT': 'Codice Fiscale',
  'ES': 'DNI/NIE Number',
  'PT': 'NIF Number',
  'NL': 'BSN Number',
  'BE': 'National Register Number',
  'SE': 'Personal Identity Number',
  'NO': 'Fødselsnummer',
  'DK': 'CPR Number',
  'FI': 'Personal Identity Code',
  'PL': 'PESEL Number',
  'RU': 'SNILS Number',
  'TR': 'T.C. Kimlik No',
  'GR': 'AMKA Number',
  'IL': 'Teudat Zehut',
  'EG': 'National ID Number',
  'NG': 'National Identification Number',
  'KE': 'National ID Number',
  'GH': 'Ghana Card Number',
  'ZW': 'National ID Number',
  'UG': 'National ID Number',
  'TZ': 'National ID Number',
  'ET': 'Kebele ID',
  'RW': 'National ID Number',
  'SN': 'National ID Card',
  'CI': "Carte Nationale d'Identité",
  'CM': 'National ID Card',
  'DZ': 'National ID Number',
  'MA': 'CIN Number',
  'TN': 'CIN Number',
  'PK': 'CNIC Number',
  'BD': 'NID Number',
  'LK': 'NIC Number',
  'NP': 'Citizenship Number',
  'MM': 'NRC Number',
  'KH': 'National ID Card',
  'LA': 'National ID Card',
  'PG': 'NID Number',
  'FJ': 'TIN Number',
  'NZ': 'IRD Number',
  'IE': 'PPS Number',
  'IS': 'Kennitala',
  'LU': 'National ID Number',
  'CH': 'AHV Number',
  'AT': 'Sozialversicherungsnummer',
  'CZ': 'Birth Number',
  'SK': 'Birth Number',
  'HU': 'TAJ Number',
  'RO': 'CNP',
  'BG': 'EGN',
  'HR': 'OIB',
  'SI': 'EMŠO',
  'RS': 'JMBG',
  'BA': 'JMBG',
  'MK': 'EMBG',
  'AL': 'NID Number',
  'LT': 'Personal Code',
  'LV': 'Personal Code',
  'EE': 'Personal Code',
  'UA': 'RNOKPP',
  'BY': 'Personal Number',
  'MD': 'IDNP',
  'GE': 'Personal Number',
  'AM': 'Social Security Number',
  'AZ': 'Personal ID Number',
  'KZ': 'IIN',
  'UZ': 'PINFL',
  'TM': 'Personal Number',
  'KG': 'PIN',
  'TJ': 'Personal ID'
};

// Get the type code for backend
const SECURITY_TYPE_CODES = {
  'US': 'SSN',
  'GB': 'NIN',
  'UK': 'NIN',
  'CA': 'SIN',
  'AU': 'TFN',
  'IN': 'PAN',
  'DEFAULT': 'OTHER'
};

const TaxInformation = ({ employeeId }) => {
  const [loading, setLoading] = useState(true);
  const [userCountry, setUserCountry] = useState('US');
  const [taxInfo, setTaxInfo] = useState({
    securityNumberType: '',
    ssnLastFour: '',
    ssnStoredInStripe: false
  });

  const socialSecurityName = SOCIAL_SECURITY_NAMES[userCountry] || 'National ID Number';
  const securityTypeCode = SECURITY_TYPE_CODES[userCountry] || 'OTHER';

  useEffect(() => {
    fetchTaxInfo();
    fetchUserCountry();
  }, [employeeId]);

  const fetchUserCountry = async () => {
    try {
      const response = await fetch('/api/users/me');
      if (response.ok) {
        const data = await response.json();
        const country = data.business?.country || data.businessCountry || 'US';
        setUserCountry(country);
      }
    } catch (error) {
      console.error('Error fetching user country:', error);
    }
  };

  const fetchTaxInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/hr/employees/${employeeId}`);
      
      if (response.ok) {
        const data = await response.json();
        setTaxInfo({
          securityNumberType: data.security_number_type || '',
          ssnLastFour: data.ssn_last_four || '',
          ssnStoredInStripe: data.ssn_stored_in_stripe || false
        });
      }
    } catch (error) {
      console.error('Error fetching tax info:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Tax Information</h2>
      </div>

      {/* Social Security / National ID Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <IdentificationIcon className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-medium">{socialSecurityName}</h3>
        </div>

        <div className="space-y-4">
          {taxInfo.ssnLastFour ? (
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-mono text-gray-700">
                    {userCountry === 'US' ? (
                      <>•••-••-{taxInfo.ssnLastFour}</>
                    ) : (
                      <>••••••••{taxInfo.ssnLastFour}</>
                    )}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Last 4 digits of your {socialSecurityName.toLowerCase()}
                  </p>
                </div>
                {taxInfo.ssnStoredInStripe && (
                  <div className="flex items-center text-green-600">
                    <ShieldCheckIcon className="h-5 w-5 mr-1" />
                    <span className="text-sm">Verified</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-600">
                No {socialSecurityName.toLowerCase()} on file
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Please contact your HR administrator to add your {socialSecurityName.toLowerCase()}.
              </p>
            </div>
          )}
        </div>

        {/* Security Note */}
        {taxInfo.ssnStoredInStripe && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <ShieldCheckIcon className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="ml-3">
                <h4 className="text-sm font-medium text-blue-900">Securely Stored</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Your full {socialSecurityName.toLowerCase()} is encrypted and securely stored with our payment processor, Stripe. 
                  Only the last 4 digits are displayed for your protection.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tax Withholding Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium mb-4">Tax Withholding</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">Federal/National Tax</p>
            <p className="text-xl font-semibold text-gray-800">Standard Rate</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600">State/Regional Tax</p>
            <p className="text-xl font-semibold text-gray-800">Standard Rate</p>
          </div>
        </div>

        <p className="text-sm text-gray-500 mt-4">
          Tax rates are calculated based on your location and income level. 
          Contact HR to update your tax withholding preferences.
        </p>
      </div>
    </div>
  );
};

export default TaxInformation;