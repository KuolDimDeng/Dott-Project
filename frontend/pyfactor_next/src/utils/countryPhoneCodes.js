/**
 * Global mapping of countries to their phone codes and formats
 * Used for international phone number input with country selection
 */

export const COUNTRY_PHONE_CODES = [
  // North America
  { country: 'United States', code: 'US', phoneCode: '+1', flag: '🇺🇸', format: '(999) 999-9999' },
  { country: 'Canada', code: 'CA', phoneCode: '+1', flag: '🇨🇦', format: '(999) 999-9999' },
  { country: 'Mexico', code: 'MX', phoneCode: '+52', flag: '🇲🇽', format: '99 9999 9999' },

  // Europe
  { country: 'United Kingdom', code: 'GB', phoneCode: '+44', flag: '🇬🇧', format: '9999 999999' },
  { country: 'Germany', code: 'DE', phoneCode: '+49', flag: '🇩🇪', format: '999 99999999' },
  { country: 'France', code: 'FR', phoneCode: '+33', flag: '🇫🇷', format: '9 99 99 99 99' },
  { country: 'Italy', code: 'IT', phoneCode: '+39', flag: '🇮🇹', format: '999 999 9999' },
  { country: 'Spain', code: 'ES', phoneCode: '+34', flag: '🇪🇸', format: '999 99 99 99' },
  { country: 'Netherlands', code: 'NL', phoneCode: '+31', flag: '🇳🇱', format: '9 99999999' },
  { country: 'Belgium', code: 'BE', phoneCode: '+32', flag: '🇧🇪', format: '999 99 99 99' },
  { country: 'Switzerland', code: 'CH', phoneCode: '+41', flag: '🇨🇭', format: '99 999 99 99' },
  { country: 'Austria', code: 'AT', phoneCode: '+43', flag: '🇦🇹', format: '999 9999999' },
  { country: 'Sweden', code: 'SE', phoneCode: '+46', flag: '🇸🇪', format: '99 999 99 99' },
  { country: 'Norway', code: 'NO', phoneCode: '+47', flag: '🇳🇴', format: '999 99 999' },
  { country: 'Denmark', code: 'DK', phoneCode: '+45', flag: '🇩🇰', format: '99 99 99 99' },
  { country: 'Finland', code: 'FI', phoneCode: '+358', flag: '🇫🇮', format: '99 999 9999' },
  { country: 'Poland', code: 'PL', phoneCode: '+48', flag: '🇵🇱', format: '999 999 999' },
  { country: 'Portugal', code: 'PT', phoneCode: '+351', flag: '🇵🇹', format: '999 999 999' },
  { country: 'Greece', code: 'GR', phoneCode: '+30', flag: '🇬🇷', format: '999 999 9999' },
  { country: 'Ireland', code: 'IE', phoneCode: '+353', flag: '🇮🇪', format: '99 999 9999' },
  { country: 'Czech Republic', code: 'CZ', phoneCode: '+420', flag: '🇨🇿', format: '999 999 999' },
  { country: 'Hungary', code: 'HU', phoneCode: '+36', flag: '🇭🇺', format: '99 999 9999' },
  { country: 'Romania', code: 'RO', phoneCode: '+40', flag: '🇷🇴', format: '999 999 999' },

  // Asia
  { country: 'China', code: 'CN', phoneCode: '+86', flag: '🇨🇳', format: '999 9999 9999' },
  { country: 'Japan', code: 'JP', phoneCode: '+81', flag: '🇯🇵', format: '99 9999 9999' },
  { country: 'India', code: 'IN', phoneCode: '+91', flag: '🇮🇳', format: '99999 99999' },
  { country: 'South Korea', code: 'KR', phoneCode: '+82', flag: '🇰🇷', format: '99 9999 9999' },
  { country: 'Singapore', code: 'SG', phoneCode: '+65', flag: '🇸🇬', format: '9999 9999' },
  { country: 'Malaysia', code: 'MY', phoneCode: '+60', flag: '🇲🇾', format: '99 999 9999' },
  { country: 'Thailand', code: 'TH', phoneCode: '+66', flag: '🇹🇭', format: '99 999 9999' },
  { country: 'Vietnam', code: 'VN', phoneCode: '+84', flag: '🇻🇳', format: '99 999 9999' },
  { country: 'Philippines', code: 'PH', phoneCode: '+63', flag: '🇵🇭', format: '999 999 9999' },
  { country: 'Indonesia', code: 'ID', phoneCode: '+62', flag: '🇮🇩', format: '999 999 9999' },

  // Africa
  { country: 'South Africa', code: 'ZA', phoneCode: '+27', flag: '🇿🇦', format: '99 999 9999' },
  { country: 'Nigeria', code: 'NG', phoneCode: '+234', flag: '🇳🇬', format: '999 999 9999' },
  { country: 'Kenya', code: 'KE', phoneCode: '+254', flag: '🇰🇪', format: '999 999999' },
  { country: 'Ghana', code: 'GH', phoneCode: '+233', flag: '🇬🇭', format: '999 999 9999' },
  { country: 'Uganda', code: 'UG', phoneCode: '+256', flag: '🇺🇬', format: '999 999999' },
  { country: 'Tanzania', code: 'TZ', phoneCode: '+255', flag: '🇹🇿', format: '999 999 999' },
  { country: 'Rwanda', code: 'RW', phoneCode: '+250', flag: '🇷🇼', format: '999 999 999' },
  { country: 'Ethiopia', code: 'ET', phoneCode: '+251', flag: '🇪🇹', format: '99 999 9999' },
  { country: 'Morocco', code: 'MA', phoneCode: '+212', flag: '🇲🇦', format: '999 99 99 99' },
  { country: 'Egypt', code: 'EG', phoneCode: '+20', flag: '🇪🇬', format: '999 999 9999' },

  // Middle East
  { country: 'United Arab Emirates', code: 'AE', phoneCode: '+971', flag: '🇦🇪', format: '99 999 9999' },
  { country: 'Saudi Arabia', code: 'SA', phoneCode: '+966', flag: '🇸🇦', format: '99 999 9999' },
  { country: 'Israel', code: 'IL', phoneCode: '+972', flag: '🇮🇱', format: '99 999 9999' },
  { country: 'Turkey', code: 'TR', phoneCode: '+90', flag: '🇹🇷', format: '999 999 99 99' },

  // Oceania
  { country: 'Australia', code: 'AU', phoneCode: '+61', flag: '🇦🇺', format: '999 999 999' },
  { country: 'New Zealand', code: 'NZ', phoneCode: '+64', flag: '🇳🇿', format: '99 999 9999' },

  // South America
  { country: 'Brazil', code: 'BR', phoneCode: '+55', flag: '🇧🇷', format: '99 99999 9999' },
  { country: 'Argentina', code: 'AR', phoneCode: '+54', flag: '🇦🇷', format: '99 9999 9999' },
  { country: 'Chile', code: 'CL', phoneCode: '+56', flag: '🇨🇱', format: '9 9999 9999' },
  { country: 'Colombia', code: 'CO', phoneCode: '+57', flag: '🇨🇴', format: '999 999 9999' },
  { country: 'Peru', code: 'PE', phoneCode: '+51', flag: '🇵🇪', format: '999 999 999' },
  { country: 'Venezuela', code: 'VE', phoneCode: '+58', flag: '🇻🇪', format: '999 999 9999' },
];

