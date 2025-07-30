import { NextResponse } from 'next/server';

export const revalidate = 3600; // Revalidate every hour

// Country to currency mapping for pricing display
const countryCurrencyMap = {
  'KE': 'KES', // Kenya Shilling
  'NG': 'NGN', // Nigerian Naira
  'ZA': 'ZAR', // South African Rand
  'GH': 'GHS', // Ghanaian Cedi
  'UG': 'UGX', // Ugandan Shilling
  'TZ': 'TZS', // Tanzanian Shilling
  'EG': 'EGP', // Egyptian Pound
  'MA': 'MAD', // Moroccan Dirham
  'IN': 'INR', // Indian Rupee
  'BR': 'BRL', // Brazilian Real
  'MX': 'MXN', // Mexican Peso
  'AR': 'ARS', // Argentine Peso
  'CO': 'COP', // Colombian Peso
  'PE': 'PEN', // Peruvian Sol
  'CL': 'CLP', // Chilean Peso
  'PH': 'PHP', // Philippine Peso
  'ID': 'IDR', // Indonesian Rupiah
  'VN': 'VND', // Vietnamese Dong
  'TH': 'THB', // Thai Baht
  'MY': 'MYR', // Malaysian Ringgit
  'GB': 'GBP', // British Pound
  'EU': 'EUR', // Euro (for EU countries)
  'FR': 'EUR', // France - Euro
  'DE': 'EUR', // Germany - Euro
  'ES': 'EUR', // Spain - Euro
  'IT': 'EUR', // Italy - Euro
  'NL': 'EUR', // Netherlands - Euro
  'JP': 'JPY', // Japanese Yen
  'CN': 'CNY', // Chinese Yuan
  'KR': 'KRW', // South Korean Won
  'AU': 'AUD', // Australian Dollar
  'CA': 'CAD', // Canadian Dollar
  'NZ': 'NZD', // New Zealand Dollar
  'CH': 'CHF', // Swiss Franc
  'SE': 'SEK', // Swedish Krona
  'NO': 'NOK', // Norwegian Krone
  'DK': 'DKK', // Danish Krone
  'SG': 'SGD', // Singapore Dollar
  'HK': 'HKD', // Hong Kong Dollar
  'TR': 'TRY', // Turkish Lira
  'RU': 'RUB', // Russian Ruble
  'PL': 'PLN', // Polish Zloty
  'AE': 'AED', // UAE Dirham
  'SA': 'SAR', // Saudi Riyal
  // Additional developing countries
  'ET': 'ETB', // Ethiopian Birr
  'RW': 'RWF', // Rwandan Franc
  'ZM': 'ZMW', // Zambian Kwacha
  'ZW': 'ZWL', // Zimbabwean Dollar
  'MW': 'MWK', // Malawian Kwacha
  'MZ': 'MZN', // Mozambican Metical
  'BW': 'BWP', // Botswana Pula
  'NA': 'NAD', // Namibian Dollar
  'SN': 'XOF', // Senegal - West African CFA Franc
  'CI': 'XOF', // Côte d'Ivoire - West African CFA Franc
  'CM': 'XAF', // Cameroon - Central African CFA Franc
  'AO': 'AOA', // Angolan Kwanza
  'GA': 'XAF', // Gabon - Central African CFA Franc
  'CG': 'XAF', // Congo - Central African CFA Franc
  'CD': 'CDF', // Democratic Republic of Congo - Congolese Franc
  'SD': 'SDG', // Sudanese Pound
  'TN': 'TND', // Tunisian Dinar
  'DZ': 'DZD', // Algerian Dinar
  'LY': 'LYD', // Libyan Dinar
  'BD': 'BDT', // Bangladeshi Taka
  'PK': 'PKR', // Pakistani Rupee
  'MM': 'MMK', // Myanmar Kyat
  'KH': 'KHR', // Cambodian Riel
  'LA': 'LAK', // Lao Kip
  'NP': 'NPR', // Nepalese Rupee
  'LK': 'LKR', // Sri Lankan Rupee
  'AF': 'AFN', // Afghan Afghani
  'VE': 'VES', // Venezuelan Bolívar
  'EC': 'USD', // Ecuador uses USD
  'BO': 'BOB', // Bolivian Boliviano
  'PY': 'PYG', // Paraguayan Guaraní
  'UY': 'UYU', // Uruguayan Peso
  'GT': 'GTQ', // Guatemalan Quetzal
  'HN': 'HNL', // Honduran Lempira
  'SV': 'USD', // El Salvador uses USD
  'NI': 'NIO', // Nicaraguan Córdoba
  'CR': 'CRC', // Costa Rican Colón
  'PA': 'PAB', // Panamanian Balboa (pegged to USD)
  'DO': 'DOP', // Dominican Peso
  'HT': 'HTG', // Haitian Gourde
  'JM': 'JMD', // Jamaican Dollar
  'IQ': 'IQD', // Iraqi Dinar
  'YE': 'YER', // Yemeni Rial
  'SY': 'SYP', // Syrian Pound
  'JO': 'JOD', // Jordanian Dinar
  'LB': 'LBP', // Lebanese Pound
  'PS': 'ILS', // Palestine uses Israeli Shekel
  'UA': 'UAH', // Ukrainian Hryvnia
  'MD': 'MDL', // Moldovan Leu
  'AL': 'ALL', // Albanian Lek
  'BA': 'BAM', // Bosnia and Herzegovina Convertible Mark
  'RS': 'RSD', // Serbian Dinar
  'ME': 'EUR', // Montenegro uses Euro
  'MK': 'MKD', // Macedonian Denar
  'XK': 'EUR', // Kosovo uses Euro
  'PG': 'PGK', // Papua New Guinea Kina
  'FJ': 'FJD', // Fijian Dollar
  'WS': 'WST', // Samoan Tala
  'TO': 'TOP', // Tongan Pa'anga
  'VU': 'VUV', // Vanuatu Vatu
  'SB': 'SBD', // Solomon Islands Dollar
  // Additional currency mappings
  'SS': 'SSP', // South Sudan Pound
  'BJ': 'XOF', // Benin - West African CFA Franc
  'BF': 'XOF', // Burkina Faso - West African CFA Franc
  'BI': 'BIF', // Burundi Franc
  'CV': 'CVE', // Cape Verde Escudo
  'CF': 'XAF', // Central African Republic - CFA Franc
  'TD': 'XAF', // Chad - CFA Franc
  'KM': 'KMF', // Comoros Franc
  'DJ': 'DJF', // Djibouti Franc
  'GQ': 'XAF', // Equatorial Guinea - CFA Franc
  'ER': 'ERN', // Eritrea Nakfa
  'GM': 'GMD', // Gambia Dalasi
  'GN': 'GNF', // Guinea Franc
  'GW': 'XOF', // Guinea-Bissau - CFA Franc
  'LS': 'LSL', // Lesotho Loti (also accepts ZAR)
  'LR': 'LRD', // Liberia Dollar
  'MG': 'MGA', // Madagascar Ariary
  'ML': 'XOF', // Mali - West African CFA Franc
  'MR': 'MRU', // Mauritania Ouguiya
  'NE': 'XOF', // Niger - West African CFA Franc
  'ST': 'STN', // São Tomé and Príncipe Dobra
  'SL': 'SLL', // Sierra Leone Leone
  'SO': 'SOS', // Somalia Shilling
  'SZ': 'SZL', // Eswatini Lilangeni (also accepts ZAR)
  'TG': 'XOF', // Togo - West African CFA Franc
  'AM': 'AMD', // Armenian Dram
  'AZ': 'AZN', // Azerbaijani Manat
  'BT': 'BTN', // Bhutanese Ngultrum
  'GE': 'GEL', // Georgian Lari
  'IR': 'IRR', // Iranian Rial
  'KZ': 'KZT', // Kazakhstani Tenge
  'KG': 'KGS', // Kyrgyzstani Som
  'MV': 'MVR', // Maldivian Rufiyaa
  'MN': 'MNT', // Mongolian Tugrik
  'TJ': 'TJS', // Tajikistani Somoni
  'TL': 'USD', // Timor-Leste uses USD
  'TM': 'TMT', // Turkmenistan Manat
  'UZ': 'UZS', // Uzbekistani Som
  'BZ': 'BZD', // Belize Dollar
  'CU': 'CUP', // Cuban Peso
  'GY': 'GYD', // Guyanese Dollar
  'SR': 'SRD', // Surinamese Dollar
  'BY': 'BYN', // Belarusian Ruble
  'KI': 'AUD', // Kiribati uses Australian Dollar
  'FM': 'USD', // Micronesia uses USD
  'TV': 'AUD', // Tuvalu uses Australian Dollar
};

