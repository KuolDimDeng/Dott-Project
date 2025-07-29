/**
 * Currency formatting utilities for frontend
 */

// Currency data matching backend currency_data.py
const CURRENCY_DATA = {
  // Major Currencies
  'USD': { name: 'US Dollar', symbol: '$', decimal_places: 2, symbol_position: 'before' },
  'EUR': { name: 'Euro', symbol: '€', decimal_places: 2, symbol_position: 'before' },
  'GBP': { name: 'British Pound', symbol: '£', decimal_places: 2, symbol_position: 'before' },
  'JPY': { name: 'Japanese Yen', symbol: '¥', decimal_places: 0, symbol_position: 'before' },
  'CHF': { name: 'Swiss Franc', symbol: 'CHF', decimal_places: 2, symbol_position: 'before' },
  'CAD': { name: 'Canadian Dollar', symbol: 'C$', decimal_places: 2, symbol_position: 'before' },
  'AUD': { name: 'Australian Dollar', symbol: 'A$', decimal_places: 2, symbol_position: 'before' },
  'NZD': { name: 'New Zealand Dollar', symbol: 'NZ$', decimal_places: 2, symbol_position: 'before' },
  
  // African Currencies
  'ZAR': { name: 'South African Rand', symbol: 'R', decimal_places: 2, symbol_position: 'before' },
  'NGN': { name: 'Nigerian Naira', symbol: '₦', decimal_places: 2, symbol_position: 'before' },
  'KES': { name: 'Kenyan Shilling', symbol: 'KSh', decimal_places: 2, symbol_position: 'before' },
  'GHS': { name: 'Ghanaian Cedi', symbol: '₵', decimal_places: 2, symbol_position: 'before' },
  'EGP': { name: 'Egyptian Pound', symbol: 'E£', decimal_places: 2, symbol_position: 'before' },
  'MAD': { name: 'Moroccan Dirham', symbol: 'MAD', decimal_places: 2, symbol_position: 'after' },
  'TND': { name: 'Tunisian Dinar', symbol: 'TND', decimal_places: 3, symbol_position: 'after' },
  'DZD': { name: 'Algerian Dinar', symbol: 'DA', decimal_places: 2, symbol_position: 'after' },
  'ETB': { name: 'Ethiopian Birr', symbol: 'Br', decimal_places: 2, symbol_position: 'before' },
  'UGX': { name: 'Ugandan Shilling', symbol: 'USh', decimal_places: 0, symbol_position: 'before' },
  'TZS': { name: 'Tanzanian Shilling', symbol: 'TSh', decimal_places: 0, symbol_position: 'before' },
  'ZWL': { name: 'Zimbabwean Dollar', symbol: 'Z$', decimal_places: 2, symbol_position: 'before' },
  'ZMW': { name: 'Zambian Kwacha', symbol: 'ZK', decimal_places: 2, symbol_position: 'before' },
  'BWP': { name: 'Botswana Pula', symbol: 'P', decimal_places: 2, symbol_position: 'before' },
  'MWK': { name: 'Malawian Kwacha', symbol: 'MK', decimal_places: 2, symbol_position: 'before' },
  'MZN': { name: 'Mozambican Metical', symbol: 'MT', decimal_places: 2, symbol_position: 'before' },
  'AOA': { name: 'Angolan Kwanza', symbol: 'Kz', decimal_places: 2, symbol_position: 'before' },
  'XAF': { name: 'Central African CFA Franc', symbol: 'FCFA', decimal_places: 0, symbol_position: 'after' },
  'XOF': { name: 'West African CFA Franc', symbol: 'CFA', decimal_places: 0, symbol_position: 'after' },
  'RWF': { name: 'Rwandan Franc', symbol: 'FRw', decimal_places: 0, symbol_position: 'before' },
  
  // Asian Currencies
  'CNY': { name: 'Chinese Yuan', symbol: '¥', decimal_places: 2, symbol_position: 'before' },
  'INR': { name: 'Indian Rupee', symbol: '₹', decimal_places: 2, symbol_position: 'before' },
  'KRW': { name: 'South Korean Won', symbol: '₩', decimal_places: 0, symbol_position: 'before' },
  'SGD': { name: 'Singapore Dollar', symbol: 'S$', decimal_places: 2, symbol_position: 'before' },
  'HKD': { name: 'Hong Kong Dollar', symbol: 'HK$', decimal_places: 2, symbol_position: 'before' },
  'THB': { name: 'Thai Baht', symbol: '฿', decimal_places: 2, symbol_position: 'before' },
  'MYR': { name: 'Malaysian Ringgit', symbol: 'RM', decimal_places: 2, symbol_position: 'before' },
  'IDR': { name: 'Indonesian Rupiah', symbol: 'Rp', decimal_places: 0, symbol_position: 'before' },
  'PHP': { name: 'Philippine Peso', symbol: '₱', decimal_places: 2, symbol_position: 'before' },
  'VND': { name: 'Vietnamese Dong', symbol: '₫', decimal_places: 0, symbol_position: 'after' },
  'BDT': { name: 'Bangladeshi Taka', symbol: '৳', decimal_places: 2, symbol_position: 'before' },
  'PKR': { name: 'Pakistani Rupee', symbol: '₨', decimal_places: 0, symbol_position: 'before' },
  'LKR': { name: 'Sri Lankan Rupee', symbol: 'Rs', decimal_places: 2, symbol_position: 'before' },
  
  // Middle Eastern Currencies
  'AED': { name: 'UAE Dirham', symbol: 'د.إ', decimal_places: 2, symbol_position: 'after' },
  'SAR': { name: 'Saudi Riyal', symbol: '﷼', decimal_places: 2, symbol_position: 'after' },
  'QAR': { name: 'Qatari Riyal', symbol: '﷼', decimal_places: 2, symbol_position: 'after' },
  'KWD': { name: 'Kuwaiti Dinar', symbol: 'KD', decimal_places: 3, symbol_position: 'after' },
  'BHD': { name: 'Bahraini Dinar', symbol: 'BD', decimal_places: 3, symbol_position: 'after' },
  'OMR': { name: 'Omani Rial', symbol: '﷼', decimal_places: 3, symbol_position: 'after' },
  'JOD': { name: 'Jordanian Dinar', symbol: 'JD', decimal_places: 3, symbol_position: 'after' },
  'ILS': { name: 'Israeli New Shekel', symbol: '₪', decimal_places: 2, symbol_position: 'before' },
  'TRY': { name: 'Turkish Lira', symbol: '₺', decimal_places: 2, symbol_position: 'before' },
  'LBP': { name: 'Lebanese Pound', symbol: 'LL', decimal_places: 0, symbol_position: 'after' },
  
  // European Currencies (Non-Euro)
  'SEK': { name: 'Swedish Krona', symbol: 'kr', decimal_places: 2, symbol_position: 'after' },
  'NOK': { name: 'Norwegian Krone', symbol: 'kr', decimal_places: 2, symbol_position: 'after' },
  'DKK': { name: 'Danish Krone', symbol: 'kr', decimal_places: 2, symbol_position: 'after' },
  'PLN': { name: 'Polish Złoty', symbol: 'zł', decimal_places: 2, symbol_position: 'after' },
  'CZK': { name: 'Czech Koruna', symbol: 'Kč', decimal_places: 2, symbol_position: 'after' },
  'HUF': { name: 'Hungarian Forint', symbol: 'Ft', decimal_places: 0, symbol_position: 'after' },
  'RON': { name: 'Romanian Leu', symbol: 'lei', decimal_places: 2, symbol_position: 'after' },
  'BGN': { name: 'Bulgarian Lev', symbol: 'лв', decimal_places: 2, symbol_position: 'after' },
  'HRK': { name: 'Croatian Kuna', symbol: 'kn', decimal_places: 2, symbol_position: 'after' },
  'RSD': { name: 'Serbian Dinar', symbol: 'дин', decimal_places: 0, symbol_position: 'after' },
  'UAH': { name: 'Ukrainian Hryvnia', symbol: '₴', decimal_places: 2, symbol_position: 'before' },
  'RUB': { name: 'Russian Ruble', symbol: '₽', decimal_places: 2, symbol_position: 'after' },
  
  // Latin American Currencies
  'BRL': { name: 'Brazilian Real', symbol: 'R$', decimal_places: 2, symbol_position: 'before' },
  'MXN': { name: 'Mexican Peso', symbol: '$', decimal_places: 2, symbol_position: 'before' },
  'ARS': { name: 'Argentine Peso', symbol: '$', decimal_places: 2, symbol_position: 'before' },
  'COP': { name: 'Colombian Peso', symbol: '$', decimal_places: 0, symbol_position: 'before' },
  'PEN': { name: 'Peruvian Sol', symbol: 'S/', decimal_places: 2, symbol_position: 'before' },
  'CLP': { name: 'Chilean Peso', symbol: '$', decimal_places: 0, symbol_position: 'before' },
  'VES': { name: 'Venezuelan Bolívar', symbol: 'Bs.', decimal_places: 2, symbol_position: 'before' },
  'BOB': { name: 'Bolivian Boliviano', symbol: 'Bs.', decimal_places: 2, symbol_position: 'before' },
  'PYG': { name: 'Paraguayan Guaraní', symbol: '₲', decimal_places: 0, symbol_position: 'before' },
  'UYU': { name: 'Uruguayan Peso', symbol: '$U', decimal_places: 2, symbol_position: 'before' },
  'CRC': { name: 'Costa Rican Colón', symbol: '₡', decimal_places: 0, symbol_position: 'before' },
  'GTQ': { name: 'Guatemalan Quetzal', symbol: 'Q', decimal_places: 2, symbol_position: 'before' },
  'HNL': { name: 'Honduran Lempira', symbol: 'L', decimal_places: 2, symbol_position: 'before' },
  'NIO': { name: 'Nicaraguan Córdoba', symbol: 'C$', decimal_places: 2, symbol_position: 'before' },
  'DOP': { name: 'Dominican Peso', symbol: 'RD$', decimal_places: 2, symbol_position: 'before' },
  'JMD': { name: 'Jamaican Dollar', symbol: 'J$', decimal_places: 2, symbol_position: 'before' },
  'TTD': { name: 'Trinidad and Tobago Dollar', symbol: 'TT$', decimal_places: 2, symbol_position: 'before' },
  'BSD': { name: 'Bahamian Dollar', symbol: 'B$', decimal_places: 2, symbol_position: 'before' },
  'BBD': { name: 'Barbadian Dollar', symbol: 'Bds$', decimal_places: 2, symbol_position: 'before' },
  'BZD': { name: 'Belize Dollar', symbol: 'BZ$', decimal_places: 2, symbol_position: 'before' },
  
  // Add more currencies as needed...
};

