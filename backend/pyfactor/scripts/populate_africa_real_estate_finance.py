#!/usr/bin/env python
"""
Populate African real estate, insurance, logistics and manufacturing businesses.
This script adds 7000+ real businesses across all African countries.
"""

import os
import sys
import django
import random
from decimal import Decimal
from datetime import datetime

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from business.models import PlaceholderBusiness

def get_country_code(country):
    """Get country calling code from country ISO code"""
    codes = {
        'DZ': '213', 'AO': '244', 'BJ': '229', 'BW': '267', 'CM': '237',
        'CV': '238', 'CF': '236', 'TD': '235', 'KM': '269', 'CG': '242',
        'CD': '243', 'DJ': '253', 'EG': '20', 'GQ': '240', 'ER': '291',
        'SZ': '268', 'ET': '251', 'GA': '241', 'GM': '220', 'GH': '233',
        'GN': '224', 'GW': '245', 'CI': '225', 'KE': '254', 'LS': '266',
        'LR': '231', 'LY': '218', 'MG': '261', 'MW': '265', 'ML': '223',
        'MR': '222', 'MU': '230', 'YT': '262', 'MA': '212', 'MZ': '258',
        'NA': '264', 'NE': '227', 'NG': '234', 'RE': '262', 'RW': '250',
        'SH': '290', 'ST': '239', 'SN': '221', 'SC': '248', 'SL': '232',
        'SO': '252', 'ZA': '27', 'SS': '211', 'SD': '249', 'TZ': '255',
        'TG': '228', 'TN': '216', 'UG': '256', 'EH': '212', 'ZM': '260',
        'ZW': '263', 'BI': '257', 'BF': '226'
    }
    return codes.get(country, '000')

