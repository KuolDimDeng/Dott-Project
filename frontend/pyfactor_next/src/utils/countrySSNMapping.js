/**
 * Global mapping of countries to their SSN/Tax ID equivalents
 * Each entry contains the country name, code, and the local name for their tax identification number
 */

export const COUNTRY_SSN_MAPPING = [
  // North America
  { country: 'United States', code: 'US', ssnName: 'Social Security Number (SSN)', format: '999-99-9999', required: true },
  { country: 'Canada', code: 'CA', ssnName: 'Social Insurance Number (SIN)', format: '999-999-999', required: true },
  { country: 'Mexico', code: 'MX', ssnName: 'CURP/RFC', format: 'AAAA999999AAAAAA99', required: true },

  // Europe
  { country: 'United Kingdom', code: 'GB', ssnName: 'National Insurance Number (NINO)', format: 'AA999999A', required: true },
  { country: 'Germany', code: 'DE', ssnName: 'Steueridentifikationsnummer', format: '99 999 999 999', required: true },
  { country: 'France', code: 'FR', ssnName: 'Numéro de Sécurité Sociale', format: '9 99 99 99 999 999 99', required: true },
  { country: 'Italy', code: 'IT', ssnName: 'Codice Fiscale', format: 'AAAAAA99A99A999A', required: true },
  { country: 'Spain', code: 'ES', ssnName: 'NIE/NIF', format: 'X9999999A', required: true },
  { country: 'Netherlands', code: 'NL', ssnName: 'BSN (Burgerservicenummer)', format: '999999999', required: true },
  { country: 'Belgium', code: 'BE', ssnName: 'National Register Number', format: '99.99.99-999.99', required: true },
  { country: 'Switzerland', code: 'CH', ssnName: 'AHV Number', format: '756.9999.9999.99', required: true },
  { country: 'Austria', code: 'AT', ssnName: 'Sozialversicherungsnummer', format: '9999 999999', required: true },
  { country: 'Sweden', code: 'SE', ssnName: 'Personnummer', format: '999999-9999', required: true },
  { country: 'Norway', code: 'NO', ssnName: 'Fødselsnummer', format: '999999 99999', required: true },
  { country: 'Denmark', code: 'DK', ssnName: 'CPR Number', format: '999999-9999', required: true },
  { country: 'Finland', code: 'FI', ssnName: 'Henkilötunnus', format: '999999-999A', required: true },
  { country: 'Poland', code: 'PL', ssnName: 'PESEL', format: '99999999999', required: true },
  { country: 'Portugal', code: 'PT', ssnName: 'NIF', format: '999999999', required: true },
  { country: 'Greece', code: 'GR', ssnName: 'AFM', format: '999999999', required: true },
  { country: 'Ireland', code: 'IE', ssnName: 'PPS Number', format: '9999999AA', required: true },
  { country: 'Czech Republic', code: 'CZ', ssnName: 'Rodné číslo', format: '999999/9999', required: true },
  { country: 'Hungary', code: 'HU', ssnName: 'TAJ szám', format: '999 999 999', required: true },
  { country: 'Romania', code: 'RO', ssnName: 'CNP', format: '9999999999999', required: true },
  { country: 'Bulgaria', code: 'BG', ssnName: 'EGN', format: '9999999999', required: true },
  { country: 'Croatia', code: 'HR', ssnName: 'OIB', format: '99999999999', required: true },
  { country: 'Slovenia', code: 'SI', ssnName: 'EMŠO', format: '9999999999999', required: true },
  { country: 'Slovakia', code: 'SK', ssnName: 'Rodné číslo', format: '999999/9999', required: true },
  { country: 'Estonia', code: 'EE', ssnName: 'Isikukood', format: '99999999999', required: true },
  { country: 'Latvia', code: 'LV', ssnName: 'Personas kods', format: '999999-99999', required: true },
  { country: 'Lithuania', code: 'LT', ssnName: 'Asmens kodas', format: '99999999999', required: true },
  { country: 'Luxembourg', code: 'LU', ssnName: 'Social Security Number', format: '9999999999999', required: true },
  { country: 'Malta', code: 'MT', ssnName: 'ID Card Number', format: '9999999A', required: true },
  { country: 'Cyprus', code: 'CY', ssnName: 'Tax Identification Code', format: '99999999A', required: true },

  // Asia
  { country: 'China', code: 'CN', ssnName: 'Resident Identity Card Number', format: '999999999999999999', required: true },
  { country: 'Japan', code: 'JP', ssnName: 'My Number (マイナンバー)', format: '9999 9999 9999', required: true },
  { country: 'India', code: 'IN', ssnName: 'Aadhaar/PAN', format: 'AAAAA9999A', required: true },
  { country: 'South Korea', code: 'KR', ssnName: 'Resident Registration Number', format: '999999-9999999', required: true },
  { country: 'Singapore', code: 'SG', ssnName: 'NRIC/FIN', format: 'A9999999A', required: true },
  { country: 'Malaysia', code: 'MY', ssnName: 'MyKad Number', format: '999999-99-9999', required: true },
  { country: 'Thailand', code: 'TH', ssnName: 'Thai ID Card Number', format: '9-9999-99999-99-9', required: true },
  { country: 'Indonesia', code: 'ID', ssnName: 'NIK', format: '9999999999999999', required: true },
  { country: 'Philippines', code: 'PH', ssnName: 'SSS Number', format: '99-9999999-9', required: true },
  { country: 'Vietnam', code: 'VN', ssnName: 'Citizen Identity Card', format: '999999999999', required: true },
  { country: 'Taiwan', code: 'TW', ssnName: 'National ID Number', format: 'A999999999', required: true },
  { country: 'Hong Kong', code: 'HK', ssnName: 'HKID', format: 'A999999(9)', required: true },
  { country: 'Israel', code: 'IL', ssnName: 'Teudat Zehut', format: '999999999', required: true },
  { country: 'Turkey', code: 'TR', ssnName: 'TC Kimlik No', format: '99999999999', required: true },
  { country: 'Saudi Arabia', code: 'SA', ssnName: 'National ID/Iqama', format: '9999999999', required: true },
  { country: 'United Arab Emirates', code: 'AE', ssnName: 'Emirates ID', format: '999-9999-9999999-9', required: true },
  { country: 'Pakistan', code: 'PK', ssnName: 'CNIC', format: '99999-9999999-9', required: true },
  { country: 'Bangladesh', code: 'BD', ssnName: 'NID', format: '9999999999999', required: true },
  { country: 'Sri Lanka', code: 'LK', ssnName: 'NIC', format: '999999999V', required: true },
  { country: 'Nepal', code: 'NP', ssnName: 'Citizenship Number', format: '99-99-99-99999', required: false },
  { country: 'Myanmar', code: 'MM', ssnName: 'NRC', format: '99/AAAAAA(N)999999', required: false },
  { country: 'Cambodia', code: 'KH', ssnName: 'National ID Card', format: '999999999', required: false },
  { country: 'Kazakhstan', code: 'KZ', ssnName: 'IIN', format: '999999999999', required: true },
  { country: 'Uzbekistan', code: 'UZ', ssnName: 'PINFL', format: '99999999999999', required: true },
  { country: 'Qatar', code: 'QA', ssnName: 'QID', format: '99999999999', required: true },
  { country: 'Kuwait', code: 'KW', ssnName: 'Civil ID', format: '999999999999', required: true },
  { country: 'Bahrain', code: 'BH', ssnName: 'CPR', format: '999999999', required: true },
  { country: 'Oman', code: 'OM', ssnName: 'Civil Number', format: '99999999', required: true },
  { country: 'Jordan', code: 'JO', ssnName: 'National Number', format: '9999999999', required: true },
  { country: 'Lebanon', code: 'LB', ssnName: 'Personal Number', format: '99999999', required: false },
  { country: 'Iraq', code: 'IQ', ssnName: 'National Card Number', format: '999999999999', required: false },
  { country: 'Iran', code: 'IR', ssnName: 'National Code', format: '999-999999-9', required: true },
  { country: 'Afghanistan', code: 'AF', ssnName: 'Tazkira', format: 'Variable', required: false },

  // Oceania
  { country: 'Australia', code: 'AU', ssnName: 'Tax File Number (TFN)', format: '999 999 999', required: true },
  { country: 'New Zealand', code: 'NZ', ssnName: 'IRD Number', format: '99-999-999', required: true },
  { country: 'Papua New Guinea', code: 'PG', ssnName: 'TIN', format: '999999999', required: false },
  { country: 'Fiji', code: 'FJ', ssnName: 'TIN', format: '99-99999-9-9', required: false },

  // Africa
  { country: 'South Africa', code: 'ZA', ssnName: 'ID Number', format: '9999999999999', required: true },
  { country: 'Nigeria', code: 'NG', ssnName: 'NIN', format: '99999999999', required: true },
  { country: 'Kenya', code: 'KE', ssnName: 'National ID/KRA PIN', format: 'A999999999A', required: true },
  { country: 'Ghana', code: 'GH', ssnName: 'Ghana Card Number', format: 'GHA-999999999-9', required: true },
  { country: 'Egypt', code: 'EG', ssnName: 'National ID', format: '99999999999999', required: true },
  { country: 'Morocco', code: 'MA', ssnName: 'CIN', format: 'AA999999', required: true },
  { country: 'Algeria', code: 'DZ', ssnName: 'NIN', format: '99999999999999999', required: true },
  { country: 'Tunisia', code: 'TN', ssnName: 'CIN', format: '99999999', required: true },
  { country: 'Ethiopia', code: 'ET', ssnName: 'TIN', format: '9999999999', required: false },
  { country: 'Tanzania', code: 'TZ', ssnName: 'NIN/TIN', format: '99999999999999999999', required: false },
  { country: 'Uganda', code: 'UG', ssnName: 'NIN', format: 'CF99999999999AA', required: true },
  { country: 'Zimbabwe', code: 'ZW', ssnName: 'National ID', format: '99-999999-A-99', required: true },
  { country: 'Zambia', code: 'ZM', ssnName: 'NRC', format: '999999/99/9', required: true },
  { country: 'Rwanda', code: 'RW', ssnName: 'National ID', format: '9 9999 9 9999999 9 99', required: true },
  { country: 'Botswana', code: 'BW', ssnName: 'Omang', format: '999999999', required: true },
  { country: 'Namibia', code: 'NA', ssnName: 'ID Number', format: '99999999999', required: true },
  { country: 'Mozambique', code: 'MZ', ssnName: 'NUIT', format: '999999999', required: false },
  { country: 'Angola', code: 'AO', ssnName: 'BI', format: '999999999AA9999', required: false },
  { country: 'Senegal', code: 'SN', ssnName: 'CNI', format: '9999999999999', required: false },
  { country: 'Ivory Coast', code: 'CI', ssnName: 'CNI', format: 'Variable', required: false },
  { country: 'Cameroon', code: 'CM', ssnName: 'CNI', format: '999999999999', required: false },
  { country: 'Mali', code: 'ML', ssnName: 'NINA', format: '99999999999999999', required: false },
  { country: 'Burkina Faso', code: 'BF', ssnName: 'CNIB', format: 'B9999999', required: false },
  { country: 'Niger', code: 'NE', ssnName: 'NIN', format: '99999999', required: false },
  { country: 'Mauritius', code: 'MU', ssnName: 'NIC', format: 'A999999999999', required: true },
  { country: 'Madagascar', code: 'MG', ssnName: 'CIN', format: '999 999 999 999', required: false },
  { country: 'Malawi', code: 'MW', ssnName: 'National ID', format: 'AA 999999', required: false },
  { country: 'Libya', code: 'LY', ssnName: 'National ID Number', format: '999999999999', required: false },
  { country: 'Sudan', code: 'SD', ssnName: 'National Number', format: '999999999999', required: false },

  // South America
  { country: 'Brazil', code: 'BR', ssnName: 'CPF', format: '999.999.999-99', required: true },
  { country: 'Argentina', code: 'AR', ssnName: 'DNI/CUIL', format: '99-99999999-9', required: true },
  { country: 'Chile', code: 'CL', ssnName: 'RUT', format: '99.999.999-K', required: true },
  { country: 'Colombia', code: 'CO', ssnName: 'Cédula', format: '99999999999', required: true },
  { country: 'Peru', code: 'PE', ssnName: 'DNI', format: '99999999', required: true },
  { country: 'Venezuela', code: 'VE', ssnName: 'Cédula', format: 'V-99999999', required: true },
  { country: 'Ecuador', code: 'EC', ssnName: 'Cédula', format: '9999999999', required: true },
  { country: 'Bolivia', code: 'BO', ssnName: 'CI', format: '9999999-AA', required: true },
  { country: 'Uruguay', code: 'UY', ssnName: 'CI', format: '9.999.999-9', required: true },
  { country: 'Paraguay', code: 'PY', ssnName: 'CI', format: '9999999', required: true },
  { country: 'Guyana', code: 'GY', ssnName: 'National ID', format: '999999999', required: false },
  { country: 'Suriname', code: 'SR', ssnName: 'ID Number', format: '99999999', required: false },

  // Central America & Caribbean
  { country: 'Guatemala', code: 'GT', ssnName: 'DPI/CUI', format: '9999 99999 9999', required: true },
  { country: 'Honduras', code: 'HN', ssnName: 'DNI', format: '9999-9999-99999', required: true },
  { country: 'El Salvador', code: 'SV', ssnName: 'DUI', format: '99999999-9', required: true },
  { country: 'Nicaragua', code: 'NI', ssnName: 'Cédula', format: '999-999999-9999A', required: true },
  { country: 'Costa Rica', code: 'CR', ssnName: 'Cédula', format: '9-9999-9999', required: true },
  { country: 'Panama', code: 'PA', ssnName: 'Cédula', format: '9-999-9999', required: true },
  { country: 'Jamaica', code: 'JM', ssnName: 'TRN', format: '999-999-999', required: true },
  { country: 'Trinidad and Tobago', code: 'TT', ssnName: 'National ID', format: '999999999999', required: true },
  { country: 'Barbados', code: 'BB', ssnName: 'National ID', format: '999999999', required: true },
  { country: 'Bahamas', code: 'BS', ssnName: 'NIB Number', format: 'A-99999', required: true },
  { country: 'Dominican Republic', code: 'DO', ssnName: 'Cédula', format: '999-9999999-9', required: true },
  { country: 'Haiti', code: 'HT', ssnName: 'CIN', format: '99-99-99-9999-99-99', required: false },
  { country: 'Cuba', code: 'CU', ssnName: 'CI', format: '99999999999', required: true },
  { country: 'Puerto Rico', code: 'PR', ssnName: 'Social Security Number (SSN)', format: '999-99-9999', required: true },
  { country: 'Belize', code: 'BZ', ssnName: 'Social Security Number', format: '999999', required: false },

  // Additional territories and small nations
  { country: 'Iceland', code: 'IS', ssnName: 'Kennitala', format: '999999-9999', required: true },
  { country: 'Greenland', code: 'GL', ssnName: 'CPR Number', format: '999999-9999', required: true },
  { country: 'Monaco', code: 'MC', ssnName: 'Social Security Number', format: '999999999999999', required: true },
  { country: 'Andorra', code: 'AD', ssnName: 'NRT', format: 'A999999', required: true },
  { country: 'Liechtenstein', code: 'LI', ssnName: 'AHV Number', format: '756.9999.9999.99', required: true },
  { country: 'San Marino', code: 'SM', ssnName: 'ISS Number', format: '999999', required: true },
  { country: 'Vatican City', code: 'VA', ssnName: 'ID Number', format: 'Variable', required: false },
  { country: 'Maldives', code: 'MV', ssnName: 'National ID Card', format: 'A999999', required: true },
  { country: 'Seychelles', code: 'SC', ssnName: 'NIN', format: '999999', required: true },
  { country: 'Mauritania', code: 'MR', ssnName: 'NNI', format: '999999999999', required: false },
  { country: 'Djibouti', code: 'DJ', ssnName: 'ID Number', format: '999999', required: false },
  { country: 'Comoros', code: 'KM', ssnName: 'ID Number', format: 'Variable', required: false },
  { country: 'Cape Verde', code: 'CV', ssnName: 'BI', format: '999999999', required: false },
  { country: 'São Tomé and Príncipe', code: 'ST', ssnName: 'BI', format: '999999', required: false },
  { country: 'Equatorial Guinea', code: 'GQ', ssnName: 'ID Number', format: 'Variable', required: false },
  { country: 'Gabon', code: 'GA', ssnName: 'ID Number', format: '999999999', required: false },
  { country: 'Republic of Congo', code: 'CG', ssnName: 'ID Number', format: 'Variable', required: false },
  { country: 'Democratic Republic of Congo', code: 'CD', ssnName: 'ID Number', format: 'Variable', required: false },
  { country: 'Central African Republic', code: 'CF', ssnName: 'ID Number', format: 'Variable', required: false },
  { country: 'Chad', code: 'TD', ssnName: 'ID Number', format: 'Variable', required: false },
  { country: 'Burundi', code: 'BI', ssnName: 'CNI', format: 'Variable', required: false },
  { country: 'Eritrea', code: 'ER', ssnName: 'ID Number', format: 'Variable', required: false },
  { country: 'Somalia', code: 'SO', ssnName: 'ID Number', format: 'Variable', required: false },
  { country: 'South Sudan', code: 'SS', ssnName: 'ID Number', format: 'Variable', required: false },
  { country: 'Lesotho', code: 'LS', ssnName: 'ID Number', format: '9999999999999', required: false },
  { country: 'Eswatini', code: 'SZ', ssnName: 'PIN', format: '999999999', required: false },
  { country: 'Guinea', code: 'GN', ssnName: 'ID Number', format: 'Variable', required: false },
  { country: 'Guinea-Bissau', code: 'GW', ssnName: 'ID Number', format: 'Variable', required: false },
  { country: 'Liberia', code: 'LR', ssnName: 'ID Number', format: 'Variable', required: false },
  { country: 'Sierra Leone', code: 'SL', ssnName: 'ID Number', format: 'Variable', required: false },
  { country: 'Togo', code: 'TG', ssnName: 'ID Number', format: 'Variable', required: false },
  { country: 'Benin', code: 'BJ', ssnName: 'ID Number', format: 'Variable', required: false },
  { country: 'Gambia', code: 'GM', ssnName: 'ID Number', format: 'Variable', required: false },
  { country: 'Brunei', code: 'BN', ssnName: 'IC Number', format: '99-999999', required: true },
  { country: 'East Timor', code: 'TL', ssnName: 'ID Number', format: '999999999999', required: false },
  { country: 'Laos', code: 'LA', ssnName: 'ID Number', format: '999999999999', required: false },
  { country: 'Bhutan', code: 'BT', ssnName: 'CID', format: '99999999999', required: true },
  { country: 'Mongolia', code: 'MN', ssnName: 'Registration Number', format: 'AA99999999', required: true },
  { country: 'North Korea', code: 'KP', ssnName: 'Citizen Card Number', format: 'Variable', required: false },
  { country: 'Turkmenistan', code: 'TM', ssnName: 'ID Number', format: '999999999', required: false },
  { country: 'Tajikistan', code: 'TJ', ssnName: 'ID Number', format: '999999999', required: false },
  { country: 'Kyrgyzstan', code: 'KG', ssnName: 'PIN', format: '99999999999999', required: true },
  { country: 'Armenia', code: 'AM', ssnName: 'Social Security Number', format: '9999999999', required: true },
  { country: 'Azerbaijan', code: 'AZ', ssnName: 'PIN', format: 'AAAAAAA', required: true },
  { country: 'Georgia', code: 'GE', ssnName: 'Personal Number', format: '99999999999', required: true },
  { country: 'Moldova', code: 'MD', ssnName: 'IDNP', format: '9999999999999', required: true },
  { country: 'Belarus', code: 'BY', ssnName: 'Personal Number', format: '9999999A999AA9', required: true },
  { country: 'Ukraine', code: 'UA', ssnName: 'RNTRC', format: '9999999999', required: true },
  { country: 'Russia', code: 'RU', ssnName: 'SNILS', format: '999-999-999 99', required: true },
  { country: 'Serbia', code: 'RS', ssnName: 'JMBG', format: '9999999999999', required: true },
  { country: 'Montenegro', code: 'ME', ssnName: 'JMBG', format: '9999999999999', required: true },
  { country: 'Bosnia and Herzegovina', code: 'BA', ssnName: 'JMBG', format: '9999999999999', required: true },
  { country: 'Albania', code: 'AL', ssnName: 'NID', format: 'A99999999A', required: true },
  { country: 'North Macedonia', code: 'MK', ssnName: 'EMBG', format: '9999999999999', required: true },
  { country: 'Kosovo', code: 'XK', ssnName: 'Personal Number', format: '9999999999', required: true },
  { country: 'Palau', code: 'PW', ssnName: 'ID Number', format: 'Variable', required: false },
  { country: 'Marshall Islands', code: 'MH', ssnName: 'SSN', format: '999-99-9999', required: false },
  { country: 'Micronesia', code: 'FM', ssnName: 'SSN', format: '999-99-9999', required: false },
  { country: 'Kiribati', code: 'KI', ssnName: 'ID Number', format: 'Variable', required: false },
  { country: 'Nauru', code: 'NR', ssnName: 'ID Number', format: 'Variable', required: false },
  { country: 'Tuvalu', code: 'TV', ssnName: 'ID Number', format: 'Variable', required: false },
  { country: 'Samoa', code: 'WS', ssnName: 'ID Number', format: 'Variable', required: false },
  { country: 'Tonga', code: 'TO', ssnName: 'ID Number', format: 'Variable', required: false },
  { country: 'Vanuatu', code: 'VU', ssnName: 'ID Number', format: 'Variable', required: false },
  { country: 'Solomon Islands', code: 'SB', ssnName: 'ID Number', format: 'Variable', required: false },
  { country: 'Saint Lucia', code: 'LC', ssnName: 'NIS Number', format: '999999999', required: false },
  { country: 'Saint Vincent', code: 'VC', ssnName: 'NIS Number', format: '999999999', required: false },
  { country: 'Grenada', code: 'GD', ssnName: 'NIS Number', format: '999999999', required: false },
  { country: 'Saint Kitts and Nevis', code: 'KN', ssnName: 'Social Security Number', format: '99999', required: false },
  { country: 'Antigua and Barbuda', code: 'AG', ssnName: 'Social Security Number', format: '999999', required: false },
  { country: 'Dominica', code: 'DM', ssnName: 'Social Security Number', format: '999999999', required: false },
];