/**
 * Get currency information
 */
export function getCurrencyInfo(currencyCode) {
  return CURRENCY_DATA[currencyCode?.toUpperCase()] || {
    name: currencyCode,
    symbol: currencyCode,
    decimal_places: 2,
    symbol_position: 'before'
  };
}

/**
 * Format amount in specified currency
 */
export function formatCurrency(amount, currencyCode, options = {}) {
  const {
    includeCode = false,
    showUsdEquivalent = false,
    usdAmount = null,
    locale = 'en-US'
  } = options;

  if (amount === null || amount === undefined) {
    return '';
  }

  const currencyInfo = getCurrencyInfo(currencyCode);
  
  // Use Intl.NumberFormat for proper localization
  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: currencyInfo.decimal_places,
      maximumFractionDigits: currencyInfo.decimal_places,
    });
    
    let formatted = formatter.format(amount);
    
    // Add USD equivalent if requested
    if (showUsdEquivalent && usdAmount !== null && currencyCode !== 'USD') {
      const usdFormatter = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      formatted += ` (${usdFormatter.format(usdAmount)})`;
    }
    
    return formatted;
  } catch (error) {
    // Fallback for unsupported currencies
    const numAmount = parseFloat(amount);
    const formattedAmount = numAmount.toLocaleString(locale, {
      minimumFractionDigits: currencyInfo.decimal_places,
      maximumFractionDigits: currencyInfo.decimal_places,
    });
    
    let result;
    if (currencyInfo.symbol_position === 'before') {
      result = `${currencyInfo.symbol}${formattedAmount}`;
    } else {
      result = `${formattedAmount} ${currencyInfo.symbol}`;
    }
    
    if (includeCode && currencyInfo.symbol !== currencyCode) {
      result += ` ${currencyCode}`;
    }
    
    // Add USD equivalent if requested
    if (showUsdEquivalent && usdAmount !== null && currencyCode !== 'USD') {
      const usdFormatted = formatCurrency(usdAmount, 'USD', { locale });
      result += ` (${usdFormatted})`;
    }
    
    return result;
  }
}