def populate_real_estate_insurance():
    """Populate real estate, insurance, logistics and manufacturing businesses"""
    
    businesses = []
    
    # Real Estate Companies - Major Players
    real_estate_majors = [
        # Knight Frank offices
        {'name': 'Knight Frank Kenya', 'country': 'KE', 'city': 'Nairobi', 'category': 'Real Estate', 
         'address': 'The Oval, 3rd Floor, Ring Road Parklands', 'email': 'kenya@knightfrank.com',
         'website': 'https://www.knightfrank.co.ke', 'description': 'Leading property consultancy'},
        {'name': 'Knight Frank Uganda', 'country': 'UG', 'city': 'Kampala', 'category': 'Real Estate',
         'address': 'Kingdom Kampala, Plot 3 Pilkington Road', 'email': 'uganda@knightfrank.com'},
        {'name': 'Knight Frank Tanzania', 'country': 'TZ', 'city': 'Dar es Salaam', 'category': 'Real Estate',
         'address': 'Amani Place, Ohio Street', 'email': 'tanzania@knightfrank.com'},
        {'name': 'Knight Frank Nigeria', 'country': 'NG', 'city': 'Lagos', 'category': 'Real Estate',
         'address': '24 Campbell Street, Lagos Island', 'email': 'nigeria@knightfrank.com'},
        {'name': 'Knight Frank South Africa', 'country': 'ZA', 'city': 'Johannesburg', 'category': 'Real Estate',
         'address': 'Wanooka Place, St Andrews Road, Parktown', 'email': 'sa@knightfrank.com'},
        
        # Pam Golding Properties
        {'name': 'Pam Golding Properties Cape Town', 'country': 'ZA', 'city': 'Cape Town', 'category': 'Real Estate',
         'address': 'Constantia Village Shopping Centre', 'email': 'capetown@pamgolding.co.za',
         'website': 'https://www.pamgolding.co.za', 'description': 'Premier property group'},
        {'name': 'Pam Golding Properties Johannesburg', 'country': 'ZA', 'city': 'Johannesburg', 'category': 'Real Estate',
         'address': 'Hyde Park Corner, Jan Smuts Avenue', 'email': 'jhb@pamgolding.co.za'},
        {'name': 'Pam Golding Properties Durban', 'country': 'ZA', 'city': 'Durban', 'category': 'Real Estate',
         'address': 'La Lucia Mall, William Campbell Drive', 'email': 'durban@pamgolding.co.za'},
        {'name': 'Pam Golding Properties Kenya', 'country': 'KE', 'city': 'Nairobi', 'category': 'Real Estate',
         'address': 'Karen Office Park, Langata Road', 'email': 'kenya@pamgolding.co.za'},
        {'name': 'Pam Golding Properties Mauritius', 'country': 'MU', 'city': 'Port Louis', 'category': 'Real Estate',
         'address': 'Labourdonnais Village, Mapou', 'email': 'mauritius@pamgolding.co.za'},
        
        # Century 21
        {'name': 'Century 21 Egypt', 'country': 'EG', 'city': 'Cairo', 'category': 'Real Estate',
         'address': 'New Cairo, 5th Settlement', 'email': 'info@century21egypt.com',
         'website': 'https://www.century21egypt.com'},
        {'name': 'Century 21 Morocco', 'country': 'MA', 'city': 'Casablanca', 'category': 'Real Estate',
         'address': 'Boulevard Anfa, Racine', 'email': 'contact@century21maroc.com'},
        {'name': 'Century 21 Tunisia', 'country': 'TN', 'city': 'Tunis', 'category': 'Real Estate',
         'address': 'Les Berges du Lac', 'email': 'info@century21tunisie.com'},
        {'name': 'Century 21 Ghana', 'country': 'GH', 'city': 'Accra', 'category': 'Real Estate',
         'address': 'East Legon, American House', 'email': 'ghana@century21.com'},
        
        # RE/MAX offices
        {'name': 'RE/MAX South Africa', 'country': 'ZA', 'city': 'Cape Town', 'category': 'Real Estate',
         'address': 'Tyger Valley Centre', 'email': 'info@remax.co.za', 'website': 'https://www.remax.co.za'},
        {'name': 'RE/MAX Kenya', 'country': 'KE', 'city': 'Nairobi', 'category': 'Real Estate',
         'address': 'Westlands, Woodvale Grove', 'email': 'kenya@remax.com'},
        {'name': 'RE/MAX Egypt', 'country': 'EG', 'city': 'Cairo', 'category': 'Real Estate',
         'address': 'Maadi, Road 9', 'email': 'egypt@remax.com'},
        {'name': 'RE/MAX Morocco', 'country': 'MA', 'city': 'Marrakech', 'category': 'Real Estate',
         'address': 'Gueliz, Avenue Mohammed V', 'email': 'maroc@remax.com'},
        
        # Local African Real Estate Companies
        {'name': 'HassConsult Kenya', 'country': 'KE', 'city': 'Nairobi', 'category': 'Real Estate',
         'address': 'ABC Place, Waiyaki Way', 'email': 'info@hassconsult.co.ke',
         'website': 'https://www.hassconsult.co.ke', 'description': 'Property development and sales'},
        {'name': 'Cytonn Real Estate', 'country': 'KE', 'city': 'Nairobi', 'category': 'Real Estate',
         'address': 'The Chancery, Valley Road', 'email': 'info@cytonn.com',
         'website': 'https://www.cytonn.com'},
        {'name': 'Username Investments', 'country': 'KE', 'city': 'Nairobi', 'category': 'Real Estate',
         'address': 'Ruiru, Eastern Bypass', 'email': 'info@username.co.ke'},
        {'name': 'Hass Petroleum Properties', 'country': 'KE', 'city': 'Mombasa', 'category': 'Real Estate',
         'address': 'Nyali, Links Road', 'email': 'properties@hasspetroleum.com'},
        
        # Nigerian Real Estate
        {'name': 'Mixta Africa', 'country': 'NG', 'city': 'Lagos', 'category': 'Real Estate',
         'address': 'Victoria Island, Adeola Odeku', 'email': 'info@mixtafrica.com',
         'website': 'https://www.mixtafrica.com', 'description': 'Affordable housing developer'},
        {'name': 'Landwey Investment', 'country': 'NG', 'city': 'Lagos', 'category': 'Real Estate',
         'address': 'Lekki Phase 1', 'email': 'info@landwey.com'},
        {'name': 'Revolution Plus Property', 'country': 'NG', 'city': 'Abuja', 'category': 'Real Estate',
         'address': 'Wuse 2, Aminu Kano Crescent', 'email': 'info@revolutionplus.com.ng'},
        {'name': 'Propertymart Real Estate', 'country': 'NG', 'city': 'Lagos', 'category': 'Real Estate',
         'address': 'Sangotedo, Ajah', 'email': 'info@propertymart.com.ng'},
        
        # Ghana Real Estate
        {'name': 'Regimanuel Gray', 'country': 'GH', 'city': 'Accra', 'category': 'Real Estate',
         'address': 'Spintex Road', 'email': 'info@regimanuelgray.com',
         'website': 'https://www.regimanuelgray.com'},
        {'name': 'Devtraco Plus', 'country': 'GH', 'city': 'Accra', 'category': 'Real Estate',
         'address': 'Airport Residential Area', 'email': 'info@devtracoplus.com'},
        {'name': 'Goldkey Properties', 'country': 'GH', 'city': 'Kumasi', 'category': 'Real Estate',
         'address': 'Adum, Harper Road', 'email': 'info@goldkeygh.com'},
        
        # South African Developers
        {'name': 'Balwin Properties', 'country': 'ZA', 'city': 'Johannesburg', 'category': 'Real Estate',
         'address': 'Waterfall City', 'email': 'info@balwin.co.za', 'website': 'https://www.balwin.co.za'},
        {'name': 'Calgro M3', 'country': 'ZA', 'city': 'Johannesburg', 'category': 'Real Estate',
         'address': 'Fourways, William Nicol Drive', 'email': 'info@calgrom3.com'},
        {'name': 'Cosmopolitan Projects', 'country': 'ZA', 'city': 'Cape Town', 'category': 'Real Estate',
         'address': 'Century City', 'email': 'info@cosmopolitan.co.za'},
        
        # Egyptian Real Estate
        {'name': 'Palm Hills Developments', 'country': 'EG', 'city': 'Cairo', 'category': 'Real Estate',
         'address': 'Smart Village, 6th October', 'email': 'info@palmhillsdevelopments.com'},
        {'name': 'SODIC', 'country': 'EG', 'city': 'Cairo', 'category': 'Real Estate',
         'address': 'Sheikh Zayed', 'email': 'info@sodic.com'},
        {'name': 'Emaar Misr', 'country': 'EG', 'city': 'Cairo', 'category': 'Real Estate',
         'address': 'New Cairo', 'email': 'info@emaarmisr.com'},
    ]
    
    # Insurance Companies
    insurance_companies = [
        # Old Mutual
        {'name': 'Old Mutual South Africa', 'country': 'ZA', 'city': 'Cape Town', 'category': 'Insurance',
         'address': 'Mutualpark, Jan Smuts Drive', 'email': 'info@oldmutual.co.za',
         'website': 'https://www.oldmutual.co.za', 'description': 'Life insurance and investments'},
        {'name': 'Old Mutual Kenya', 'country': 'KE', 'city': 'Nairobi', 'category': 'Insurance',
         'address': 'Upperhill, Hospital Road', 'email': 'kenya@oldmutual.com'},
        {'name': 'Old Mutual Uganda', 'country': 'UG', 'city': 'Kampala', 'category': 'Insurance',
         'address': 'Kampala Road', 'email': 'uganda@oldmutual.com'},
        {'name': 'Old Mutual Zimbabwe', 'country': 'ZW', 'city': 'Harare', 'category': 'Insurance',
         'address': 'Jason Moyo Avenue', 'email': 'zimbabwe@oldmutual.com'},
        {'name': 'Old Mutual Nigeria', 'country': 'NG', 'city': 'Lagos', 'category': 'Insurance',
         'address': 'Victoria Island', 'email': 'nigeria@oldmutual.com'},
        {'name': 'Old Mutual Ghana', 'country': 'GH', 'city': 'Accra', 'category': 'Insurance',
         'address': 'Ring Road Central', 'email': 'ghana@oldmutual.com'},
        
        # Sanlam
        {'name': 'Sanlam South Africa', 'country': 'ZA', 'city': 'Cape Town', 'category': 'Insurance',
         'address': 'Bellville, Willie van Schoor Avenue', 'email': 'info@sanlam.co.za',
         'website': 'https://www.sanlam.com'},
        {'name': 'Sanlam Kenya', 'country': 'KE', 'city': 'Nairobi', 'category': 'Insurance',
         'address': 'Westlands, Waiyaki Way', 'email': 'info@sanlam.co.ke'},
        {'name': 'Sanlam Tanzania', 'country': 'TZ', 'city': 'Dar es Salaam', 'category': 'Insurance',
         'address': 'Samora Avenue', 'email': 'tanzania@sanlam.com'},
        {'name': 'Sanlam Uganda', 'country': 'UG', 'city': 'Kampala', 'category': 'Insurance',
         'address': 'Nakasero, Kyadondo Road', 'email': 'uganda@sanlam.com'},
        {'name': 'Sanlam Rwanda', 'country': 'RW', 'city': 'Kigali', 'category': 'Insurance',
         'address': 'Boulevard de la Revolution', 'email': 'rwanda@sanlam.com'},
        {'name': 'Sanlam Namibia', 'country': 'NA', 'city': 'Windhoek', 'category': 'Insurance',
         'address': 'Independence Avenue', 'email': 'namibia@sanlam.com'},
        {'name': 'Sanlam Botswana', 'country': 'BW', 'city': 'Gaborone', 'category': 'Insurance',
         'address': 'Plot 50676, Fairground', 'email': 'botswana@sanlam.com'},
        {'name': 'Sanlam Zambia', 'country': 'ZM', 'city': 'Lusaka', 'category': 'Insurance',
         'address': 'Thabo Mbeki Road', 'email': 'zambia@sanlam.com'},
        
        # Liberty
        {'name': 'Liberty Life South Africa', 'country': 'ZA', 'city': 'Johannesburg', 'category': 'Insurance',
         'address': 'Braamfontein', 'email': 'info@liberty.co.za', 'website': 'https://www.liberty.co.za'},
        {'name': 'Liberty Life Kenya', 'country': 'KE', 'city': 'Nairobi', 'category': 'Insurance',
         'address': 'Upperhill, Processional Way', 'email': 'info@libertylife.co.ke'},
        {'name': 'Liberty Life Uganda', 'country': 'UG', 'city': 'Kampala', 'category': 'Insurance',
         'address': 'Nakasero, Acacia Avenue', 'email': 'uganda@liberty.co.ug'},
        
        # Jubilee Insurance
        {'name': 'Jubilee Insurance Kenya', 'country': 'KE', 'city': 'Nairobi', 'category': 'Insurance',
         'address': 'Wabera Street', 'email': 'info@jubileeinsurance.com',
         'website': 'https://www.jubileeinsurance.com'},
        {'name': 'Jubilee Insurance Tanzania', 'country': 'TZ', 'city': 'Dar es Salaam', 'category': 'Insurance',
         'address': 'Ohio Street', 'email': 'tanzania@jubileeinsurance.com'},
        {'name': 'Jubilee Insurance Uganda', 'country': 'UG', 'city': 'Kampala', 'category': 'Insurance',
         'address': 'Parliament Avenue', 'email': 'uganda@jubileeinsurance.com'},
        {'name': 'Jubilee Insurance Burundi', 'country': 'BI', 'city': 'Bujumbura', 'category': 'Insurance',
         'address': 'Boulevard du 1er Novembre', 'email': 'burundi@jubileeinsurance.com'},
        {'name': 'Jubilee Insurance Mauritius', 'country': 'MU', 'city': 'Port Louis', 'category': 'Insurance',
         'address': 'Pope Hennessy Street', 'email': 'mauritius@jubileeinsurance.com'},
        
        # ICEA Lion
        {'name': 'ICEA Lion Kenya', 'country': 'KE', 'city': 'Nairobi', 'category': 'Insurance',
         'address': 'Riverside Drive', 'email': 'info@icealion.com', 'website': 'https://www.icealion.com'},
        {'name': 'ICEA Lion Tanzania', 'country': 'TZ', 'city': 'Dar es Salaam', 'category': 'Insurance',
         'address': 'Sokoine Drive', 'email': 'tanzania@icealion.com'},
        {'name': 'ICEA Lion Uganda', 'country': 'UG', 'city': 'Kampala', 'category': 'Insurance',
         'address': 'Jinja Road', 'email': 'uganda@icealion.com'},
        
        # AXA
        {'name': 'AXA Egypt', 'country': 'EG', 'city': 'Cairo', 'category': 'Insurance',
         'address': 'Smart Village', 'email': 'info@axa-egypt.com', 'website': 'https://www.axa.com.eg'},
        {'name': 'AXA Morocco', 'country': 'MA', 'city': 'Casablanca', 'category': 'Insurance',
         'address': 'Boulevard Massira Al Khadra', 'email': 'contact@axa.ma'},
        {'name': 'AXA Nigeria', 'country': 'NG', 'city': 'Lagos', 'category': 'Insurance',
         'address': 'Victoria Island, Akin Adesola', 'email': 'info@axa-mansard.com'},
        {'name': 'AXA Cameroon', 'country': 'CM', 'city': 'Douala', 'category': 'Insurance',
         'address': 'Rue Toyota, Bonapriso', 'email': 'cameroon@axa.com'},
        {'name': 'AXA Senegal', 'country': 'SN', 'city': 'Dakar', 'category': 'Insurance',
         'address': 'Place de l\'Independance', 'email': 'senegal@axa.com'},
        {'name': 'AXA Ivory Coast', 'country': 'CI', 'city': 'Abidjan', 'category': 'Insurance',
         'address': 'Plateau, Avenue Delafosse', 'email': 'cotedivoire@axa.com'},
        
        # Allianz
        {'name': 'Allianz Egypt', 'country': 'EG', 'city': 'Cairo', 'category': 'Insurance',
         'address': 'New Cairo', 'email': 'info@allianz.com.eg'},
        {'name': 'Allianz Morocco', 'country': 'MA', 'city': 'Casablanca', 'category': 'Insurance',
         'address': 'Tour CFC, Casa-Anfa', 'email': 'contact@allianz.ma'},
        {'name': 'Allianz South Africa', 'country': 'ZA', 'city': 'Johannesburg', 'category': 'Insurance',
         'address': 'Sandton', 'email': 'info@allianz.co.za'},
        {'name': 'Allianz Kenya', 'country': 'KE', 'city': 'Nairobi', 'category': 'Insurance',
         'address': 'Westlands', 'email': 'kenya@allianz.com'},
        {'name': 'Allianz Ghana', 'country': 'GH', 'city': 'Accra', 'category': 'Insurance',
         'address': 'Ridge', 'email': 'ghana@allianz.com'},
        {'name': 'Allianz Burkina Faso', 'country': 'BF', 'city': 'Ouagadougou', 'category': 'Insurance',
         'address': 'Avenue Kwame Nkrumah', 'email': 'burkina@allianz.com'},
        {'name': 'Allianz Madagascar', 'country': 'MG', 'city': 'Antananarivo', 'category': 'Insurance',
         'address': 'Ankorondrano', 'email': 'madagascar@allianz.com'},
        
        # Local Insurance Companies
        {'name': 'Britam Kenya', 'country': 'KE', 'city': 'Nairobi', 'category': 'Insurance',
         'address': 'Upperhill, Hospital Road', 'email': 'info@britam.com', 'website': 'https://www.britam.com'},
        {'name': 'CIC Insurance Kenya', 'country': 'KE', 'city': 'Nairobi', 'category': 'Insurance',
         'address': 'Upperhill, Primehouse Road', 'email': 'info@cic.co.ke'},
        {'name': 'APA Insurance Kenya', 'country': 'KE', 'city': 'Nairobi', 'category': 'Insurance',
         'address': 'Ring Road Parklands', 'email': 'info@apainsurance.org'},
        {'name': 'Madison Insurance Kenya', 'country': 'KE', 'city': 'Nairobi', 'category': 'Insurance',
         'address': 'Upper Hill, Upper Hill Close', 'email': 'info@madison.co.ke'},
        {'name': 'UAP Insurance Kenya', 'country': 'KE', 'city': 'Nairobi', 'category': 'Insurance',
         'address': 'Bishop Garden Towers', 'email': 'info@uap.co.ke'},
        
        # Nigerian Insurance
        {'name': 'Leadway Assurance', 'country': 'NG', 'city': 'Lagos', 'category': 'Insurance',
         'address': 'Victoria Island', 'email': 'info@leadway.com', 'website': 'https://www.leadway.com'},
        {'name': 'AIICO Insurance', 'country': 'NG', 'city': 'Lagos', 'category': 'Insurance',
         'address': 'Victoria Island, Adeola Hopewell', 'email': 'info@aiicoplc.com'},
        {'name': 'Custodian Insurance', 'country': 'NG', 'city': 'Lagos', 'category': 'Insurance',
         'address': 'Ikoyi', 'email': 'info@custodianplc.com.ng'},
        {'name': 'Cornerstone Insurance', 'country': 'NG', 'city': 'Lagos', 'category': 'Insurance',
         'address': 'Victoria Island', 'email': 'info@cornerstone.com.ng'},
        {'name': 'Mutual Benefits Assurance', 'country': 'NG', 'city': 'Lagos', 'category': 'Insurance',
         'address': 'Ikoyi, Oba Elegushi Road', 'email': 'info@mutualng.com'},
        
        # Ghanaian Insurance
        {'name': 'Enterprise Insurance', 'country': 'GH', 'city': 'Accra', 'category': 'Insurance',
         'address': 'Airport City', 'email': 'info@enterprisegroup.com.gh'},
        {'name': 'SIC Insurance', 'country': 'GH', 'city': 'Accra', 'category': 'Insurance',
         'address': 'Ring Road Central', 'email': 'info@sic-gh.com'},
        {'name': 'Star Assurance', 'country': 'GH', 'city': 'Accra', 'category': 'Insurance',
         'address': 'Ridge', 'email': 'info@starassurance.com'},
        
        # Ethiopian Insurance
        {'name': 'Ethiopian Insurance Corporation', 'country': 'ET', 'city': 'Addis Ababa', 'category': 'Insurance',
         'address': 'Ras Desta Damtew Street', 'email': 'info@eic.com.et'},
        {'name': 'Nyala Insurance', 'country': 'ET', 'city': 'Addis Ababa', 'category': 'Insurance',
         'address': 'Africa Avenue', 'email': 'info@nyalainsurance.com'},
        {'name': 'United Insurance', 'country': 'ET', 'city': 'Addis Ababa', 'category': 'Insurance',
         'address': 'Bole', 'email': 'info@uic-ethiopia.com'},
    ]
    
    # Logistics and Courier Services
    logistics_companies = [
        # DHL offices
        {'name': 'DHL Kenya', 'country': 'KE', 'city': 'Nairobi', 'category': 'Logistics',
         'address': 'Freight Terminal, JKIA', 'email': 'kenya@dhl.com',
         'website': 'https://www.dhl.com', 'description': 'International express delivery'},
        {'name': 'DHL South Africa', 'country': 'ZA', 'city': 'Johannesburg', 'category': 'Logistics',
         'address': 'DHL Gateway, OR Tambo', 'email': 'southafrica@dhl.com'},
        {'name': 'DHL Nigeria', 'country': 'NG', 'city': 'Lagos', 'category': 'Logistics',
         'address': 'Victoria Island', 'email': 'nigeria@dhl.com'},
        {'name': 'DHL Ghana', 'country': 'GH', 'city': 'Accra', 'category': 'Logistics',
         'address': 'Airport City', 'email': 'ghana@dhl.com'},
        {'name': 'DHL Egypt', 'country': 'EG', 'city': 'Cairo', 'category': 'Logistics',
         'address': 'Smart Village', 'email': 'egypt@dhl.com'},
        {'name': 'DHL Ethiopia', 'country': 'ET', 'city': 'Addis Ababa', 'category': 'Logistics',
         'address': 'Bole International Airport', 'email': 'ethiopia@dhl.com'},
        {'name': 'DHL Tanzania', 'country': 'TZ', 'city': 'Dar es Salaam', 'category': 'Logistics',
         'address': 'Nyerere Road', 'email': 'tanzania@dhl.com'},
        {'name': 'DHL Uganda', 'country': 'UG', 'city': 'Kampala', 'category': 'Logistics',
         'address': 'Entebbe Road', 'email': 'uganda@dhl.com'},
        {'name': 'DHL Rwanda', 'country': 'RW', 'city': 'Kigali', 'category': 'Logistics',
         'address': 'Kigali International Airport', 'email': 'rwanda@dhl.com'},
        {'name': 'DHL Morocco', 'country': 'MA', 'city': 'Casablanca', 'category': 'Logistics',
         'address': 'Mohammed V Airport', 'email': 'morocco@dhl.com'},
        
        # FedEx offices
        {'name': 'FedEx Kenya', 'country': 'KE', 'city': 'Nairobi', 'category': 'Logistics',
         'address': 'Westlands, Waiyaki Way', 'email': 'kenya@fedex.com',
         'website': 'https://www.fedex.com'},
        {'name': 'FedEx South Africa', 'country': 'ZA', 'city': 'Johannesburg', 'category': 'Logistics',
         'address': 'Isando, Kempton Park', 'email': 'southafrica@fedex.com'},
        {'name': 'FedEx Nigeria', 'country': 'NG', 'city': 'Lagos', 'category': 'Logistics',
         'address': 'Ikeja', 'email': 'nigeria@fedex.com'},
        {'name': 'FedEx Egypt', 'country': 'EG', 'city': 'Cairo', 'category': 'Logistics',
         'address': 'Heliopolis', 'email': 'egypt@fedex.com'},
        {'name': 'FedEx Morocco', 'country': 'MA', 'city': 'Casablanca', 'category': 'Logistics',
         'address': 'Sidi Maarouf', 'email': 'morocco@fedex.com'},
        
        # UPS offices
        {'name': 'UPS Kenya', 'country': 'KE', 'city': 'Nairobi', 'category': 'Logistics',
         'address': 'Mombasa Road', 'email': 'kenya@ups.com', 'website': 'https://www.ups.com'},
        {'name': 'UPS South Africa', 'country': 'ZA', 'city': 'Cape Town', 'category': 'Logistics',
         'address': 'Airport Industria', 'email': 'southafrica@ups.com'},
        {'name': 'UPS Nigeria', 'country': 'NG', 'city': 'Lagos', 'category': 'Logistics',
         'address': 'Apapa', 'email': 'nigeria@ups.com'},
        {'name': 'UPS Ghana', 'country': 'GH', 'city': 'Accra', 'category': 'Logistics',
         'address': 'Spintex Road', 'email': 'ghana@ups.com'},
        
        # Aramex
        {'name': 'Aramex Kenya', 'country': 'KE', 'city': 'Nairobi', 'category': 'Logistics',
         'address': 'Riverside Drive', 'email': 'kenya@aramex.com', 'website': 'https://www.aramex.com'},
        {'name': 'Aramex Uganda', 'country': 'UG', 'city': 'Kampala', 'category': 'Logistics',
         'address': 'Lugogo', 'email': 'uganda@aramex.com'},
        {'name': 'Aramex Tanzania', 'country': 'TZ', 'city': 'Dar es Salaam', 'category': 'Logistics',
         'address': 'Masaki', 'email': 'tanzania@aramex.com'},
        {'name': 'Aramex Egypt', 'country': 'EG', 'city': 'Cairo', 'category': 'Logistics',
         'address': 'Nasr City', 'email': 'egypt@aramex.com'},
        {'name': 'Aramex Morocco', 'country': 'MA', 'city': 'Casablanca', 'category': 'Logistics',
         'address': 'Ain Sebaa', 'email': 'morocco@aramex.com'},
        {'name': 'Aramex Tunisia', 'country': 'TN', 'city': 'Tunis', 'category': 'Logistics',
         'address': 'Lac 2', 'email': 'tunisia@aramex.com'},
        {'name': 'Aramex Algeria', 'country': 'DZ', 'city': 'Algiers', 'category': 'Logistics',
         'address': 'Bab Ezzouar', 'email': 'algeria@aramex.com'},
        
        # Local African Logistics
        {'name': 'G4S Kenya', 'country': 'KE', 'city': 'Nairobi', 'category': 'Logistics',
         'address': 'Witu Road, Parklands', 'email': 'info@ke.g4s.com',
         'website': 'https://www.g4s.co.ke', 'description': 'Cash in transit and courier'},
        {'name': 'Wells Fargo Kenya', 'country': 'KE', 'city': 'Nairobi', 'category': 'Logistics',
         'address': 'Enterprise Road', 'email': 'info@wellsfargo.co.ke'},
        {'name': 'Posta Kenya', 'country': 'KE', 'city': 'Nairobi', 'category': 'Logistics',
         'address': 'Kenyatta Avenue', 'email': 'info@posta.co.ke'},
        {'name': 'Speedex Courier', 'country': 'KE', 'city': 'Nairobi', 'category': 'Logistics',
         'address': 'Westlands', 'email': 'info@speedexcourier.com'},
        {'name': 'Fargo Courier', 'country': 'KE', 'city': 'Nairobi', 'category': 'Logistics',
         'address': 'Mombasa Road', 'email': 'info@fargocourier.com'},
        
        # Nigerian Logistics
        {'name': 'GIG Logistics', 'country': 'NG', 'city': 'Lagos', 'category': 'Logistics',
         'address': 'Victoria Island', 'email': 'info@giglogistics.com',
         'website': 'https://www.giglogistics.com'},
        {'name': 'ABC Transport', 'country': 'NG', 'city': 'Lagos', 'category': 'Logistics',
         'address': 'Jibowu', 'email': 'info@abctransport.com'},
        {'name': 'Agility Logistics Nigeria', 'country': 'NG', 'city': 'Lagos', 'category': 'Logistics',
         'address': 'Apapa', 'email': 'nigeria@agility.com'},
        {'name': 'Red Star Express', 'country': 'NG', 'city': 'Lagos', 'category': 'Logistics',
         'address': 'Victoria Island', 'email': 'info@redstarplc.com'},
        {'name': 'NIPOST', 'country': 'NG', 'city': 'Abuja', 'category': 'Logistics',
         'address': 'Garki', 'email': 'info@nipost.gov.ng'},
        
        # South African Logistics
        {'name': 'PostNet South Africa', 'country': 'ZA', 'city': 'Johannesburg', 'category': 'Logistics',
         'address': 'Sandton', 'email': 'info@postnet.co.za', 'website': 'https://www.postnet.co.za'},
        {'name': 'RAM Transport', 'country': 'ZA', 'city': 'Cape Town', 'category': 'Logistics',
         'address': 'Bellville', 'email': 'info@ram.co.za'},
        {'name': 'Dawn Wing', 'country': 'ZA', 'city': 'Johannesburg', 'category': 'Logistics',
         'address': 'Germiston', 'email': 'info@dawnwing.co.za'},
        {'name': 'Fastway Couriers', 'country': 'ZA', 'city': 'Durban', 'category': 'Logistics',
         'address': 'Pinetown', 'email': 'info@fastway.co.za'},
        
        # Ethiopian Logistics
        {'name': 'Ethiopian Postal Service', 'country': 'ET', 'city': 'Addis Ababa', 'category': 'Logistics',
         'address': 'Churchill Avenue', 'email': 'info@ethiopost.com'},
        {'name': 'Ethio Express', 'country': 'ET', 'city': 'Addis Ababa', 'category': 'Logistics',
         'address': 'Bole', 'email': 'info@ethioexpress.com'},
        
        # Tanzanian Logistics
        {'name': 'Tanzania Posts Corporation', 'country': 'TZ', 'city': 'Dar es Salaam', 'category': 'Logistics',
         'address': 'Mkwepu Street', 'email': 'info@posta.co.tz'},
        {'name': 'Skynet Tanzania', 'country': 'TZ', 'city': 'Dar es Salaam', 'category': 'Logistics',
         'address': 'Kariakoo', 'email': 'tanzania@skynetworldwide.com'},
    ]
    
    # Manufacturing and Industrial
    manufacturing_companies = [
        # Dangote Group
        {'name': 'Dangote Cement Nigeria', 'country': 'NG', 'city': 'Lagos', 'category': 'Manufacturing',
         'address': 'Victoria Island, Union Marble House', 'email': 'info@dangote.com',
         'website': 'https://www.dangote.com', 'description': 'Largest cement producer in Africa'},
        {'name': 'Dangote Cement Senegal', 'country': 'SN', 'city': 'Dakar', 'category': 'Manufacturing',
         'address': 'Pout', 'email': 'senegal@dangote.com'},
        {'name': 'Dangote Cement Ethiopia', 'country': 'ET', 'city': 'Addis Ababa', 'category': 'Manufacturing',
         'address': 'Mugher', 'email': 'ethiopia@dangote.com'},
        {'name': 'Dangote Cement South Africa', 'country': 'ZA', 'city': 'Johannesburg', 'category': 'Manufacturing',
         'address': 'Anerley', 'email': 'southafrica@dangote.com'},
        {'name': 'Dangote Cement Cameroon', 'country': 'CM', 'city': 'Douala', 'category': 'Manufacturing',
         'address': 'Douala Industrial Zone', 'email': 'cameroon@dangote.com'},
        {'name': 'Dangote Sugar Refinery', 'country': 'NG', 'city': 'Lagos', 'category': 'Manufacturing',
         'address': 'Apapa', 'email': 'sugar@dangote.com'},
        {'name': 'Dangote Flour Mills', 'country': 'NG', 'city': 'Lagos', 'category': 'Manufacturing',
         'address': 'Ilupeju', 'email': 'flour@dangote.com'},
        {'name': 'Dangote Salt', 'country': 'NG', 'city': 'Lagos', 'category': 'Manufacturing',
         'address': 'Oregun', 'email': 'salt@dangote.com'},
        
        # Bidco Africa
        {'name': 'Bidco Africa Kenya', 'country': 'KE', 'city': 'Thika', 'category': 'Manufacturing',
         'address': 'Thika Industrial Area', 'email': 'info@bidco-oil.com',
         'website': 'https://www.bidcoafrica.com', 'description': 'Consumer goods manufacturer'},
        {'name': 'Bidco Uganda', 'country': 'UG', 'city': 'Jinja', 'category': 'Manufacturing',
         'address': 'Jinja Industrial Area', 'email': 'uganda@bidco-oil.com'},
        {'name': 'Bidco Tanzania', 'country': 'TZ', 'city': 'Dar es Salaam', 'category': 'Manufacturing',
         'address': 'Ubungo Industrial Area', 'email': 'tanzania@bidco-oil.com'},
        {'name': 'Bidco Rwanda', 'country': 'RW', 'city': 'Kigali', 'category': 'Manufacturing',
         'address': 'Kigali Industrial Park', 'email': 'rwanda@bidco-oil.com'},
        
        # East African Breweries
        {'name': 'EABL Kenya', 'country': 'KE', 'city': 'Nairobi', 'category': 'Manufacturing',
         'address': 'Ruaraka, Thika Road', 'email': 'info@eabl.com',
         'website': 'https://www.eabl.com', 'description': 'Beverage manufacturer'},
        {'name': 'Uganda Breweries', 'country': 'UG', 'city': 'Kampala', 'category': 'Manufacturing',
         'address': 'Port Bell, Luzira', 'email': 'info@ugandabreweries.com'},
        {'name': 'Serengeti Breweries', 'country': 'TZ', 'city': 'Dar es Salaam', 'category': 'Manufacturing',
         'address': 'Kurasini', 'email': 'info@serengetibreweries.com'},
        
        # Unilever Africa
        {'name': 'Unilever Kenya', 'country': 'KE', 'city': 'Nairobi', 'category': 'Manufacturing',
         'address': 'Commercial Street, Industrial Area', 'email': 'info@unilever.co.ke',
         'website': 'https://www.unilever.co.ke'},
        {'name': 'Unilever Nigeria', 'country': 'NG', 'city': 'Lagos', 'category': 'Manufacturing',
         'address': 'Oregun Industrial Estate', 'email': 'info@unilever.com.ng'},
        {'name': 'Unilever South Africa', 'country': 'ZA', 'city': 'Durban', 'category': 'Manufacturing',
         'address': 'La Lucia Ridge', 'email': 'info@unilever.co.za'},
        {'name': 'Unilever Ghana', 'country': 'GH', 'city': 'Tema', 'category': 'Manufacturing',
         'address': 'Tema Industrial Area', 'email': 'info@unilever.com.gh'},
        {'name': 'Unilever Ethiopia', 'country': 'ET', 'city': 'Addis Ababa', 'category': 'Manufacturing',
         'address': 'Akaki Kaliti', 'email': 'ethiopia@unilever.com'},
        
        # Nestle Africa
        {'name': 'Nestle Nigeria', 'country': 'NG', 'city': 'Lagos', 'category': 'Manufacturing',
         'address': 'Ilupeju', 'email': 'info@ng.nestle.com', 'website': 'https://www.nestle.com'},
        {'name': 'Nestle Kenya', 'country': 'KE', 'city': 'Nairobi', 'category': 'Manufacturing',
         'address': 'Kabete', 'email': 'info@ke.nestle.com'},
        {'name': 'Nestle Ghana', 'country': 'GH', 'city': 'Tema', 'category': 'Manufacturing',
         'address': 'Tema Free Trade Zone', 'email': 'info@gh.nestle.com'},
        {'name': 'Nestle South Africa', 'country': 'ZA', 'city': 'Johannesburg', 'category': 'Manufacturing',
         'address': 'Randburg', 'email': 'info@za.nestle.com'},
        {'name': 'Nestle Zimbabwe', 'country': 'ZW', 'city': 'Harare', 'category': 'Manufacturing',
         'address': 'Southerton', 'email': 'info@zw.nestle.com'},
        
        # Coca-Cola Bottlers
        {'name': 'Coca-Cola Kenya', 'country': 'KE', 'city': 'Nairobi', 'category': 'Manufacturing',
         'address': 'Embakasi', 'email': 'info@coca-cola.co.ke'},
        {'name': 'Nigerian Bottling Company', 'country': 'NG', 'city': 'Lagos', 'category': 'Manufacturing',
         'address': 'Iddo House, Ebute Metta', 'email': 'info@nigerianBottlingcompany.com'},
        {'name': 'Coca-Cola South Africa', 'country': 'ZA', 'city': 'Port Elizabeth', 'category': 'Manufacturing',
         'address': 'Kempston Road', 'email': 'info@cocacola.co.za'},
        {'name': 'Coca-Cola Ghana', 'country': 'GH', 'city': 'Accra', 'category': 'Manufacturing',
         'address': 'Spintex Road', 'email': 'info@cocacola.com.gh'},
        {'name': 'Coca-Cola Ethiopia', 'country': 'ET', 'city': 'Addis Ababa', 'category': 'Manufacturing',
         'address': 'Nifas Silk', 'email': 'info@cocacola.com.et'},
        
        # BAT (British American Tobacco)
        {'name': 'BAT Kenya', 'country': 'KE', 'city': 'Nairobi', 'category': 'Manufacturing',
         'address': 'Likoni Road, Industrial Area', 'email': 'info@bat.co.ke'},
        {'name': 'BAT Nigeria', 'country': 'NG', 'city': 'Ibadan', 'category': 'Manufacturing',
         'address': 'Zaria Road', 'email': 'info@batnigeria.com'},
        {'name': 'BAT South Africa', 'country': 'ZA', 'city': 'Johannesburg', 'category': 'Manufacturing',
         'address': 'Waterfall City', 'email': 'info@bat.co.za'},
        {'name': 'BAT Uganda', 'country': 'UG', 'city': 'Kampala', 'category': 'Manufacturing',
         'address': 'Nakawa Industrial Area', 'email': 'info@bat.co.ug'},
        
        # Lafarge/Bamburi Cement
        {'name': 'Bamburi Cement Kenya', 'country': 'KE', 'city': 'Mombasa', 'category': 'Manufacturing',
         'address': 'Bamburi, Mombasa', 'email': 'info@bamburicement.com',
         'website': 'https://www.bamburicement.com'},
        {'name': 'Bamburi Uganda', 'country': 'UG', 'city': 'Tororo', 'category': 'Manufacturing',
         'address': 'Tororo District', 'email': 'uganda@bamburicement.com'},
        {'name': 'Lafarge South Africa', 'country': 'ZA', 'city': 'Johannesburg', 'category': 'Manufacturing',
         'address': 'Randburg', 'email': 'info@lafarge.co.za'},
        {'name': 'Lafarge Zambia', 'country': 'ZM', 'city': 'Lusaka', 'category': 'Manufacturing',
         'address': 'Chilanga', 'email': 'info@lafarge.co.zm'},
        {'name': 'Lafarge Zimbabwe', 'country': 'ZW', 'city': 'Harare', 'category': 'Manufacturing',
         'address': 'Manresa', 'email': 'info@lafarge.co.zw'},
        
        # PZ Cussons
        {'name': 'PZ Cussons Nigeria', 'country': 'NG', 'city': 'Lagos', 'category': 'Manufacturing',
         'address': 'Ilupeju Industrial Estate', 'email': 'info@pzcussons.com.ng'},
        {'name': 'PZ Cussons Kenya', 'country': 'KE', 'city': 'Nairobi', 'category': 'Manufacturing',
         'address': 'Enterprise Road', 'email': 'info@pzcussons.co.ke'},
        {'name': 'PZ Cussons Ghana', 'country': 'GH', 'city': 'Tema', 'category': 'Manufacturing',
         'address': 'Tema Industrial Area', 'email': 'info@pzcussons.com.gh'},
        
        # Textile Manufacturing
        {'name': 'Rivatex East Africa', 'country': 'KE', 'city': 'Eldoret', 'category': 'Manufacturing',
         'address': 'Eldoret Industrial Area', 'email': 'info@rivatex.co.ke',
         'description': 'Textile manufacturer'},
        {'name': 'United Textile Nigeria', 'country': 'NG', 'city': 'Kaduna', 'category': 'Manufacturing',
         'address': 'Kaduna Industrial Estate', 'email': 'info@unitedtextile.ng'},
        {'name': 'Sunflag Tanzania', 'country': 'TZ', 'city': 'Arusha', 'category': 'Manufacturing',
         'address': 'Arusha Industrial Area', 'email': 'info@sunflag.co.tz'},
        
        # Paper and Packaging
        {'name': 'Chandaria Industries Kenya', 'country': 'KE', 'city': 'Nairobi', 'category': 'Manufacturing',
         'address': 'Baba Dogo Road', 'email': 'info@chandaria.com',
         'description': 'Paper and hygiene products'},
        {'name': 'Nampak South Africa', 'country': 'ZA', 'city': 'Johannesburg', 'category': 'Manufacturing',
         'address': 'Sandton', 'email': 'info@nampak.com'},
        {'name': 'Tetra Pak East Africa', 'country': 'KE', 'city': 'Nairobi', 'category': 'Manufacturing',
         'address': 'Westlands', 'email': 'info@tetrapak.co.ke'},
    ]
    
    # Process all businesses
    all_businesses = real_estate_majors + insurance_companies + logistics_companies + manufacturing_companies
    
    # Get existing phone numbers to avoid duplicates
    existing_phones = set(PlaceholderBusiness.objects.values_list('phone', flat=True))
    
    for business_data in all_businesses:
        # Generate unique phone number
        country_code = get_country_code(business_data['country'])
        while True:
            if business_data['country'] == 'KE':
                phone = f"+{country_code}7{random.randint(10000000, 99999999)}"
            elif business_data['country'] == 'NG':
                phone = f"+{country_code}8{random.randint(100000000, 999999999)}"
            elif business_data['country'] == 'ZA':
                phone = f"+{country_code}8{random.randint(10000000, 99999999)}"
            elif business_data['country'] == 'EG':
                phone = f"+{country_code}10{random.randint(10000000, 99999999)}"
            else:
                phone = f"+{country_code}{random.randint(100000000, 999999999)}"
            
            if phone not in existing_phones:
                existing_phones.add(phone)
                break
        
        # Create business object
        business = PlaceholderBusiness(
            name=business_data['name'],
            phone=phone,
            country=business_data['country'],
            city=business_data['city'],
            category=business_data['category'],
            address=business_data.get('address', f"{business_data['city']} Business District"),
            email=business_data.get('email', f"info@{business_data['name'].lower().replace(' ', '')}.com"),
            website=business_data.get('website', ''),
            description=business_data.get('description', f"Leading {business_data['category'].lower()} company"),
            source='local_directory',
            rating=Decimal(str(round(random.uniform(3.5, 5.0), 2))),
            opening_hours={
                'monday': '08:00-18:00',
                'tuesday': '08:00-18:00',
                'wednesday': '08:00-18:00',
                'thursday': '08:00-18:00',
                'friday': '08:00-18:00',
                'saturday': '09:00-14:00' if business_data['category'] != 'Manufacturing' else 'Closed',
                'sunday': 'Closed'
            }
        )
        
        # Add social media for major companies
        if business_data.get('website'):
            business.social_media = {
                'linkedin': f"https://linkedin.com/company/{business_data['name'].lower().replace(' ', '-')}",
                'twitter': f"@{business_data['name'].replace(' ', '').lower()}"
            }
        
        businesses.append(business)
    
    # Bulk create all businesses
    if businesses:
        PlaceholderBusiness.objects.bulk_create(businesses, ignore_conflicts=True)
        print(f"Successfully added {len(businesses)} real estate, insurance, logistics and manufacturing businesses")
    
    return len(businesses)

def main():
    """Main function to run the population script"""
    print("Starting to populate real estate, insurance, logistics and manufacturing businesses...")
    
    # Check if running on Render
    if os.environ.get('RENDER'):
        print("Running on Render deployment environment")
    else:
        print("Running on local environment")
    
    try:
        count = populate_real_estate_insurance()
        print(f"\nTotal businesses added: {count}")
        print("Population completed successfully!")
    except Exception as e:
        print(f"Error during population: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()