# taxes/services/currency_service.py
import requests
import logging
from decimal import Decimal
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

class CurrencyService:
    """Service for handling currency conversion and exchange rates"""
    
    EXCHANGE_RATE_API_URL = "https://api.exchangerate-api.com/v4/latest/USD"
    CACHE_KEY_PREFIX = "exchange_rate_"
    CACHE_TIMEOUT = 86400  # 24 hours
    
    @staticmethod
    def get_currency_info(country_code):
        """
        Get currency information for a country
        Returns: (currency_code, currency_symbol)
        """
        # Map of countries to their currencies
        currency_map = {
                # North America
                'US': ('USD', '$'),       # United States
                'CA': ('CAD', 'C$'),      # Canada
                'MX': ('MXN', 'Mex$'),    # Mexico
                'AG': ('XCD', '$'),       # Antigua & Barbuda (East Caribbean Dollar)
                'BS': ('BSD', '$'),       # Bahamas (Bahamian Dollar)
                'BB': ('BBD', '$'),       # Barbados (Barbados Dollar)
                'BZ': ('BZD', 'BZ$'),    # Belize
                'CR': ('CRC', '₡'),       # Costa Rica
                'CU': ('CUP', '$'),       # Cuba (Cuban Peso)
                'DM': ('XCD', '$'),       # Dominica (East Caribbean Dollar)
                'DO': ('DOP', 'RD$'),     # Dominican Republic
                'SV': ('USD', '$'),       # El Salvador (US Dollar)
                'GD': ('XCD', '$'),       # Grenada
                'GT': ('GTQ', 'Q'),       # Guatemala
                'HT': ('HTG', 'G'),       # Haiti (Gourde)
                'HN': ('HNL', 'L'),       # Honduras
                'JM': ('JMD', 'J$'),      # Jamaica
                'NI': ('NIO', 'C$'),      # Nicaragua
                'PA': ('PAB', 'B/.'),     # Panama (Balboa)
                'KN': ('XCD', '$'),       # St. Kitts & Nevis
                'LC': ('XCD', '$'),       # St. Lucia
                'VC': ('XCD', '$'),       # St. Vincent & Grenadines
                'TT': ('TTD', 'TT$'),     # Trinidad & Tobago

                # Europe
                'GB': ('GBP', '£'),       # United Kingdom
                'EU': ('EUR', '€'),       # Eurozone (generic)
                'AL': ('ALL', 'L'),       # Albania (Lek)
                'AD': ('EUR', '€'),       # Andorra (Euro)
                'AT': ('EUR', '€'),       # Austria
                'BE': ('EUR', '€'),       # Belgium
                'BA': ('BAM', 'KM'),      # Bosnia & Herzegovina (Convertible Mark)
                'BG': ('BGN', 'лв'),      # Bulgaria (Lev)
                'HR': ('EUR', '€'),       # Croatia (Euro since 2023)
                'CY': ('EUR', '€'),       # Cyprus
                'CZ': ('CZK', 'Kč'),      # Czech Republic (Koruna)
                'DK': ('DKK', 'kr'),      # Denmark (Krone)
                'EE': ('EUR', '€'),       # Estonia
                'FI': ('EUR', '€'),       # Finland
                'FR': ('EUR', '€'),       # France
                'DE': ('EUR', '€'),       # Germany
                'GR': ('EUR', '€'),       # Greece
                'HU': ('HUF', 'Ft'),      # Hungary (Forint)
                'IS': ('ISK', 'kr'),      # Iceland (Krona)
                'IE': ('EUR', '€'),       # Ireland
                'IT': ('EUR', '€'),       # Italy
                'LV': ('EUR', '€'),       # Latvia
                'LI': ('CHF', 'Fr'),      # Liechtenstein (Swiss Franc)
                'LT': ('EUR', '€'),       # Lithuania
                'LU': ('EUR', '€'),       # Luxembourg
                'MT': ('EUR', '€'),       # Malta
                'MD': ('MDL', 'L'),       # Moldova (Leu)
                'MC': ('EUR', '€'),       # Monaco (Euro)
                'ME': ('EUR', '€'),       # Montenegro (Euro)
                'NL': ('EUR', '€'),       # Netherlands
                'MK': ('MKD', 'ден'),     # North Macedonia (Denar)
                'NO': ('NOK', 'kr'),      # Norway (Krone)
                'PL': ('PLN', 'zł'),      # Poland (Złoty)
                'PT': ('EUR', '€'),       # Portugal
                'RO': ('RON', 'lei'),     # Romania (Leu)
                'RU': ('RUB', '₽'),       # Russia (Ruble)
                'SM': ('EUR', '€'),       # San Marino (Euro)
                'RS': ('RSD', 'дин.'),    # Serbia (Dinar)
                'SK': ('EUR', '€'),       # Slovakia
                'SI': ('EUR', '€'),       # Slovenia
                'ES': ('EUR', '€'),       # Spain
                'SE': ('SEK', 'kr'),      # Sweden (Krona)
                'CH': ('CHF', 'Fr'),      # Switzerland (Franc)
                'UA': ('UAH', '₴'),       # Ukraine (Hryvnia)
                'VA': ('EUR', '€'),       # Vatican City (Euro)

                # Asia-Pacific
                'AU': ('AUD', 'A$'),      # Australia
                'CN': ('CNY', '¥'),       # China (Yuan)
                'HK': ('HKD', 'HK$'),     # Hong Kong
                'IN': ('INR', '₹'),       # India (Rupee)
                'ID': ('IDR', 'Rp'),      # Indonesia (Rupiah)
                'JP': ('JPY', '¥'),       # Japan (Yen)
                'KR': ('KRW', '₩'),       # South Korea (Won)
                'MY': ('MYR', 'RM'),      # Malaysia (Ringgit)
                'NZ': ('NZD', 'NZ$'),     # New Zealand
                'PH': ('PHP', '₱'),       # Philippines (Peso)
                'SG': ('SGD', 'S$'),      # Singapore
                'TW': ('TWD', 'NT$'),     # Taiwan (Dollar)
                'TH': ('THB', '฿'),       # Thailand (Baht)
                'VN': ('VND', '₫'),       # Vietnam (Đồng)
                'AF': ('AFN', '؋'),       # Afghanistan (Afghani)
                'BD': ('BDT', '৳'),       # Bangladesh (Taka)
                'BT': ('BTN', 'Nu.'),     # Bhutan (Ngultrum)
                'BN': ('BND', '$'),       # Brunei (Dollar)
                'KH': ('KHR', '៛'),       # Cambodia (Riel)
                'FJ': ('FJD', 'FJ$'),     # Fiji (Dollar)
                'GE': ('GEL', '₾'),       # Georgia (Lari)
                'IR': ('IRR', '﷼'),       # Iran (Rial)
                'IQ': ('IQD', 'ع.د'),     # Iraq (Dinar)
                'IL': ('ILS', '₪'),       # Israel (Shekel)
                'JO': ('JOD', 'JD'),      # Jordan (Dinar)
                'KZ': ('KZT', '₸'),       # Kazakhstan (Tenge)
                'KW': ('KWD', 'د.ك'),     # Kuwait (Dinar)
                'KG': ('KGS', 'с'),       # Kyrgyzstan (Som)
                'LA': ('LAK', '₭'),       # Laos (Kip)
                'LB': ('LBP', 'ل.ل'),     # Lebanon (Pound)
                'MV': ('MVR', 'MVR'),     # Maldives (Rufiyaa)
                'MN': ('MNT', '₮'),       # Mongolia (Tugrik)
                'MM': ('MMK', 'K'),       # Myanmar (Kyat)
                'NP': ('NPR', 'रू'),      # Nepal (Rupee)
                'OM': ('OMR', 'ر.ع.'),    # Oman (Rial)
                'PK': ('PKR', '₨'),       # Pakistan (Rupee)
                'PS': ('ILS', '₪'),       # Palestine (Shekel)
                'PG': ('PGK', 'K'),       # Papua New Guinea (Kina)
                'QA': ('QAR', 'ر.ق'),     # Qatar (Riyal)
                'SA': ('SAR', '﷼'),       # Saudi Arabia (Riyal)
                'LK': ('LKR', 'Rs'),      # Sri Lanka (Rupee)
                'SY': ('SYP', '£'),       # Syria (Pound)
                'TJ': ('TJS', 'ЅМ'),      # Tajikistan (Somoni)
                'TL': ('USD', '$'),       # Timor-Leste (US Dollar)
                'TM': ('TMT', 'T'),       # Turkmenistan (Manat)
                'AE': ('AED', 'د.إ'),     # UAE (Dirham)
                'UZ': ('UZS', 'so\'m'),   # Uzbekistan (Som)
                'YE': ('YER', '﷼'),       # Yemen (Rial)

                # Middle East
                'BH': ('BHD', 'BD'),      # Bahrain (Dinar)
                'TR': ('TRY', '₺'),       # Turkey (Lira)

                # South America
                'AR': ('ARS', '$'),       # Argentina (Peso)
                'BO': ('BOB', 'Bs.'),     # Bolivia (Boliviano)
                'BR': ('BRL', 'R$'),      # Brazil (Real)
                'CL': ('CLP', '$'),       # Chile (Peso)
                'CO': ('COP', '$'),       # Colombia (Peso)
                'EC': ('USD', '$'),       # Ecuador (US Dollar)
                'GY': ('GYD', '$'),       # Guyana (Dollar)
                'PY': ('PYG', '₲'),       # Paraguay (Guarani)
                'PE': ('PEN', 'S/'),      # Peru (Sol)
                'SR': ('SRD', '$'),       # Suriname (Dollar)
                'UY': ('UYU', '$U'),      # Uruguay (Peso)
                'VE': ('VES', 'Bs.'),     # Venezuela (Bolívar)

                # Africa
                'DZ': ('DZD', 'DA'),      # Algeria (Dinar)
                'AO': ('AOA', 'Kz'),      # Angola (Kwanza)
                'BJ': ('XOF', 'CFA'),     # Benin (CFA Franc)
                'BW': ('BWP', 'P'),       # Botswana (Pula)
                'BF': ('XOF', 'CFA'),     # Burkina Faso (CFA Franc)
                'BI': ('BIF', 'FBu'),     # Burundi (Franc)
                'CV': ('CVE', '$'),       # Cape Verde (Escudo)
                'CM': ('XAF', 'FCFA'),    # Cameroon (CFA Franc)
                'CF': ('XAF', 'FCFA'),    # Central African Republic (CFA Franc)
                'TD': ('XAF', 'FCFA'),    # Chad (CFA Franc)
                'KM': ('KMF', 'CF'),      # Comoros (Franc)
                'CD': ('CDF', 'FC'),      # Congo (Kinshasa) (Franc)
                'CG': ('XAF', 'FCFA'),    # Congo (Brazzaville) (CFA Franc)
                'CI': ('XOF', 'CFA'),     # Côte d'Ivoire (CFA Franc)
                'DJ': ('DJF', 'Fdj'),     # Djibouti (Franc)
                'EG': ('EGP', 'E£'),      # Egypt (Pound)
                'GQ': ('XAF', 'FCFA'),    # Equatorial Guinea (CFA Franc)
                'ER': ('ERN', 'Nfk'),     # Eritrea (Nakfa)
                'SZ': ('SZL', 'L'),       # Eswatini (Lilangeni)
                'ET': ('ETB', 'Br'),      # Ethiopia (Birr)
                'GA': ('XAF', 'FCFA'),    # Gabon (CFA Franc)
                'GM': ('GMD', 'D'),       # Gambia (Dalasi)
                'GH': ('GHS', 'GH₵'),     # Ghana (Cedi)
                'GN': ('GNF', 'FG'),      # Guinea (Franc)
                'GW': ('XOF', 'CFA'),     # Guinea-Bissau (CFA Franc)
                'KE': ('KES', 'KSh'),     # Kenya (Shilling)
                'LS': ('LSL', 'L'),       # Lesotho (Loti)
                'LR': ('LRD', '$'),       # Liberia (Dollar)
                'LY': ('LYD', 'LD'),      # Libya (Dinar)
                'MG': ('MGA', 'Ar'),      # Madagascar (Ariary)
                'MW': ('MWK', 'MK'),      # Malawi (Kwacha)
                'ML': ('XOF', 'CFA'),     # Mali (CFA Franc)
                'MR': ('MRU', 'UM'),      # Mauritania (Ouguiya)
                'MU': ('MUR', '₨'),       # Mauritius (Rupee)
                'MA': ('MAD', 'DH'),      # Morocco (Dirham)
                'MZ': ('MZN', 'MT'),      # Mozambique (Metical)
                'NA': ('NAD', 'N$'),      # Namibia (Dollar)
                'NE': ('XOF', 'CFA'),     # Niger (CFA Franc)
                'NG': ('NGN', '₦'),       # Nigeria (Naira)
                'RW': ('RWF', 'RF'),      # Rwanda (Franc)
                'ST': ('STN', 'Db'),      # São Tomé & Príncipe (Dobra)
                'SN': ('XOF', 'CFA'),     # Senegal (CFA Franc)
                'SC': ('SCR', '₨'),       # Seychelles (Rupee)
                'SL': ('SLL', 'Le'),      # Sierra Leone (Leone)
                'SO': ('SOS', 'S'),       # Somalia (Shilling)
                'ZA': ('ZAR', 'R'),       # South Africa (Rand)
                'SS': ('SSP', '£'),       # South Sudan (Pound)
                'SD': ('SDG', 'ج.س'),     # Sudan (Pound)
                'TZ': ('TZS', 'TSh'),     # Tanzania (Shilling)
                'TG': ('XOF', 'CFA'),     # Togo (CFA Franc)
                'TN': ('TND', 'DT'),      # Tunisia (Dinar)
                'UG': ('UGX', 'USh'),     # Uganda (Shilling)
                'ZM': ('ZMW', 'ZK'),      # Zambia (Kwacha)
                'ZW': ('ZWL', 'Z$'),      # Zimbabwe (Dollar)

                # Other regions
                'FM': ('USD', '$'),       # Micronesia (US Dollar)
                'KI': ('AUD', '$'),       # Kiribati (Australian Dollar)
                'MH': ('USD', '$'),       # Marshall Islands (US Dollar)
                'NR': ('AUD', '$'),       # Nauru (Australian Dollar)
                'PW': ('USD', '$'),       # Palau (US Dollar)
                'PG': ('PGK', 'K'),       # Papua New Guinea (Kina)
                'WS': ('WST', 'T'),       # Samoa (Tala)
                'SB': ('SBD', '$'),       # Solomon Islands (Dollar)
                'TO': ('TOP', 'T$'),      # Tonga (Pa'anga)
                'TV': ('AUD', '$'),       # Tuvalu (Australian Dollar)
                'VU': ('VUV', 'VT'),      # Vanuatu (Vatu)
            }
                        
        # Default to USD if country not found
        return currency_map.get(country_code, ('USD', '$'))
    
    @staticmethod
    def get_exchange_rate(from_currency='USD'):
        """
        Get exchange rate from USD to a given currency
        Returns a decimal representing the exchange rate
        """
        if from_currency == 'USD':
            return Decimal('1.0')
            
        # Check cache first
        cache_key = f"{CurrencyService.CACHE_KEY_PREFIX}{from_currency}"
        cached_rate = cache.get(cache_key)
        
        if cached_rate is not None:
            return Decimal(str(cached_rate))
            
        try:
            # Fetch from API
            response = requests.get(CurrencyService.EXCHANGE_RATE_API_URL)
            
            if response.status_code == 200:
                data = response.json()
                rates = data.get('rates', {})
                
                if from_currency in rates:
                    rate = Decimal(str(rates[from_currency]))
                    # Cache the result
                    cache.set(cache_key, str(rate), CurrencyService.CACHE_TIMEOUT)
                    return rate
            
            logger.warning(f"Could not get exchange rate for {from_currency}, using 1.0")
            return Decimal('1.0')
        except Exception as e:
            logger.error(f"Error fetching exchange rate: {str(e)}")
            return Decimal('1.0')
    
    @staticmethod
    def convert_to_usd(amount, from_currency):
        """Convert an amount from a currency to USD"""
        if from_currency == 'USD':
            return amount
            
        exchange_rate = CurrencyService.get_exchange_rate(from_currency)
        
        if exchange_rate == 0:
            return amount  # Avoid division by zero
            
        return amount / exchange_rate
    
    @staticmethod
    def convert_from_usd(amount, to_currency):
        """Convert an amount from USD to another currency"""
        if to_currency == 'USD':
            return amount
            
        exchange_rate = CurrencyService.get_exchange_rate(to_currency)
        return amount * exchange_rate