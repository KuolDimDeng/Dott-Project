"""
Currency data for all 170+ world currencies
Includes currency codes, names, symbols, and decimal places
"""

CURRENCY_DATA = {
    # Major Currencies
    'USD': {'name': 'US Dollar', 'symbol': '$', 'decimal_places': 2, 'symbol_position': 'before'},
    'EUR': {'name': 'Euro', 'symbol': '€', 'decimal_places': 2, 'symbol_position': 'before'},
    'GBP': {'name': 'British Pound', 'symbol': '£', 'decimal_places': 2, 'symbol_position': 'before'},
    'JPY': {'name': 'Japanese Yen', 'symbol': '¥', 'decimal_places': 0, 'symbol_position': 'before'},
    'CHF': {'name': 'Swiss Franc', 'symbol': 'CHF', 'decimal_places': 2, 'symbol_position': 'before'},
    'CAD': {'name': 'Canadian Dollar', 'symbol': 'C$', 'decimal_places': 2, 'symbol_position': 'before'},
    'AUD': {'name': 'Australian Dollar', 'symbol': 'A$', 'decimal_places': 2, 'symbol_position': 'before'},
    'NZD': {'name': 'New Zealand Dollar', 'symbol': 'NZ$', 'decimal_places': 2, 'symbol_position': 'before'},
    
    # African Currencies
    'ZAR': {'name': 'South African Rand', 'symbol': 'R', 'decimal_places': 2, 'symbol_position': 'before'},
    'NGN': {'name': 'Nigerian Naira', 'symbol': '₦', 'decimal_places': 2, 'symbol_position': 'before'},
    'KES': {'name': 'Kenyan Shilling', 'symbol': 'KSh', 'decimal_places': 2, 'symbol_position': 'before'},
    'GHS': {'name': 'Ghanaian Cedi', 'symbol': '₵', 'decimal_places': 2, 'symbol_position': 'before'},
    'EGP': {'name': 'Egyptian Pound', 'symbol': 'E£', 'decimal_places': 2, 'symbol_position': 'before'},
    'MAD': {'name': 'Moroccan Dirham', 'symbol': 'MAD', 'decimal_places': 2, 'symbol_position': 'after'},
    'TND': {'name': 'Tunisian Dinar', 'symbol': 'TND', 'decimal_places': 3, 'symbol_position': 'after'},
    'DZD': {'name': 'Algerian Dinar', 'symbol': 'DA', 'decimal_places': 2, 'symbol_position': 'after'},
    'ETB': {'name': 'Ethiopian Birr', 'symbol': 'Br', 'decimal_places': 2, 'symbol_position': 'before'},
    'UGX': {'name': 'Ugandan Shilling', 'symbol': 'USh', 'decimal_places': 0, 'symbol_position': 'before'},
    'TZS': {'name': 'Tanzanian Shilling', 'symbol': 'TSh', 'decimal_places': 0, 'symbol_position': 'before'},
    'ZWL': {'name': 'Zimbabwean Dollar', 'symbol': 'Z$', 'decimal_places': 2, 'symbol_position': 'before'},
    'ZMW': {'name': 'Zambian Kwacha', 'symbol': 'ZK', 'decimal_places': 2, 'symbol_position': 'before'},
    'BWP': {'name': 'Botswana Pula', 'symbol': 'P', 'decimal_places': 2, 'symbol_position': 'before'},
    'MWK': {'name': 'Malawian Kwacha', 'symbol': 'MK', 'decimal_places': 2, 'symbol_position': 'before'},
    'MZN': {'name': 'Mozambican Metical', 'symbol': 'MT', 'decimal_places': 2, 'symbol_position': 'before'},
    'AOA': {'name': 'Angolan Kwanza', 'symbol': 'Kz', 'decimal_places': 2, 'symbol_position': 'before'},
    'XAF': {'name': 'Central African CFA Franc', 'symbol': 'FCFA', 'decimal_places': 0, 'symbol_position': 'after'},
    'XOF': {'name': 'West African CFA Franc', 'symbol': 'CFA', 'decimal_places': 0, 'symbol_position': 'after'},
    'RWF': {'name': 'Rwandan Franc', 'symbol': 'FRw', 'decimal_places': 0, 'symbol_position': 'before'},
    'BIF': {'name': 'Burundian Franc', 'symbol': 'FBu', 'decimal_places': 0, 'symbol_position': 'before'},
    'GNF': {'name': 'Guinean Franc', 'symbol': 'FG', 'decimal_places': 0, 'symbol_position': 'before'},
    'DJF': {'name': 'Djiboutian Franc', 'symbol': 'Fdj', 'decimal_places': 0, 'symbol_position': 'before'},
    'ERN': {'name': 'Eritrean Nakfa', 'symbol': 'Nfk', 'decimal_places': 2, 'symbol_position': 'before'},
    'SOS': {'name': 'Somali Shilling', 'symbol': 'S', 'decimal_places': 0, 'symbol_position': 'before'},
    'SSP': {'name': 'South Sudanese Pound', 'symbol': '£', 'decimal_places': 2, 'symbol_position': 'before'},
    'SDG': {'name': 'Sudanese Pound', 'symbol': '£', 'decimal_places': 2, 'symbol_position': 'before'},
    'LYD': {'name': 'Libyan Dinar', 'symbol': 'LD', 'decimal_places': 3, 'symbol_position': 'after'},
    'MRU': {'name': 'Mauritanian Ouguiya', 'symbol': 'UM', 'decimal_places': 1, 'symbol_position': 'after'},
    'MGA': {'name': 'Malagasy Ariary', 'symbol': 'Ar', 'decimal_places': 0, 'symbol_position': 'before'},
    'KMF': {'name': 'Comorian Franc', 'symbol': 'CF', 'decimal_places': 0, 'symbol_position': 'after'},
    'SCR': {'name': 'Seychellois Rupee', 'symbol': '₨', 'decimal_places': 2, 'symbol_position': 'before'},
    'MUR': {'name': 'Mauritian Rupee', 'symbol': '₨', 'decimal_places': 0, 'symbol_position': 'before'},
    'LSL': {'name': 'Lesotho Loti', 'symbol': 'L', 'decimal_places': 2, 'symbol_position': 'before'},
    'SZL': {'name': 'Swazi Lilangeni', 'symbol': 'E', 'decimal_places': 2, 'symbol_position': 'before'},
    'NAD': {'name': 'Namibian Dollar', 'symbol': 'N$', 'decimal_places': 2, 'symbol_position': 'before'},
    'CVE': {'name': 'Cape Verdean Escudo', 'symbol': '$', 'decimal_places': 0, 'symbol_position': 'after'},
    'STN': {'name': 'São Tomé and Príncipe Dobra', 'symbol': 'Db', 'decimal_places': 2, 'symbol_position': 'before'},
    'GMD': {'name': 'Gambian Dalasi', 'symbol': 'D', 'decimal_places': 2, 'symbol_position': 'before'},
    'GNF': {'name': 'Guinean Franc', 'symbol': 'FG', 'decimal_places': 0, 'symbol_position': 'before'},
    'LRD': {'name': 'Liberian Dollar', 'symbol': 'L$', 'decimal_places': 2, 'symbol_position': 'before'},
    'SLL': {'name': 'Sierra Leonean Leone', 'symbol': 'Le', 'decimal_places': 0, 'symbol_position': 'before'},
    
    # Asian Currencies
    'CNY': {'name': 'Chinese Yuan', 'symbol': '¥', 'decimal_places': 2, 'symbol_position': 'before'},
    'INR': {'name': 'Indian Rupee', 'symbol': '₹', 'decimal_places': 2, 'symbol_position': 'before'},
    'KRW': {'name': 'South Korean Won', 'symbol': '₩', 'decimal_places': 0, 'symbol_position': 'before'},
    'SGD': {'name': 'Singapore Dollar', 'symbol': 'S$', 'decimal_places': 2, 'symbol_position': 'before'},
    'HKD': {'name': 'Hong Kong Dollar', 'symbol': 'HK$', 'decimal_places': 2, 'symbol_position': 'before'},
    'TWD': {'name': 'Taiwan Dollar', 'symbol': 'NT$', 'decimal_places': 0, 'symbol_position': 'before'},
    'THB': {'name': 'Thai Baht', 'symbol': '฿', 'decimal_places': 2, 'symbol_position': 'before'},
    'MYR': {'name': 'Malaysian Ringgit', 'symbol': 'RM', 'decimal_places': 2, 'symbol_position': 'before'},
    'IDR': {'name': 'Indonesian Rupiah', 'symbol': 'Rp', 'decimal_places': 0, 'symbol_position': 'before'},
    'PHP': {'name': 'Philippine Peso', 'symbol': '₱', 'decimal_places': 2, 'symbol_position': 'before'},
    'VND': {'name': 'Vietnamese Dong', 'symbol': '₫', 'decimal_places': 0, 'symbol_position': 'after'},
    'BDT': {'name': 'Bangladeshi Taka', 'symbol': '৳', 'decimal_places': 2, 'symbol_position': 'before'},
    'PKR': {'name': 'Pakistani Rupee', 'symbol': '₨', 'decimal_places': 0, 'symbol_position': 'before'},
    'LKR': {'name': 'Sri Lankan Rupee', 'symbol': 'Rs', 'decimal_places': 2, 'symbol_position': 'before'},
    'NPR': {'name': 'Nepalese Rupee', 'symbol': '₨', 'decimal_places': 2, 'symbol_position': 'before'},
    'AFN': {'name': 'Afghan Afghani', 'symbol': '؋', 'decimal_places': 2, 'symbol_position': 'before'},
    'MMK': {'name': 'Myanmar Kyat', 'symbol': 'K', 'decimal_places': 0, 'symbol_position': 'before'},
    'KHR': {'name': 'Cambodian Riel', 'symbol': '៛', 'decimal_places': 0, 'symbol_position': 'after'},
    'LAK': {'name': 'Lao Kip', 'symbol': '₭', 'decimal_places': 0, 'symbol_position': 'before'},
    'BND': {'name': 'Brunei Dollar', 'symbol': 'B$', 'decimal_places': 2, 'symbol_position': 'before'},
    'BTN': {'name': 'Bhutanese Ngultrum', 'symbol': 'Nu.', 'decimal_places': 2, 'symbol_position': 'before'},
    'MVR': {'name': 'Maldivian Rufiyaa', 'symbol': 'Rf', 'decimal_places': 2, 'symbol_position': 'before'},
    'MNT': {'name': 'Mongolian Tugrik', 'symbol': '₮', 'decimal_places': 0, 'symbol_position': 'before'},
    'KZT': {'name': 'Kazakhstani Tenge', 'symbol': '₸', 'decimal_places': 2, 'symbol_position': 'before'},
    'UZS': {'name': 'Uzbekistani Som', 'symbol': "so'm", 'decimal_places': 0, 'symbol_position': 'after'},
    'KGS': {'name': 'Kyrgyzstani Som', 'symbol': 'с', 'decimal_places': 2, 'symbol_position': 'after'},
    'TJS': {'name': 'Tajikistani Somoni', 'symbol': 'SM', 'decimal_places': 2, 'symbol_position': 'before'},
    'TMT': {'name': 'Turkmenistan Manat', 'symbol': 'T', 'decimal_places': 2, 'symbol_position': 'before'},
    'AZN': {'name': 'Azerbaijani Manat', 'symbol': '₼', 'decimal_places': 2, 'symbol_position': 'before'},
    'GEL': {'name': 'Georgian Lari', 'symbol': '₾', 'decimal_places': 2, 'symbol_position': 'before'},
    'AMD': {'name': 'Armenian Dram', 'symbol': '֏', 'decimal_places': 0, 'symbol_position': 'before'},
    
    # Middle Eastern Currencies
    'AED': {'name': 'UAE Dirham', 'symbol': 'د.إ', 'decimal_places': 2, 'symbol_position': 'after'},
    'SAR': {'name': 'Saudi Riyal', 'symbol': '﷼', 'decimal_places': 2, 'symbol_position': 'after'},
    'QAR': {'name': 'Qatari Riyal', 'symbol': '﷼', 'decimal_places': 2, 'symbol_position': 'after'},
    'KWD': {'name': 'Kuwaiti Dinar', 'symbol': 'KD', 'decimal_places': 3, 'symbol_position': 'after'},
    'BHD': {'name': 'Bahraini Dinar', 'symbol': 'BD', 'decimal_places': 3, 'symbol_position': 'after'},
    'OMR': {'name': 'Omani Rial', 'symbol': '﷼', 'decimal_places': 3, 'symbol_position': 'after'},
    'JOD': {'name': 'Jordanian Dinar', 'symbol': 'JD', 'decimal_places': 3, 'symbol_position': 'after'},
    'ILS': {'name': 'Israeli New Shekel', 'symbol': '₪', 'decimal_places': 2, 'symbol_position': 'before'},
    'TRY': {'name': 'Turkish Lira', 'symbol': '₺', 'decimal_places': 2, 'symbol_position': 'before'},
    'LBP': {'name': 'Lebanese Pound', 'symbol': 'LL', 'decimal_places': 0, 'symbol_position': 'after'},
    'SYP': {'name': 'Syrian Pound', 'symbol': '£S', 'decimal_places': 0, 'symbol_position': 'after'},
    'IQD': {'name': 'Iraqi Dinar', 'symbol': 'ع.د', 'decimal_places': 0, 'symbol_position': 'after'},
    'IRR': {'name': 'Iranian Rial', 'symbol': '﷼', 'decimal_places': 0, 'symbol_position': 'after'},
    'YER': {'name': 'Yemeni Rial', 'symbol': '﷼', 'decimal_places': 0, 'symbol_position': 'after'},
    
    # European Currencies (Non-Euro)
    'SEK': {'name': 'Swedish Krona', 'symbol': 'kr', 'decimal_places': 2, 'symbol_position': 'after'},
    'NOK': {'name': 'Norwegian Krone', 'symbol': 'kr', 'decimal_places': 2, 'symbol_position': 'after'},
    'DKK': {'name': 'Danish Krone', 'symbol': 'kr', 'decimal_places': 2, 'symbol_position': 'after'},
    'ISK': {'name': 'Icelandic Króna', 'symbol': 'kr', 'decimal_places': 0, 'symbol_position': 'after'},
    'PLN': {'name': 'Polish Złoty', 'symbol': 'zł', 'decimal_places': 2, 'symbol_position': 'after'},
    'CZK': {'name': 'Czech Koruna', 'symbol': 'Kč', 'decimal_places': 2, 'symbol_position': 'after'},
    'HUF': {'name': 'Hungarian Forint', 'symbol': 'Ft', 'decimal_places': 0, 'symbol_position': 'after'},
    'RON': {'name': 'Romanian Leu', 'symbol': 'lei', 'decimal_places': 2, 'symbol_position': 'after'},
    'BGN': {'name': 'Bulgarian Lev', 'symbol': 'лв', 'decimal_places': 2, 'symbol_position': 'after'},
    'HRK': {'name': 'Croatian Kuna', 'symbol': 'kn', 'decimal_places': 2, 'symbol_position': 'after'},
    'RSD': {'name': 'Serbian Dinar', 'symbol': 'дин', 'decimal_places': 0, 'symbol_position': 'after'},
    'BAM': {'name': 'Bosnia and Herzegovina Convertible Mark', 'symbol': 'KM', 'decimal_places': 2, 'symbol_position': 'after'},
    'MKD': {'name': 'Macedonian Denar', 'symbol': 'ден', 'decimal_places': 2, 'symbol_position': 'after'},
    'ALL': {'name': 'Albanian Lek', 'symbol': 'L', 'decimal_places': 0, 'symbol_position': 'after'},
    'MDL': {'name': 'Moldovan Leu', 'symbol': 'L', 'decimal_places': 2, 'symbol_position': 'after'},
    'UAH': {'name': 'Ukrainian Hryvnia', 'symbol': '₴', 'decimal_places': 2, 'symbol_position': 'before'},
    'BYN': {'name': 'Belarusian Ruble', 'symbol': 'Br', 'decimal_places': 2, 'symbol_position': 'after'},
    'RUB': {'name': 'Russian Ruble', 'symbol': '₽', 'decimal_places': 2, 'symbol_position': 'after'},
    
    # Latin American Currencies
    'BRL': {'name': 'Brazilian Real', 'symbol': 'R$', 'decimal_places': 2, 'symbol_position': 'before'},
    'MXN': {'name': 'Mexican Peso', 'symbol': '$', 'decimal_places': 2, 'symbol_position': 'before'},
    'ARS': {'name': 'Argentine Peso', 'symbol': '$', 'decimal_places': 2, 'symbol_position': 'before'},
    'COP': {'name': 'Colombian Peso', 'symbol': '$', 'decimal_places': 0, 'symbol_position': 'before'},
    'PEN': {'name': 'Peruvian Sol', 'symbol': 'S/', 'decimal_places': 2, 'symbol_position': 'before'},
    'CLP': {'name': 'Chilean Peso', 'symbol': '$', 'decimal_places': 0, 'symbol_position': 'before'},
    'VES': {'name': 'Venezuelan Bolívar', 'symbol': 'Bs.', 'decimal_places': 2, 'symbol_position': 'before'},
    'BOB': {'name': 'Bolivian Boliviano', 'symbol': 'Bs.', 'decimal_places': 2, 'symbol_position': 'before'},
    'PYG': {'name': 'Paraguayan Guaraní', 'symbol': '₲', 'decimal_places': 0, 'symbol_position': 'before'},
    'UYU': {'name': 'Uruguayan Peso', 'symbol': '$U', 'decimal_places': 2, 'symbol_position': 'before'},
    'CRC': {'name': 'Costa Rican Colón', 'symbol': '₡', 'decimal_places': 0, 'symbol_position': 'before'},
    'PAB': {'name': 'Panamanian Balboa', 'symbol': 'B/.', 'decimal_places': 2, 'symbol_position': 'before'},
    'GTQ': {'name': 'Guatemalan Quetzal', 'symbol': 'Q', 'decimal_places': 2, 'symbol_position': 'before'},
    'HNL': {'name': 'Honduran Lempira', 'symbol': 'L', 'decimal_places': 2, 'symbol_position': 'before'},
    'NIO': {'name': 'Nicaraguan Córdoba', 'symbol': 'C$', 'decimal_places': 2, 'symbol_position': 'before'},
    'DOP': {'name': 'Dominican Peso', 'symbol': 'RD$', 'decimal_places': 2, 'symbol_position': 'before'},
    'CUP': {'name': 'Cuban Peso', 'symbol': '₱', 'decimal_places': 2, 'symbol_position': 'before'},
    'HTG': {'name': 'Haitian Gourde', 'symbol': 'G', 'decimal_places': 2, 'symbol_position': 'before'},
    'JMD': {'name': 'Jamaican Dollar', 'symbol': 'J$', 'decimal_places': 2, 'symbol_position': 'before'},
    'TTD': {'name': 'Trinidad and Tobago Dollar', 'symbol': 'TT$', 'decimal_places': 2, 'symbol_position': 'before'},
    'BSD': {'name': 'Bahamian Dollar', 'symbol': 'B$', 'decimal_places': 2, 'symbol_position': 'before'},
    'BBD': {'name': 'Barbadian Dollar', 'symbol': 'Bds$', 'decimal_places': 2, 'symbol_position': 'before'},
    'BZD': {'name': 'Belize Dollar', 'symbol': 'BZ$', 'decimal_places': 2, 'symbol_position': 'before'},
    'GYD': {'name': 'Guyanese Dollar', 'symbol': 'G$', 'decimal_places': 0, 'symbol_position': 'before'},
    'SRD': {'name': 'Surinamese Dollar', 'symbol': '$', 'decimal_places': 2, 'symbol_position': 'before'},
    
    # Pacific Currencies
    'FJD': {'name': 'Fijian Dollar', 'symbol': 'FJ$', 'decimal_places': 2, 'symbol_position': 'before'},
    'PGK': {'name': 'Papua New Guinean Kina', 'symbol': 'K', 'decimal_places': 2, 'symbol_position': 'before'},
    'SBD': {'name': 'Solomon Islands Dollar', 'symbol': 'SI$', 'decimal_places': 2, 'symbol_position': 'before'},
    'VUV': {'name': 'Vanuatu Vatu', 'symbol': 'VT', 'decimal_places': 0, 'symbol_position': 'after'},
    'WST': {'name': 'Samoan Tala', 'symbol': 'WS$', 'decimal_places': 2, 'symbol_position': 'before'},
    'TOP': {'name': 'Tongan Paʻanga', 'symbol': 'T$', 'decimal_places': 2, 'symbol_position': 'before'},
    'XPF': {'name': 'CFP Franc', 'symbol': '₣', 'decimal_places': 0, 'symbol_position': 'after'},
    
    # Caribbean Currencies
    'XCD': {'name': 'East Caribbean Dollar', 'symbol': 'EC$', 'decimal_places': 2, 'symbol_position': 'before'},
    'ANG': {'name': 'Netherlands Antillean Guilder', 'symbol': 'ƒ', 'decimal_places': 2, 'symbol_position': 'before'},
    'AWG': {'name': 'Aruban Florin', 'symbol': 'ƒ', 'decimal_places': 2, 'symbol_position': 'before'},
    'KYD': {'name': 'Cayman Islands Dollar', 'symbol': 'CI$', 'decimal_places': 2, 'symbol_position': 'before'},
    'BMD': {'name': 'Bermudian Dollar', 'symbol': 'BD$', 'decimal_places': 2, 'symbol_position': 'before'},
    
    # Other Currencies
    'GIP': {'name': 'Gibraltar Pound', 'symbol': '£', 'decimal_places': 2, 'symbol_position': 'before'},
    'FKP': {'name': 'Falkland Islands Pound', 'symbol': '£', 'decimal_places': 2, 'symbol_position': 'before'},
    'SHP': {'name': 'Saint Helena Pound', 'symbol': '£', 'decimal_places': 2, 'symbol_position': 'before'},
}

def get_currency_list():
    """Get a list of all currencies for dropdown"""
    return [
        {'code': code, 'name': data['name'], 'display': f"{data['name']} ({code})"}
        for code, data in CURRENCY_DATA.items()
    ]

def get_currency_info(currency_code: str):
    """Get currency information by code"""
    return CURRENCY_DATA.get(currency_code.upper(), {
        'name': currency_code,
        'symbol': currency_code,
        'decimal_places': 2,
        'symbol_position': 'before'
    })

def format_currency(amount, currency_code: str, include_code: bool = False):
    """Format an amount in the specified currency"""
    info = get_currency_info(currency_code)
    
    # Handle decimal places
    if info['decimal_places'] == 0:
        formatted_amount = f"{int(amount):,}"
    else:
        formatted_amount = f"{amount:,.{info['decimal_places']}f}"
    
    # Apply symbol
    if info['symbol_position'] == 'before':
        result = f"{info['symbol']}{formatted_amount}"
    else:
        result = f"{formatted_amount} {info['symbol']}"
    
    # Add currency code if requested
    if include_code and info['symbol'] != currency_code:
        result += f" {currency_code}"
    
    return result