// Currency formatting preferences
const currencyFormats = {
  'KES': { symbol: 'KSh', decimals: 0 }, // Kenya doesn't use decimals
  'NGN': { symbol: '₦', decimals: 0 },
  'ZAR': { symbol: 'R', decimals: 2 },
  'GHS': { symbol: 'GH₵', decimals: 2 },
  'UGX': { symbol: 'USh', decimals: 0 },
  'TZS': { symbol: 'TSh', decimals: 0 },
  'INR': { symbol: '₹', decimals: 0 },
  'JPY': { symbol: '¥', decimals: 0 },
  'KRW': { symbol: '₩', decimals: 0 },
  'IDR': { symbol: 'Rp', decimals: 0 },
  'VND': { symbol: '₫', decimals: 0 },
  // Additional currency formats
  'BRL': { symbol: 'R$', decimals: 2 },
  'MXN': { symbol: '$', decimals: 2 },
  'ARS': { symbol: '$', decimals: 2 },
  'COP': { symbol: '$', decimals: 0 },
  'PEN': { symbol: 'S/', decimals: 2 },
  'CLP': { symbol: '$', decimals: 0 },
  'PHP': { symbol: '₱', decimals: 2 },
  'THB': { symbol: '฿', decimals: 2 },
  'MYR': { symbol: 'RM', decimals: 2 },
  'EGP': { symbol: 'E£', decimals: 2 },
  'MAD': { symbol: 'DH', decimals: 2 },
  'TRY': { symbol: '₺', decimals: 2 },
  'PKR': { symbol: '₨', decimals: 0 },
  'BDT': { symbol: '৳', decimals: 2 },
  'LKR': { symbol: 'Rs', decimals: 2 },
  'NPR': { symbol: '₨', decimals: 2 },
  'MMK': { symbol: 'K', decimals: 0 },
  'KHR': { symbol: '៛', decimals: 0 },
  'LAK': { symbol: '₭', decimals: 0 },
  'AFN': { symbol: '؋', decimals: 2 },
  'ETB': { symbol: 'Br', decimals: 2 },
  'RWF': { symbol: 'FRw', decimals: 0 },
  'ZMW': { symbol: 'K', decimals: 2 },
  'ZWL': { symbol: '$', decimals: 2 },
  'MWK': { symbol: 'MK', decimals: 2 },
  'MZN': { symbol: 'MT', decimals: 2 },
  'BWP': { symbol: 'P', decimals: 2 },
  'NAD': { symbol: '$', decimals: 2 },
  'XOF': { symbol: 'CFA', decimals: 0 },
  'XAF': { symbol: 'FCFA', decimals: 0 },
  'AOA': { symbol: 'Kz', decimals: 2 },
  'CDF': { symbol: 'FC', decimals: 2 },
  'SDG': { symbol: 'SDG', decimals: 2 },
  'TND': { symbol: 'DT', decimals: 3 },
  'DZD': { symbol: 'DA', decimals: 2 },
  'LYD': { symbol: 'LD', decimals: 3 },
  'VES': { symbol: 'Bs', decimals: 2 },
  'BOB': { symbol: 'Bs', decimals: 2 },
  'PYG': { symbol: '₲', decimals: 0 },
  'UYU': { symbol: '$', decimals: 2 },
  'GTQ': { symbol: 'Q', decimals: 2 },
  'HNL': { symbol: 'L', decimals: 2 },
  'NIO': { symbol: 'C$', decimals: 2 },
  'CRC': { symbol: '₡', decimals: 0 },
  'PAB': { symbol: 'B/.', decimals: 2 },
  'DOP': { symbol: 'RD$', decimals: 2 },
  'HTG': { symbol: 'G', decimals: 2 },
  'JMD': { symbol: 'J$', decimals: 2 },
  'IQD': { symbol: 'ID', decimals: 0 },
  'YER': { symbol: '﷼', decimals: 0 },
  'SYP': { symbol: '£S', decimals: 0 },
  'JOD': { symbol: 'JD', decimals: 3 },
  'LBP': { symbol: 'L£', decimals: 0 },
  'ILS': { symbol: '₪', decimals: 2 },
  'UAH': { symbol: '₴', decimals: 2 },
  'MDL': { symbol: 'L', decimals: 2 },
  'ALL': { symbol: 'L', decimals: 0 },
  'BAM': { symbol: 'KM', decimals: 2 },
  'RSD': { symbol: 'din', decimals: 0 },
  'MKD': { symbol: 'ден', decimals: 2 },
  'PGK': { symbol: 'K', decimals: 2 },
  'FJD': { symbol: '$', decimals: 2 },
  'WST': { symbol: 'T', decimals: 2 },
  'TOP': { symbol: 'T$', decimals: 2 },
  'VUV': { symbol: 'Vt', decimals: 0 },
  'SBD': { symbol: '$', decimals: 2 },
  // Additional currency formats
  'SSP': { symbol: 'SSP', decimals: 2 },
  'BIF': { symbol: 'FBu', decimals: 0 },
  'CVE': { symbol: '$', decimals: 2 },
  'KMF': { symbol: 'CF', decimals: 0 },
  'DJF': { symbol: 'Fdj', decimals: 0 },
  'ERN': { symbol: 'Nfk', decimals: 2 },
  'GMD': { symbol: 'D', decimals: 2 },
  'GNF': { symbol: 'FG', decimals: 0 },
  'LSL': { symbol: 'L', decimals: 2 },
  'LRD': { symbol: '$', decimals: 2 },
  'MGA': { symbol: 'Ar', decimals: 0 },
  'MRU': { symbol: 'UM', decimals: 2 },
  'STN': { symbol: 'Db', decimals: 2 },
  'SLL': { symbol: 'Le', decimals: 0 },
  'SOS': { symbol: 'S', decimals: 0 },
  'SZL': { symbol: 'E', decimals: 2 },
  'AMD': { symbol: '֏', decimals: 0 },
  'AZN': { symbol: '₼', decimals: 2 },
  'BTN': { symbol: 'Nu.', decimals: 2 },
  'GEL': { symbol: '₾', decimals: 2 },
  'IRR': { symbol: '﷼', decimals: 0 },
  'KZT': { symbol: '₸', decimals: 2 },
  'KGS': { symbol: 'с', decimals: 2 },
  'MVR': { symbol: '.ރ', decimals: 2 },
  'MNT': { symbol: '₮', decimals: 0 },
  'TJS': { symbol: 'ЅМ', decimals: 2 },
  'TMT': { symbol: 'T', decimals: 2 },
  'UZS': { symbol: 'soʻm', decimals: 0 },
  'BZD': { symbol: 'BZ$', decimals: 2 },
  'CUP': { symbol: '₱', decimals: 2 },
  'GYD': { symbol: '$', decimals: 0 },
  'SRD': { symbol: '$', decimals: 2 },
  'BYN': { symbol: 'Br', decimals: 2 },
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country') || 'US';
  const targetCurrency = countryCurrencyMap[country] || 'USD';
  const baseCurrency = searchParams.get('base') || 'USD';
  
  console.log(`🌍 [ExchangeRate API] Request received - Country: ${country}, Target Currency: ${targetCurrency}, Base: ${baseCurrency}`);
  
  try {
    // If requesting USD, no conversion needed
    if (targetCurrency === 'USD' && baseCurrency === 'USD') {
      return NextResponse.json({
        success: true,
        rate: 1,
        currency: 'USD',
        source: 'Direct',
        format: { symbol: '$', decimals: 2 }
      });
    }

    // Try Wise API first (public endpoint)
    try {
      const wiseUrl = `https://api.wise.com/v1/rates?source=${baseCurrency}&target=${targetCurrency}`;
      console.log(`🌍 [ExchangeRate API] Calling Wise API: ${wiseUrl}`);
      
      const wiseResponse = await fetch(wiseUrl, {
        headers: {
          'Accept': 'application/json',
        }
      });
      
      console.log(`🌍 [ExchangeRate API] Wise API response status: ${wiseResponse.status}`);

      if (wiseResponse.ok) {
        const wiseData = await wiseResponse.json();
        console.log('🌍 [ExchangeRate API] Wise API data:', wiseData);
        const rate = wiseData[0]?.rate || 1;
        
        const result = {
          success: true,
          rate: rate,
          currency: targetCurrency,
          source: 'Wise',
          format: currencyFormats[targetCurrency] || { symbol: targetCurrency, decimals: 2 },
          disclaimer: 'Exchange rate is estimated and may vary. Source: Wise.'
        };
        
        console.log('🌍 [ExchangeRate API] Returning Wise result:', result);
        return NextResponse.json(result);
      } else {
        console.warn(`🌍 [ExchangeRate API] Wise API failed with status: ${wiseResponse.status}`);
      }
    } catch (wiseError) {
      console.error('🌍 [ExchangeRate API] Wise API error:', wiseError.message);
      console.log('🌍 [ExchangeRate API] Falling back to exchangerate-api');
    }

    // Fallback to exchangerate-api.com
    const fallbackUrl = `https://v6.exchangerate-api.com/v6/41fc0bfadd338697395e482f/latest/${baseCurrency}`;
    console.log(`🌍 [ExchangeRate API] Calling fallback API: ${fallbackUrl}`);
    
    const response = await fetch(fallbackUrl);
    console.log(`🌍 [ExchangeRate API] Fallback API response status: ${response.status}`);
    
    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`🌍 [ExchangeRate API] Fallback API conversion rates available:`, Object.keys(data.conversion_rates || {}).length);
    
    const rate = data.conversion_rates[targetCurrency] || 1;
    console.log(`🌍 [ExchangeRate API] Rate for ${targetCurrency}: ${rate}`);
    
    const result = {
      success: true,
      rate: rate,
      currency: targetCurrency,
      source: 'ExchangeRate-API',
      format: currencyFormats[targetCurrency] || { symbol: targetCurrency, decimals: 2 },
      disclaimer: 'Exchange rate is estimated and may vary. Actual rates depend on payment provider.'
    };
    
    console.log('🌍 [ExchangeRate API] Returning fallback result:', result);
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('🌍 [ExchangeRate API] Critical error:', error);
    const errorResult = {
      success: false,
      rate: 1,
      currency: targetCurrency,
      source: 'Default',
      format: { symbol: targetCurrency, decimals: 2 },
      error: 'Unable to fetch exchange rate'
    };
    console.log('🌍 [ExchangeRate API] Returning error result:', errorResult);
    return NextResponse.json(errorResult);
  }
}