/**
 * Format currency with business preferences
 */
export function formatCurrencyWithPreferences(amount, preferences, options = {}) {
  if (!preferences) {
    return formatCurrency(amount, 'USD', options);
  }

  const {
    currency_code,
    show_usd_on_invoices,
    show_usd_on_quotes,
    show_usd_on_reports
  } = preferences;

  const context = options.context || 'general'; // 'invoice', 'quote', 'report', 'general'
  
  let showUsd = false;
  if (context === 'invoice' && show_usd_on_invoices) showUsd = true;
  if (context === 'quote' && show_usd_on_quotes) showUsd = true;
  if (context === 'report' && show_usd_on_reports) showUsd = true;

  return formatCurrency(amount, currency_code, {
    ...options,
    showUsdEquivalent: showUsd && currency_code !== 'USD',
  });
}

/**
 * Get all currencies for dropdown
 */
export function getAllCurrencies() {
  return Object.entries(CURRENCY_DATA).map(([code, data]) => ({
    code,
    name: data.name,
    display: `${data.name} (${code})`,
    symbol: data.symbol
  })).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Parse currency amount from string
 */
export function parseCurrencyAmount(value, currencyCode) {
  if (!value) return 0;
  
  // Remove currency symbols and non-numeric characters except . and -
  const cleanValue = value.toString()
    .replace(/[^\d.-]/g, '')
    .replace(/,/g, '');
  
  return parseFloat(cleanValue) || 0;
}