/**
 * Get country by code
 */
export const getCountryByCode = (code) => {
  return COUNTRY_PHONE_CODES.find(country => country.code === code) || COUNTRY_PHONE_CODES[0]; // Default to US
};

/**
 * Get all countries for dropdown
 */
export const getAllPhoneCountries = () => {
  return COUNTRY_PHONE_CODES.sort((a, b) => a.country.localeCompare(b.country));
};

/**
 * Format phone number according to country format
 */
export const formatPhoneNumber = (phoneNumber, countryCode) => {
  if (!phoneNumber) return '';
  
  const country = getCountryByCode(countryCode);
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  
  // Apply country-specific formatting
  const format = country.format;
  let formatted = '';
  let numberIndex = 0;
  
  for (let i = 0; i < format.length && numberIndex < cleanNumber.length; i++) {
    if (format[i] === '9') {
      formatted += cleanNumber[numberIndex];
      numberIndex++;
    } else {
      formatted += format[i];
    }
  }
  
  return formatted;
};

/**
 * Combine country code and phone number to international format
 */
export const getInternationalPhoneNumber = (phoneNumber, countryCode) => {
  if (!phoneNumber) return '';
  
  const country = getCountryByCode(countryCode);
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  
  return `${country.phoneCode}${cleanNumber}`;
};