// Comprehensive currency mapping for all countries
// Data sources: CurrencyPreferenceScreen.js and countries.js

// Complete currency list with symbols
export const CURRENCIES = {
  // African Currencies
  SSP: { code: 'SSP', symbol: '£', name: 'South Sudan Pound' },
  KES: { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  NGN: { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  ZAR: { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  GHS: { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi' },
  UGX: { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling' },
  TZS: { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling' },
  RWF: { code: 'RWF', symbol: 'FRw', name: 'Rwandan Franc' },
  ETB: { code: 'ETB', symbol: 'Br', name: 'Ethiopian Birr' },
  EGP: { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound' },
  MAD: { code: 'MAD', symbol: 'د.م.', name: 'Moroccan Dirham' },
  DZD: { code: 'DZD', symbol: 'د.ج', name: 'Algerian Dinar' },
  TND: { code: 'TND', symbol: 'د.ت', name: 'Tunisian Dinar' },
  LYD: { code: 'LYD', symbol: 'ل.د', name: 'Libyan Dinar' },
  SDG: { code: 'SDG', symbol: 'SDG', name: 'Sudanese Pound' },
  AOA: { code: 'AOA', symbol: 'Kz', name: 'Angolan Kwanza' },
  BWP: { code: 'BWP', symbol: 'P', name: 'Botswanan Pula' },
  BIF: { code: 'BIF', symbol: 'FBu', name: 'Burundian Franc' },
  CVE: { code: 'CVE', symbol: '$', name: 'Cape Verdean Escudo' },
  XAF: { code: 'XAF', symbol: 'FCFA', name: 'Central African CFA Franc' },
  XOF: { code: 'XOF', symbol: 'CFA', name: 'West African CFA Franc' },
  KMF: { code: 'KMF', symbol: 'CF', name: 'Comorian Franc' },
  CDF: { code: 'CDF', symbol: 'FC', name: 'Congolese Franc' },
  DJF: { code: 'DJF', symbol: 'Fdj', name: 'Djiboutian Franc' },
  ERN: { code: 'ERN', symbol: 'Nfk', name: 'Eritrean Nakfa' },
  GMD: { code: 'GMD', symbol: 'D', name: 'Gambian Dalasi' },
  GNF: { code: 'GNF', symbol: 'FG', name: 'Guinean Franc' },
  LSL: { code: 'LSL', symbol: 'L', name: 'Lesotho Loti' },
  LRD: { code: 'LRD', symbol: 'L$', name: 'Liberian Dollar' },
  MGA: { code: 'MGA', symbol: 'Ar', name: 'Malagasy Ariary' },
  MWK: { code: 'MWK', symbol: 'MK', name: 'Malawian Kwacha' },
  MRU: { code: 'MRU', symbol: 'UM', name: 'Mauritanian Ouguiya' },
  MUR: { code: 'MUR', symbol: '₨', name: 'Mauritian Rupee' },
  MZN: { code: 'MZN', symbol: 'MT', name: 'Mozambican Metical' },
  NAD: { code: 'NAD', symbol: 'N$', name: 'Namibian Dollar' },
  SCR: { code: 'SCR', symbol: '₨', name: 'Seychellois Rupee' },
  SLL: { code: 'SLL', symbol: 'Le', name: 'Sierra Leonean Leone' },
  SOS: { code: 'SOS', symbol: 'S', name: 'Somali Shilling' },
  SZL: { code: 'SZL', symbol: 'E', name: 'Swazi Lilangeni' },
  ZMW: { code: 'ZMW', symbol: 'ZK', name: 'Zambian Kwacha' },
  ZWL: { code: 'ZWL', symbol: 'Z$', name: 'Zimbabwean Dollar' },
  
  // Major World Currencies
  USD: { code: 'USD', symbol: '$', name: 'US Dollar' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound' },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  CNY: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  CHF: { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  HKD: { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  
  // Middle Eastern Currencies
  AED: { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  SAR: { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  QAR: { code: 'QAR', symbol: '﷼', name: 'Qatari Riyal' },
  OMR: { code: 'OMR', symbol: '﷼', name: 'Omani Rial' },
  KWD: { code: 'KWD', symbol: 'د.ك', name: 'Kuwaiti Dinar' },
  BHD: { code: 'BHD', symbol: '.د.ب', name: 'Bahraini Dinar' },
  JOD: { code: 'JOD', symbol: 'د.ا', name: 'Jordanian Dinar' },
  IQD: { code: 'IQD', symbol: 'ع.د', name: 'Iraqi Dinar' },
  SYP: { code: 'SYP', symbol: '£', name: 'Syrian Pound' },
  LBP: { code: 'LBP', symbol: 'ل.ل', name: 'Lebanese Pound' },
  YER: { code: 'YER', symbol: '﷼', name: 'Yemeni Rial' },
  
  // Asian Currencies
  PKR: { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
  BDT: { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka' },
  LKR: { code: 'LKR', symbol: '₨', name: 'Sri Lankan Rupee' },
  NPR: { code: 'NPR', symbol: '₨', name: 'Nepalese Rupee' },
  AFN: { code: 'AFN', symbol: '؋', name: 'Afghan Afghani' },
  MMK: { code: 'MMK', symbol: 'Ks', name: 'Myanmar Kyat' },
  THB: { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  VND: { code: 'VND', symbol: '₫', name: 'Vietnamese Dong' },
  LAK: { code: 'LAK', symbol: '₭', name: 'Lao Kip' },
  KHR: { code: 'KHR', symbol: '៛', name: 'Cambodian Riel' },
  PHP: { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
  MYR: { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  IDR: { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
  BND: { code: 'BND', symbol: 'B$', name: 'Brunei Dollar' },
  
  // European Currencies (Non-Euro)
  SEK: { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  NOK: { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  DKK: { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
  ISK: { code: 'ISK', symbol: 'kr', name: 'Icelandic Króna' },
  PLN: { code: 'PLN', symbol: 'zł', name: 'Polish Złoty' },
  CZK: { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna' },
  HUF: { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint' },
  RON: { code: 'RON', symbol: 'lei', name: 'Romanian Leu' },
  BGN: { code: 'BGN', symbol: 'лв', name: 'Bulgarian Lev' },
  HRK: { code: 'HRK', symbol: 'kn', name: 'Croatian Kuna' },
  RSD: { code: 'RSD', symbol: 'Дин.', name: 'Serbian Dinar' },
  BAM: { code: 'BAM', symbol: 'KM', name: 'Bosnia Mark' },
  MKD: { code: 'MKD', symbol: 'ден', name: 'Macedonian Denar' },
  ALL: { code: 'ALL', symbol: 'L', name: 'Albanian Lek' },
  MDL: { code: 'MDL', symbol: 'L', name: 'Moldovan Leu' },
  UAH: { code: 'UAH', symbol: '₴', name: 'Ukrainian Hryvnia' },
  BYN: { code: 'BYN', symbol: 'Br', name: 'Belarusian Ruble' },
  RUB: { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
  GEL: { code: 'GEL', symbol: '₾', name: 'Georgian Lari' },
  AMD: { code: 'AMD', symbol: '֏', name: 'Armenian Dram' },
  AZN: { code: 'AZN', symbol: '₼', name: 'Azerbaijani Manat' },
  KZT: { code: 'KZT', symbol: '₸', name: 'Kazakhstani Tenge' },
  KGS: { code: 'KGS', symbol: 'лв', name: 'Kyrgystani Som' },
  UZS: { code: 'UZS', symbol: 'лв', name: 'Uzbekistan Som' },
  TJS: { code: 'TJS', symbol: 'SM', name: 'Tajikistani Somoni' },
  TMT: { code: 'TMT', symbol: 'T', name: 'Turkmenistan Manat' },
  
  // American Currencies
  BRL: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  MXN: { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
  ARS: { code: 'ARS', symbol: '$', name: 'Argentine Peso' },
  CLP: { code: 'CLP', symbol: '$', name: 'Chilean Peso' },
  COP: { code: 'COP', symbol: '$', name: 'Colombian Peso' },
  PEN: { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol' },
  UYU: { code: 'UYU', symbol: '$U', name: 'Uruguayan Peso' },
  PYG: { code: 'PYG', symbol: 'Gs', name: 'Paraguayan Guarani' },
  BOB: { code: 'BOB', symbol: 'Bs.', name: 'Bolivian Boliviano' },
  VES: { code: 'VES', symbol: 'Bs', name: 'Venezuelan Bolívar' },
  GTQ: { code: 'GTQ', symbol: 'Q', name: 'Guatemalan Quetzal' },
  HNL: { code: 'HNL', symbol: 'L', name: 'Honduran Lempira' },
  NIO: { code: 'NIO', symbol: 'C$', name: 'Nicaraguan Córdoba' },
  CRC: { code: 'CRC', symbol: '₡', name: 'Costa Rican Colón' },
  PAB: { code: 'PAB', symbol: 'B/.', name: 'Panamanian Balboa' },
  DOP: { code: 'DOP', symbol: 'RD$', name: 'Dominican Peso' },
  CUP: { code: 'CUP', symbol: '₱', name: 'Cuban Peso' },
  JMD: { code: 'JMD', symbol: 'J$', name: 'Jamaican Dollar' },
  HTG: { code: 'HTG', symbol: 'G', name: 'Haitian Gourde' },
  TTD: { code: 'TTD', symbol: 'TT$', name: 'Trinidad and Tobago Dollar' },
  BBD: { code: 'BBD', symbol: 'Bds$', name: 'Barbadian Dollar' },
  BSD: { code: 'BSD', symbol: 'B$', name: 'Bahamian Dollar' },
  BZD: { code: 'BZD', symbol: 'BZ$', name: 'Belize Dollar' },
  
  // Pacific Currencies
  NZD: { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  FJD: { code: 'FJD', symbol: 'FJ$', name: 'Fijian Dollar' },
  PGK: { code: 'PGK', symbol: 'K', name: 'Papua New Guinean Kina' },
  SBD: { code: 'SBD', symbol: 'SI$', name: 'Solomon Islands Dollar' },
  TOP: { code: 'TOP', symbol: 'T$', name: 'Tongan Paʻanga' },
  VUV: { code: 'VUV', symbol: 'Vt', name: 'Vanuatu Vatu' },
  WST: { code: 'WST', symbol: 'WS$', name: 'Samoan Tala' },
};

// Country to currency mapping
export const COUNTRY_CURRENCY_MAP = {
  // Africa
  'SS': 'SSP', // South Sudan
  'KE': 'KES', // Kenya
  'UG': 'UGX', // Uganda
  'TZ': 'TZS', // Tanzania
  'RW': 'RWF', // Rwanda
  'BI': 'BIF', // Burundi
  'ET': 'ETB', // Ethiopia
  'ER': 'ERN', // Eritrea
  'DJ': 'DJF', // Djibouti
  'SO': 'SOS', // Somalia
  'SD': 'SDG', // Sudan
  'EG': 'EGP', // Egypt
  'LY': 'LYD', // Libya
  'TN': 'TND', // Tunisia
  'DZ': 'DZD', // Algeria
  'MA': 'MAD', // Morocco
  'MR': 'MRU', // Mauritania
  'ML': 'XOF', // Mali (West African CFA)
  'SN': 'XOF', // Senegal (West African CFA)
  'GM': 'GMD', // Gambia
  'GW': 'XOF', // Guinea-Bissau (West African CFA)
  'GN': 'GNF', // Guinea
  'SL': 'SLL', // Sierra Leone
  'LR': 'LRD', // Liberia
  'CI': 'XOF', // Ivory Coast (West African CFA)
  'BF': 'XOF', // Burkina Faso (West African CFA)
  'GH': 'GHS', // Ghana
  'TG': 'XOF', // Togo (West African CFA)
  'BJ': 'XOF', // Benin (West African CFA)
  'NE': 'XOF', // Niger (West African CFA)
  'NG': 'NGN', // Nigeria
  'CM': 'XAF', // Cameroon (Central African CFA)
  'CF': 'XAF', // Central African Republic (Central African CFA)
  'TD': 'XAF', // Chad (Central African CFA)
  'CG': 'XAF', // Congo (Central African CFA)
  'CD': 'CDF', // Congo (DRC)
  'GA': 'XAF', // Gabon (Central African CFA)
  'GQ': 'XAF', // Equatorial Guinea (Central African CFA)
  'AO': 'AOA', // Angola
  'ZM': 'ZMW', // Zambia
  'ZW': 'ZWL', // Zimbabwe
  'MW': 'MWK', // Malawi
  'MZ': 'MZN', // Mozambique
  'BW': 'BWP', // Botswana
  'NA': 'NAD', // Namibia
  'ZA': 'ZAR', // South Africa
  'LS': 'LSL', // Lesotho
  'SZ': 'SZL', // Swaziland
  'MG': 'MGA', // Madagascar
  'MU': 'MUR', // Mauritius
  'SC': 'SCR', // Seychelles
  'KM': 'KMF', // Comoros
  'CV': 'CVE', // Cape Verde
  
  // Middle East
  'AE': 'AED', // UAE
  'SA': 'SAR', // Saudi Arabia
  'QA': 'QAR', // Qatar
  'OM': 'OMR', // Oman
  'KW': 'KWD', // Kuwait
  'BH': 'BHD', // Bahrain
  'JO': 'JOD', // Jordan
  'IQ': 'IQD', // Iraq
  'SY': 'SYP', // Syria
  'LB': 'LBP', // Lebanon
  'YE': 'YER', // Yemen
  'IL': 'ILS', // Israel
  'PS': 'ILS', // Palestine (uses Israeli Shekel)
  'IR': 'IRR', // Iran
  'TR': 'TRY', // Turkey
  
  // Asia
  'IN': 'INR', // India
  'PK': 'PKR', // Pakistan
  'BD': 'BDT', // Bangladesh
  'LK': 'LKR', // Sri Lanka
  'NP': 'NPR', // Nepal
  'BT': 'BTN', // Bhutan
  'AF': 'AFN', // Afghanistan
  'MM': 'MMK', // Myanmar
  'TH': 'THB', // Thailand
  'VN': 'VND', // Vietnam
  'LA': 'LAK', // Laos
  'KH': 'KHR', // Cambodia
  'MY': 'MYR', // Malaysia
  'SG': 'SGD', // Singapore
  'ID': 'IDR', // Indonesia
  'PH': 'PHP', // Philippines
  'BN': 'BND', // Brunei
  'TL': 'USD', // East Timor (uses USD)
  'CN': 'CNY', // China
  'HK': 'HKD', // Hong Kong
  'MO': 'MOP', // Macau
  'TW': 'TWD', // Taiwan
  'JP': 'JPY', // Japan
  'KR': 'KRW', // South Korea
  'KP': 'KPW', // North Korea
  'MN': 'MNT', // Mongolia
  
  // Europe
  'GB': 'GBP', // United Kingdom
  'IE': 'EUR', // Ireland
  'FR': 'EUR', // France
  'DE': 'EUR', // Germany
  'IT': 'EUR', // Italy
  'ES': 'EUR', // Spain
  'PT': 'EUR', // Portugal
  'NL': 'EUR', // Netherlands
  'BE': 'EUR', // Belgium
  'LU': 'EUR', // Luxembourg
  'AT': 'EUR', // Austria
  'CH': 'CHF', // Switzerland
  'SE': 'SEK', // Sweden
  'NO': 'NOK', // Norway
  'DK': 'DKK', // Denmark
  'FI': 'EUR', // Finland
  'IS': 'ISK', // Iceland
  'PL': 'PLN', // Poland
  'CZ': 'CZK', // Czech Republic
  'SK': 'EUR', // Slovakia
  'HU': 'HUF', // Hungary
  'RO': 'RON', // Romania
  'BG': 'BGN', // Bulgaria
  'HR': 'HRK', // Croatia
  'SI': 'EUR', // Slovenia
  'RS': 'RSD', // Serbia
  'BA': 'BAM', // Bosnia
  'ME': 'EUR', // Montenegro
  'MK': 'MKD', // Macedonia
  'AL': 'ALL', // Albania
  'GR': 'EUR', // Greece
  'CY': 'EUR', // Cyprus
  'MT': 'EUR', // Malta
  'MD': 'MDL', // Moldova
  'UA': 'UAH', // Ukraine
  'BY': 'BYN', // Belarus
  'RU': 'RUB', // Russia
  'EE': 'EUR', // Estonia
  'LV': 'EUR', // Latvia
  'LT': 'EUR', // Lithuania
  'GE': 'GEL', // Georgia
  'AM': 'AMD', // Armenia
  'AZ': 'AZN', // Azerbaijan
  
  // Americas
  'US': 'USD', // United States
  'CA': 'CAD', // Canada
  'MX': 'MXN', // Mexico
  'BR': 'BRL', // Brazil
  'AR': 'ARS', // Argentina
  'CL': 'CLP', // Chile
  'CO': 'COP', // Colombia
  'PE': 'PEN', // Peru
  'VE': 'VES', // Venezuela
  'EC': 'USD', // Ecuador (uses USD)
  'BO': 'BOB', // Bolivia
  'PY': 'PYG', // Paraguay
  'UY': 'UYU', // Uruguay
  'GY': 'GYD', // Guyana
  'SR': 'SRD', // Suriname
  'GT': 'GTQ', // Guatemala
  'HN': 'HNL', // Honduras
  'SV': 'USD', // El Salvador (uses USD)
  'NI': 'NIO', // Nicaragua
  'CR': 'CRC', // Costa Rica
  'PA': 'PAB', // Panama
  'CU': 'CUP', // Cuba
  'DO': 'DOP', // Dominican Republic
  'HT': 'HTG', // Haiti
  'JM': 'JMD', // Jamaica
  'TT': 'TTD', // Trinidad and Tobago
  'BB': 'BBD', // Barbados
  'BS': 'BSD', // Bahamas
  'BZ': 'BZD', // Belize
  
  // Oceania
  'AU': 'AUD', // Australia
  'NZ': 'NZD', // New Zealand
  'FJ': 'FJD', // Fiji
  'PG': 'PGK', // Papua New Guinea
  'SB': 'SBD', // Solomon Islands
  'VU': 'VUV', // Vanuatu
  'TO': 'TOP', // Tonga
  'WS': 'WST', // Samoa
  'KI': 'AUD', // Kiribati (uses AUD)
  'TV': 'AUD', // Tuvalu (uses AUD)
  'NR': 'AUD', // Nauru (uses AUD)
  'PW': 'USD', // Palau (uses USD)
  'FM': 'USD', // Micronesia (uses USD)
  'MH': 'USD', // Marshall Islands (uses USD)
  
  // Default
  'DEFAULT': 'USD',
};

// Helper function to get currency for a country
export function getCurrencyForCountry(countryCode) {
  if (!countryCode) return CURRENCIES.USD;
  
  const code = countryCode.toUpperCase();
  const currencyCode = COUNTRY_CURRENCY_MAP[code] || COUNTRY_CURRENCY_MAP.DEFAULT;
  return CURRENCIES[currencyCode] || CURRENCIES.USD;
}

// Helper function to format price with currency
export function formatPrice(amount, countryCode, decimals = 0) {
  const currency = getCurrencyForCountry(countryCode);
  return `${currency.symbol}${amount.toFixed(decimals)}`;
}

// Export default for easy imports
export default {
  CURRENCIES,
  COUNTRY_CURRENCY_MAP,
  getCurrencyForCountry,
  formatPrice,
};