/**
 * Get SSN information for a specific country
 */
export function getSSNInfoByCountry(countryCode) {
  return COUNTRY_SSN_MAPPING.find(item => item.code === countryCode) || null;
}

/**
 * Get SSN information by country name
 */
export function getSSNInfoByCountryName(countryName) {
  return COUNTRY_SSN_MAPPING.find(item => 
    item.country.toLowerCase() === countryName.toLowerCase()
  ) || null;
}

/**
 * Get all countries list for dropdown
 */
export function getAllCountries() {
  return COUNTRY_SSN_MAPPING.map(item => ({
    value: item.code,
    label: item.country,
    ssnName: item.ssnName,
    format: item.format,
    required: item.required
  }));
}

/**
 * Validate SSN format for a specific country (basic validation)
 */
export function validateSSNFormat(countryCode, ssn) {
  const countryInfo = getSSNInfoByCountry(countryCode);
  if (!countryInfo || !countryInfo.required) {
    return true; // Optional or no validation for this country
  }
  
  // Remove common formatting characters
  const cleanSSN = ssn.replace(/[\s\-\.\/]/g, '');
  
  // Basic length validation
  if (cleanSSN.length < 5 || cleanSSN.length > 20) {
    return false;
  }
  
  // Country-specific validation could be added here
  return true;
}