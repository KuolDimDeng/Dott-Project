/**
 * List of developing countries eligible for 50% discount
 * Based on World Bank classifications
 */

export const DEVELOPING_COUNTRIES = {
  // Africa
  'KE': { name: 'Kenya', discount: 50 },
  'NG': { name: 'Nigeria', discount: 50 },
  'GH': { name: 'Ghana', discount: 50 },
  'ZA': { name: 'South Africa', discount: 50 },
  'TZ': { name: 'Tanzania', discount: 50 },
  'UG': { name: 'Uganda', discount: 50 },
  'ET': { name: 'Ethiopia', discount: 50 },
  'RW': { name: 'Rwanda', discount: 50 },
  'ZM': { name: 'Zambia', discount: 50 },
  'ZW': { name: 'Zimbabwe', discount: 50 },
  'MW': { name: 'Malawi', discount: 50 },
  'MZ': { name: 'Mozambique', discount: 50 },
  'BW': { name: 'Botswana', discount: 50 },
  'NA': { name: 'Namibia', discount: 50 },
  'SN': { name: 'Senegal', discount: 50 },
  'CI': { name: "Côte d'Ivoire", discount: 50 },
  'CM': { name: 'Cameroon', discount: 50 },
  'AO': { name: 'Angola', discount: 50 },
  'GA': { name: 'Gabon', discount: 50 },
  'CG': { name: 'Congo', discount: 50 },
  'CD': { name: 'Democratic Republic of Congo', discount: 50 },
  'SD': { name: 'Sudan', discount: 50 },
  'EG': { name: 'Egypt', discount: 50 },
  'MA': { name: 'Morocco', discount: 50 },
  'TN': { name: 'Tunisia', discount: 50 },
  'DZ': { name: 'Algeria', discount: 50 },
  'LY': { name: 'Libya', discount: 50 },
  
  // Asia
  'IN': { name: 'India', discount: 50 },
  'BD': { name: 'Bangladesh', discount: 50 },
  'PK': { name: 'Pakistan', discount: 50 },
  'ID': { name: 'Indonesia', discount: 50 },
  'PH': { name: 'Philippines', discount: 50 },
  'VN': { name: 'Vietnam', discount: 50 },
  'TH': { name: 'Thailand', discount: 50 },
  'MM': { name: 'Myanmar', discount: 50 },
  'KH': { name: 'Cambodia', discount: 50 },
  'LA': { name: 'Laos', discount: 50 },
  'NP': { name: 'Nepal', discount: 50 },
  'LK': { name: 'Sri Lanka', discount: 50 },
  'AF': { name: 'Afghanistan', discount: 50 },
  
  // Latin America
  'BR': { name: 'Brazil', discount: 50 },
  'MX': { name: 'Mexico', discount: 50 },
  'AR': { name: 'Argentina', discount: 50 },
  'CO': { name: 'Colombia', discount: 50 },
  'PE': { name: 'Peru', discount: 50 },
  'VE': { name: 'Venezuela', discount: 50 },
  'EC': { name: 'Ecuador', discount: 50 },
  'BO': { name: 'Bolivia', discount: 50 },
  'PY': { name: 'Paraguay', discount: 50 },
  'UY': { name: 'Uruguay', discount: 50 },
  'GT': { name: 'Guatemala', discount: 50 },
  'HN': { name: 'Honduras', discount: 50 },
  'SV': { name: 'El Salvador', discount: 50 },
  'NI': { name: 'Nicaragua', discount: 50 },
  'CR': { name: 'Costa Rica', discount: 50 },
  'PA': { name: 'Panama', discount: 50 },
  'DO': { name: 'Dominican Republic', discount: 50 },
  'HT': { name: 'Haiti', discount: 50 },
  'JM': { name: 'Jamaica', discount: 50 },
  
  // Middle East
  'IQ': { name: 'Iraq', discount: 50 },
  'YE': { name: 'Yemen', discount: 50 },
  'SY': { name: 'Syria', discount: 50 },
  'JO': { name: 'Jordan', discount: 50 },
  'LB': { name: 'Lebanon', discount: 50 },
  'PS': { name: 'Palestine', discount: 50 },
  
  // Europe
  'UA': { name: 'Ukraine', discount: 50 },
  'MD': { name: 'Moldova', discount: 50 },
  'AL': { name: 'Albania', discount: 50 },
  'BA': { name: 'Bosnia and Herzegovina', discount: 50 },
  'RS': { name: 'Serbia', discount: 50 },
  'ME': { name: 'Montenegro', discount: 50 },
  'MK': { name: 'North Macedonia', discount: 50 },
  'XK': { name: 'Kosovo', discount: 50 },
  
  // Pacific
  'PG': { name: 'Papua New Guinea', discount: 50 },
  'FJ': { name: 'Fiji', discount: 50 },
  'WS': { name: 'Samoa', discount: 50 },
  'TO': { name: 'Tonga', discount: 50 },
  'VU': { name: 'Vanuatu', discount: 50 },
  'SB': { name: 'Solomon Islands', discount: 50 },
};

/**
 * Check if a country is eligible for discount
 * @param {string} countryCode - 2-letter ISO country code
 * @returns {boolean}
 */
export function isDevelopingCountry(countryCode) {
  return countryCode && DEVELOPING_COUNTRIES.hasOwnProperty(countryCode.toUpperCase());
}

/**
 * Get discount percentage for a country
 * @param {string} countryCode - 2-letter ISO country code
 * @returns {number} Discount percentage (0-100)
 */
export function getDiscountPercentage(countryCode) {
  if (!countryCode) return 0;
  const country = DEVELOPING_COUNTRIES[countryCode.toUpperCase()];
  return country ? country.discount : 0;
}

/**
 * Get country name
 * @param {string} countryCode - 2-letter ISO country code
 * @returns {string|null} Country name
 */
export function getDevelopingCountryName(countryCode) {
  if (!countryCode) return null;
  const country = DEVELOPING_COUNTRIES[countryCode.toUpperCase()];
  return country ? country.name : null;
}