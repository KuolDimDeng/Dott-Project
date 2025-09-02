#!/usr/bin/env python
"""
Populate African automotive, agriculture, beauty, hospitality, construction and electronics businesses.
Final push to reach 25,000+ businesses in database.
"""

import os
import sys
import django
import random
from decimal import Decimal
from datetime import datetime
from collections import defaultdict

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from business.models import PlaceholderBusiness
from django.db.models import Count

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

def get_country_name(code):
    """Get country name from ISO code"""
    countries = {
        'DZ': 'Algeria', 'AO': 'Angola', 'BJ': 'Benin', 'BW': 'Botswana', 
        'CM': 'Cameroon', 'CV': 'Cape Verde', 'CF': 'Central African Republic',
        'TD': 'Chad', 'KM': 'Comoros', 'CG': 'Congo', 'CD': 'DRC',
        'DJ': 'Djibouti', 'EG': 'Egypt', 'GQ': 'Equatorial Guinea',
        'ER': 'Eritrea', 'SZ': 'Eswatini', 'ET': 'Ethiopia', 'GA': 'Gabon',
        'GM': 'Gambia', 'GH': 'Ghana', 'GN': 'Guinea', 'GW': 'Guinea-Bissau',
        'CI': 'Ivory Coast', 'KE': 'Kenya', 'LS': 'Lesotho', 'LR': 'Liberia',
        'LY': 'Libya', 'MG': 'Madagascar', 'MW': 'Malawi', 'ML': 'Mali',
        'MR': 'Mauritania', 'MU': 'Mauritius', 'YT': 'Mayotte', 'MA': 'Morocco',
        'MZ': 'Mozambique', 'NA': 'Namibia', 'NE': 'Niger', 'NG': 'Nigeria',
        'RE': 'Réunion', 'RW': 'Rwanda', 'SH': 'Saint Helena', 'ST': 'São Tomé',
        'SN': 'Senegal', 'SC': 'Seychelles', 'SL': 'Sierra Leone', 'SO': 'Somalia',
        'ZA': 'South Africa', 'SS': 'South Sudan', 'SD': 'Sudan', 'TZ': 'Tanzania',
        'TG': 'Togo', 'TN': 'Tunisia', 'UG': 'Uganda', 'EH': 'Western Sahara',
        'ZM': 'Zambia', 'ZW': 'Zimbabwe', 'BI': 'Burundi', 'BF': 'Burkina Faso'
    }
    return countries.get(code, code)

def generate_businesses_for_all_countries():
    """Generate businesses ensuring all 54 countries have representation"""
    
    businesses = []
    stats = defaultdict(int)
    
    # Define business templates for different categories
    business_templates = {
        'Automotive': [
            'Toyota', 'Nissan', 'Mercedes-Benz', 'BMW', 'Ford', 'Volkswagen', 
            'Hyundai', 'Kia', 'Peugeot', 'Renault', 'Mitsubishi', 'Suzuki',
            'Honda', 'Mazda', 'Isuzu', 'Auto Repair', 'Car Service', 'Auto Parts',
            'Car Rental', 'Taxi Service', 'Bus Company', 'Motorcycle Dealer'
        ],
        'Agriculture': [
            'Farm Cooperative', 'Agricultural Equipment', 'Seed Company', 'Fertilizer Supplier',
            'Livestock Farm', 'Poultry Farm', 'Fish Farm', 'Coffee Plantation', 'Tea Estate',
            'Cotton Farm', 'Maize Farm', 'Rice Mill', 'Dairy Farm', 'Vegetable Farm',
            'Fruit Orchard', 'Agricultural Export', 'Tractor Dealer', 'Irrigation Systems'
        ],
        'Beauty & Wellness': [
            'Beauty Salon', 'Hair Salon', 'Spa', 'Barber Shop', 'Nail Salon',
            'Massage Center', 'Wellness Clinic', 'Cosmetics Store', 'Beauty Supply',
            'Hair Products', 'Skin Care Center', 'Fitness Studio', 'Yoga Center',
            'Natural Hair Salon', 'Men\'s Grooming', 'Beauty Academy'
        ],
        'Hospitality': [
            'Hotel', 'Guest House', 'Lodge', 'Resort', 'Bed & Breakfast',
            'Hostel', 'Motel', 'Inn', 'Safari Lodge', 'Beach Resort',
            'Mountain Lodge', 'City Hotel', 'Business Hotel', 'Boutique Hotel',
            'Eco Lodge', 'Tourist Camp', 'Villa Rentals', 'Apartment Hotel'
        ],
        'Construction': [
            'Building Materials', 'Hardware Store', 'Paint Shop', 'Plumbing Supplies',
            'Electrical Supplies', 'Cement Dealer', 'Roofing Materials', 'Tiles & Flooring',
            'Construction Equipment', 'Glass & Aluminum', 'Steel Supplier', 'Timber Yard',
            'Brick Manufacturer', 'Sand & Stone', 'Interior Design', 'Home Improvement'
        ],
        'Electronics': [
            'Computer Store', 'Mobile Phone Shop', 'Electronics Repair', 'Internet Cafe',
            'Phone Accessories', 'Computer Training', 'Laptop Sales', 'TV & Audio',
            'Gaming Center', 'Phone Repair', 'Computer Service', 'Printer Sales',
            'Camera Shop', 'Electronic Parts', 'Tech Support', 'Software Solutions'
        ],
        'Printing & Media': [
            'Printing Press', 'Digital Printing', 'Advertising Agency', 'Photography Studio',
            'Graphic Design', 'Sign Makers', 'Publishing House', 'Media Production',
            'Web Design', 'Marketing Agency', 'Brand Design', 'Event Management',
            'Video Production', 'Radio Station', 'Recording Studio', 'Billboard Advertising'
        ]
    }
    
    # Major cities for each country
    country_cities = {
        'DZ': ['Algiers', 'Oran', 'Constantine', 'Annaba', 'Blida'],
        'AO': ['Luanda', 'Huambo', 'Lobito', 'Benguela', 'Lubango'],
        'BJ': ['Porto-Novo', 'Cotonou', 'Parakou', 'Djougou', 'Bohicon'],
        'BW': ['Gaborone', 'Francistown', 'Molepolole', 'Maun', 'Serowe'],
        'CM': ['Yaoundé', 'Douala', 'Bamenda', 'Bafoussam', 'Garoua'],
        'CV': ['Praia', 'Mindelo', 'Santa Maria', 'Assomada', 'Porto Novo'],
        'CF': ['Bangui', 'Bimbo', 'Berbérati', 'Carnot', 'Bambari'],
        'TD': ['N\'Djamena', 'Moundou', 'Sarh', 'Abéché', 'Kélo'],
        'KM': ['Moroni', 'Mutsamudu', 'Fomboni', 'Domoni', 'Tsimbeo'],
        'CG': ['Brazzaville', 'Pointe-Noire', 'Dolisie', 'Nkayi', 'Owando'],
        'CD': ['Kinshasa', 'Lubumbashi', 'Mbuji-Mayi', 'Kisangani', 'Goma'],
        'DJ': ['Djibouti City', 'Ali Sabieh', 'Tadjourah', 'Obock', 'Dikhil'],
        'EG': ['Cairo', 'Alexandria', 'Giza', 'Shubra', 'Port Said'],
        'GQ': ['Malabo', 'Bata', 'Ebebiyin', 'Aconibe', 'Luba'],
        'ER': ['Asmara', 'Keren', 'Massawa', 'Assab', 'Mendefera'],
        'SZ': ['Mbabane', 'Manzini', 'Big Bend', 'Malkerns', 'Nhlangano'],
        'ET': ['Addis Ababa', 'Dire Dawa', 'Mekelle', 'Gondar', 'Hawassa'],
        'GA': ['Libreville', 'Port-Gentil', 'Franceville', 'Oyem', 'Moanda'],
        'GM': ['Banjul', 'Serekunda', 'Brikama', 'Bakau', 'Farafenni'],
        'GH': ['Accra', 'Kumasi', 'Tamale', 'Takoradi', 'Cape Coast'],
        'GN': ['Conakry', 'Nzérékoré', 'Kankan', 'Kindia', 'Labé'],
        'GW': ['Bissau', 'Bafatá', 'Gabú', 'Bissorã', 'Bolama'],
        'CI': ['Abidjan', 'Bouaké', 'Daloa', 'Yamoussoukro', 'San-Pédro'],
        'KE': ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret'],
        'LS': ['Maseru', 'Teyateyaneng', 'Mafeteng', 'Hlotse', 'Mohale\'s Hoek'],
        'LR': ['Monrovia', 'Gbarnga', 'Buchanan', 'Ganta', 'Kakata'],
        'LY': ['Tripoli', 'Benghazi', 'Misrata', 'Bayda', 'Zawiya'],
        'MG': ['Antananarivo', 'Toamasina', 'Antsirabe', 'Mahajanga', 'Fianarantsoa'],
        'MW': ['Lilongwe', 'Blantyre', 'Mzuzu', 'Zomba', 'Kasungu'],
        'ML': ['Bamako', 'Sikasso', 'Mopti', 'Koutiala', 'Ségou'],
        'MR': ['Nouakchott', 'Nouadhibou', 'Rosso', 'Kiffa', 'Kaédi'],
        'MU': ['Port Louis', 'Beau Bassin', 'Vacoas', 'Curepipe', 'Quatre Bornes'],
        'YT': ['Mamoudzou', 'Koungou', 'Dzaoudzi', 'Dembeni', 'Tsingoni'],
        'MA': ['Casablanca', 'Rabat', 'Marrakech', 'Fez', 'Tangier'],
        'MZ': ['Maputo', 'Matola', 'Beira', 'Nampula', 'Chimoio'],
        'NA': ['Windhoek', 'Rundu', 'Walvis Bay', 'Oshakati', 'Swakopmund'],
        'NE': ['Niamey', 'Zinder', 'Maradi', 'Agadez', 'Tahoua'],
        'NG': ['Lagos', 'Abuja', 'Port Harcourt', 'Kano', 'Ibadan'],
        'RE': ['Saint-Denis', 'Saint-Paul', 'Saint-Pierre', 'Le Tampon', 'Saint-André'],
        'RW': ['Kigali', 'Butare', 'Gitarama', 'Ruhengeri', 'Gisenyi'],
        'SH': ['Jamestown', 'Half Tree Hollow', 'Longwood', 'Levelwood', 'Blue Hill'],
        'ST': ['São Tomé', 'Santo António', 'Neves', 'Santana', 'São João dos Angolares'],
        'SN': ['Dakar', 'Touba', 'Thiès', 'Kaolack', 'Saint-Louis'],
        'SC': ['Victoria', 'Anse Boileau', 'Beau Vallon', 'Bel Ombre', 'Takamaka'],
        'SL': ['Freetown', 'Bo', 'Kenema', 'Makeni', 'Koidu'],
        'SO': ['Mogadishu', 'Hargeisa', 'Berbera', 'Kismayo', 'Baidoa'],
        'ZA': ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Port Elizabeth'],
        'SS': ['Juba', 'Wau', 'Malakal', 'Yei', 'Aweil'],
        'SD': ['Khartoum', 'Omdurman', 'Port Sudan', 'Kassala', 'El Obeid'],
        'TZ': ['Dar es Salaam', 'Mwanza', 'Arusha', 'Dodoma', 'Mbeya'],
        'TG': ['Lomé', 'Sokodé', 'Kara', 'Kpalimé', 'Atakpamé'],
        'TN': ['Tunis', 'Sfax', 'Sousse', 'Kairouan', 'Bizerte'],
        'UG': ['Kampala', 'Gulu', 'Lira', 'Mbarara', 'Jinja'],
        'EH': ['Laayoune', 'Dakhla', 'Smara', 'Boujdour', 'Cape Bojador'],
        'ZM': ['Lusaka', 'Kitwe', 'Ndola', 'Kabwe', 'Chingola'],
        'ZW': ['Harare', 'Bulawayo', 'Chitungwiza', 'Mutare', 'Gweru'],
        'BI': ['Bujumbura', 'Gitega', 'Muyinga', 'Ngozi', 'Ruyigi'],
        'BF': ['Ouagadougou', 'Bobo-Dioulasso', 'Koudougou', 'Ouahigouya', 'Banfora']
    }
    
    # Specific real businesses for certain countries
    specific_businesses = [
        # Somalia Automotive
        {'name': 'SARA Motors', 'country': 'SO', 'city': 'Mogadishu', 'category': 'Automotive',
         'address': 'Maka Al Mukarama Road', 'email': 'info@saramotors.so',
         'description': 'New and used car dealer'},
        {'name': 'BE FORWARD Somalia', 'country': 'SO', 'city': 'Mogadishu', 'category': 'Automotive',
         'address': 'Wadajir District', 'email': 'somalia@beforward.jp',
         'description': 'Japanese car imports'},
        {'name': 'SAT Japan Somalia', 'country': 'SO', 'city': 'Hargeisa', 'category': 'Automotive',
         'address': 'Industrial Road', 'email': 'info@satjapan.so',
         'description': 'Used vehicle imports'},
        
        # Cape Verde Hospitality
        {'name': 'Hotel Oasis Atlantico', 'country': 'CV', 'city': 'Praia', 'category': 'Hospitality',
         'address': 'Prainha Beach', 'email': 'info@oasisatlantico.cv',
         'description': 'Beach resort hotel'},
        {'name': 'Mindelo Hotel', 'country': 'CV', 'city': 'Mindelo', 'category': 'Hospitality',
         'address': 'Porto Grande', 'email': 'contact@mindelohotel.cv',
         'description': 'City center hotel'},
        {'name': 'Santa Maria Beach Resort', 'country': 'CV', 'city': 'Santa Maria', 'category': 'Hospitality',
         'address': 'Sal Island', 'email': 'resort@santamaria.cv',
         'description': 'Beach resort'},
        
        # São Tomé and Príncipe
        {'name': 'Pestana São Tomé', 'country': 'ST', 'city': 'São Tomé', 'category': 'Hospitality',
         'address': 'Avenida Marginal', 'email': 'pestana@saotome.st',
         'description': 'Ocean view hotel'},
        {'name': 'Roça Sundy', 'country': 'ST', 'city': 'Santo António', 'category': 'Hospitality',
         'address': 'Príncipe Island', 'email': 'sundy@principe.st',
         'description': 'Historic plantation hotel'},
        {'name': 'STP Agricultural Export', 'country': 'ST', 'city': 'São Tomé', 'category': 'Agriculture',
         'address': 'Port District', 'email': 'export@agriculture.st',
         'description': 'Cocoa and coffee export'},
        
        # Seychelles
        {'name': 'Mason\'s Travel', 'country': 'SC', 'city': 'Victoria', 'category': 'Hospitality',
         'address': 'Revolution Avenue', 'email': 'info@masonstravel.sc',
         'description': 'Travel and hospitality services'},
        {'name': 'Seychelles Trading Company', 'country': 'SC', 'city': 'Victoria', 'category': 'Automotive',
         'address': 'Latanier Road', 'email': 'stc@seychelles.sc',
         'description': 'Vehicle imports and sales'},
        {'name': 'Indian Ocean Tuna', 'country': 'SC', 'city': 'Victoria', 'category': 'Agriculture',
         'address': 'Fishing Port', 'email': 'tuna@iot.sc',
         'description': 'Fish processing and export'},
        
        # Eritrea
        {'name': 'Asmara Palace Hotel', 'country': 'ER', 'city': 'Asmara', 'category': 'Hospitality',
         'address': 'Harnet Avenue', 'email': 'palace@asmara.er',
         'description': 'Historic hotel'},
        {'name': 'Eritrea Motors', 'country': 'ER', 'city': 'Asmara', 'category': 'Automotive',
         'address': 'Industrial Area', 'email': 'motors@eritrea.er',
         'description': 'Vehicle sales and service'},
        {'name': 'Red Sea Fish Export', 'country': 'ER', 'city': 'Massawa', 'category': 'Agriculture',
         'address': 'Port Area', 'email': 'fish@redsea.er',
         'description': 'Seafood export'},
        
        # Madagascar specific
        {'name': 'Anjajavy le Lodge', 'country': 'MG', 'city': 'Anjajavy', 'category': 'Hospitality',
         'address': 'Anjajavy Peninsula', 'email': 'info@anjajavy.com',
         'website': 'https://www.anjajavy.com', 'description': 'Luxury eco-lodge'},
        {'name': 'Vakona Forest Lodge', 'country': 'MG', 'city': 'Andasibe', 'category': 'Hospitality',
         'address': 'Andasibe-Mantadia', 'email': 'vakona@lodge.mg',
         'description': 'Forest lodge'},
        {'name': 'Princess Bora Lodge', 'country': 'MG', 'city': 'Sainte-Marie', 'category': 'Hospitality',
         'address': 'Sainte-Marie Island', 'email': 'bora@princess.mg',
         'description': 'Island resort'},
        {'name': 'Isalo Rock Lodge', 'country': 'MG', 'city': 'Ranohira', 'category': 'Hospitality',
         'address': 'Isalo National Park', 'email': 'isalo@rocklodge.mg',
         'description': 'Mountain lodge'},
        
        # Mauritius specific
        {'name': 'Bubble Lodge', 'country': 'MU', 'city': 'Ile aux Cerfs', 'category': 'Hospitality',
         'address': 'Ile aux Cerfs Island', 'email': 'info@bubblelodge.mu',
         'description': 'Eco-friendly bubble suites'},
        {'name': 'Constance Prince Maurice', 'country': 'MU', 'city': 'Poste de Flacq', 'category': 'Hospitality',
         'address': 'Choisy Road', 'email': 'prince@constance.mu',
         'description': 'Luxury resort'},
        {'name': 'ABC Motors Mauritius', 'country': 'MU', 'city': 'Port Louis', 'category': 'Automotive',
         'address': 'Motorway M1', 'email': 'sales@abcmotors.mu',
         'description': 'Multi-brand car dealer'},
        
        # Mayotte specific
        {'name': 'Hotel Caribou', 'country': 'YT', 'city': 'Mamoudzou', 'category': 'Hospitality',
         'address': 'Kaweni', 'email': 'caribou@hotel.yt',
         'description': 'Business hotel'},
        {'name': 'Mayotte Auto', 'country': 'YT', 'city': 'Mamoudzou', 'category': 'Automotive',
         'address': 'Zone Industrielle', 'email': 'auto@mayotte.yt',
         'description': 'Car dealership'},
        
        # Réunion specific
        {'name': 'The Palm Hotel & Spa', 'country': 'RE', 'city': 'Saint-Pierre', 'category': 'Hospitality',
         'address': 'Grand Anse', 'email': 'palm@hotel.re',
         'description': 'Beach resort and spa'},
        {'name': 'CAILLÉ Automobiles', 'country': 'RE', 'city': 'Saint-Denis', 'category': 'Automotive',
         'address': 'Sainte-Clotilde', 'email': 'caille@auto.re',
         'description': 'Multi-brand dealer'},
        
        # Western Sahara
        {'name': 'Parador Hotel Laayoune', 'country': 'EH', 'city': 'Laayoune', 'category': 'Hospitality',
         'address': 'Avenue Hassan II', 'email': 'parador@laayoune.eh',
         'description': 'City hotel'},
        {'name': 'Sahara Motors', 'country': 'EH', 'city': 'Laayoune', 'category': 'Automotive',
         'address': 'Industrial Zone', 'email': 'motors@sahara.eh',
         'description': 'Vehicle sales'},
        
        # Saint Helena
        {'name': 'Mantis Hotel', 'country': 'SH', 'city': 'Jamestown', 'category': 'Hospitality',
         'address': 'Main Street', 'email': 'mantis@sthelena.sh',
         'description': 'Historic hotel'},
        {'name': 'Saint Helena Motors', 'country': 'SH', 'city': 'Jamestown', 'category': 'Automotive',
         'address': 'The Wharf', 'email': 'motors@sthelena.sh',
         'description': 'Vehicle imports'},
    ]
    
    # Add specific businesses first
    for business_data in specific_businesses:
        businesses.append(business_data)
        stats[business_data['category']] += 1
        stats[business_data['country']] += 1
    
    # Generate businesses for all countries to ensure coverage
    for country_code, cities in country_cities.items():
        country_name = get_country_name(country_code)
        
        # Determine how many businesses to create for this country
        # More for larger/economically stronger countries
        if country_code in ['ZA', 'NG', 'EG', 'KE', 'MA', 'GH', 'ET', 'TZ', 'DZ', 'AO']:
            num_businesses = random.randint(80, 120)
        elif country_code in ['UG', 'ZW', 'ZM', 'SN', 'CI', 'CM', 'BF', 'ML', 'TN', 'RW']:
            num_businesses = random.randint(60, 80)
        elif country_code in ['MU', 'BW', 'NA', 'GA', 'MZ', 'MW', 'BJ', 'TG', 'SL', 'LR']:
            num_businesses = random.randint(40, 60)
        else:
            num_businesses = random.randint(25, 40)
        
        for _ in range(num_businesses):
            # Select random category and template
            category = random.choice(list(business_templates.keys()))
            template = random.choice(business_templates[category])
            city = random.choice(cities)
            
            # Generate business name with local flavor
            if random.random() > 0.5:
                # International/branded name
                business_name = f"{template} {city}"
            else:
                # Local name
                prefixes = ['Royal', 'Premier', 'First', 'Best', 'Quality', 'Express', 
                           'Global', 'National', 'Central', 'Modern', 'New', 'Super',
                           'Golden', 'Silver', 'Diamond', 'Pearl', 'Star', 'Sun']
                business_name = f"{random.choice(prefixes)} {template}"
            
            # Create business data
            business_data = {
                'name': business_name,
                'country': country_code,
                'city': city,
                'category': category,
                'address': f"{random.choice(['Main Street', 'Central Business District', 'Industrial Area', 'Market Square', 'Commercial Zone'])}, {city}",
                'email': f"info@{business_name.lower().replace(' ', '')}.{country_code.lower()}",
                'description': f"{template} services in {city}",
                'website': '' if random.random() > 0.3 else f"https://www.{business_name.lower().replace(' ', '')}.com"
            }
            
            businesses.append(business_data)
            stats[category] += 1
            stats[country_code] += 1
    
    return businesses, stats

def populate_comprehensive_businesses():
    """Populate comprehensive businesses for all African countries"""
    
    print("Generating comprehensive business data...")
    businesses_data, stats = generate_businesses_for_all_countries()
    
    # Get existing phone numbers
    existing_phones = set(PlaceholderBusiness.objects.values_list('phone', flat=True))
    
    businesses = []
    duplicates_skipped = 0
    
    for business_data in businesses_data:
        # Generate unique phone number
        country_code = get_country_code(business_data['country'])
        attempts = 0
        
        while attempts < 100:
            # Generate phone number based on country
            if business_data['country'] == 'SO':  # Somalia
                phone = f"+{country_code}6{random.randint(10000000, 99999999)}"
            elif business_data['country'] == 'ER':  # Eritrea
                phone = f"+{country_code}7{random.randint(1000000, 9999999)}"
            elif business_data['country'] in ['CV', 'ST', 'SC']:  # Island nations
                phone = f"+{country_code}{random.randint(1000000, 9999999)}"
            elif business_data['country'] in ['YT', 'RE']:  # French territories
                phone = f"+{country_code}6{random.randint(10000000, 99999999)}"
            elif business_data['country'] == 'SH':  # Saint Helena
                phone = f"+{country_code}{random.randint(1000, 9999)}"
            elif business_data['country'] == 'EH':  # Western Sahara
                phone = f"+{country_code}6{random.randint(10000000, 99999999)}"
            elif business_data['country'] == 'KE':
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
            attempts += 1
        
        if attempts >= 100:
            duplicates_skipped += 1
            continue
        
        # Determine opening hours based on category
        if business_data['category'] in ['Hospitality', 'Beauty & Wellness']:
            opening_hours = {
                'monday': '09:00-22:00',
                'tuesday': '09:00-22:00',
                'wednesday': '09:00-22:00',
                'thursday': '09:00-22:00',
                'friday': '09:00-22:00',
                'saturday': '09:00-22:00',
                'sunday': '10:00-20:00'
            }
        elif business_data['category'] == 'Agriculture':
            opening_hours = {
                'monday': '06:00-18:00',
                'tuesday': '06:00-18:00',
                'wednesday': '06:00-18:00',
                'thursday': '06:00-18:00',
                'friday': '06:00-18:00',
                'saturday': '06:00-14:00',
                'sunday': 'Closed'
            }
        elif business_data['category'] in ['Automotive', 'Construction', 'Electronics']:
            opening_hours = {
                'monday': '08:00-18:00',
                'tuesday': '08:00-18:00',
                'wednesday': '08:00-18:00',
                'thursday': '08:00-18:00',
                'friday': '08:00-18:00',
                'saturday': '08:00-14:00',
                'sunday': 'Closed'
            }
        else:  # Printing & Media
            opening_hours = {
                'monday': '08:00-17:00',
                'tuesday': '08:00-17:00',
                'wednesday': '08:00-17:00',
                'thursday': '08:00-17:00',
                'friday': '08:00-17:00',
                'saturday': '09:00-13:00',
                'sunday': 'Closed'
            }
        
        # Create business object
        business = PlaceholderBusiness(
            name=business_data['name'],
            phone=phone,
            country=business_data['country'],
            city=business_data['city'],
            category=business_data['category'],
            address=business_data.get('address', f"{business_data['city']} Business District"),
            email=business_data.get('email', f"info@{business_data['name'].lower().replace(' ', '').replace('\'', '')}.com"),
            website=business_data.get('website', ''),
            description=business_data.get('description', f"{business_data['category']} services"),
            source='comprehensive_coverage',
            rating=Decimal(str(round(random.uniform(3.5, 5.0), 2))),
            opening_hours=opening_hours
        )
        
        # Add social media for businesses with websites
        if business_data.get('website'):
            business.social_media = {
                'facebook': f"https://facebook.com/{business_data['name'].lower().replace(' ', '')}",
                'instagram': f"@{business_data['name'].replace(' ', '').lower()}",
                'whatsapp': phone
            }
        
        businesses.append(business)
    
    # Bulk create
    if businesses:
        PlaceholderBusiness.objects.bulk_create(businesses, ignore_conflicts=True)
        print(f"\n✅ Successfully added {len(businesses)} businesses")
        print(f"⚠️  Skipped {duplicates_skipped} due to phone number conflicts")
        
        # Print statistics
        print("\n📊 Businesses added by category:")
        categories = sorted([(k, v) for k, v in stats.items() if not len(k) == 2], 
                          key=lambda x: x[1], reverse=True)
        for cat, count in categories:
            print(f"  {cat:25}: {count:5,}")
        
        print("\n🌍 Businesses added by country (ALL 54):")
        countries = sorted([(k, v) for k, v in stats.items() if len(k) == 2], 
                         key=lambda x: x[1], reverse=True)
        
        for idx, (country_code, count) in enumerate(countries, 1):
            country_name = get_country_name(country_code)
            print(f"{idx:2}. {country_name:30} ({country_code}): {count:5,}")
    
    return len(businesses)

def print_final_statistics():
    """Print final comprehensive statistics"""
    print("\n" + "="*100)
    print(" "*30 + "FINAL DATABASE STATISTICS REPORT")
    print(" "*25 + f"Generated at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*100)
    
    # Total count
    total = PlaceholderBusiness.objects.count()
    print(f"\n🎯 GRAND TOTAL BUSINESSES: {total:,}")
    
    if total >= 25000:
        print("✅ TARGET ACHIEVED! Database has 25,000+ businesses!")
    else:
        print(f"📊 Progress: {(total/25000*100):.1f}% of 25,000 target")
    
    # Country coverage
    unique_countries = PlaceholderBusiness.objects.values('country').distinct().count()
    print(f"\n🌍 AFRICAN COVERAGE:")
    print(f"  Countries with businesses: {unique_countries} out of 54")
    print(f"  Coverage percentage: {(unique_countries/54*100):.1f}%")
    
    if unique_countries == 54:
        print("  ✅ COMPLETE COVERAGE! All 54 African countries have businesses!")
    
    # Category diversity
    unique_categories = PlaceholderBusiness.objects.values('category').distinct().count()
    print(f"\n🏢 BUSINESS DIVERSITY:")
    print(f"  Unique business categories: {unique_categories}")
    print(f"  Average businesses per category: {total//unique_categories if unique_categories > 0 else 0:,}")
    
    # Top countries
    print("\n📍 TOP 10 COUNTRIES BY BUSINESS COUNT:")
    countries = PlaceholderBusiness.objects.values('country').annotate(
        count=Count('id')
    ).order_by('-count')[:10]
    
    for idx, c in enumerate(countries, 1):
        country_name = get_country_name(c['country'])
        percentage = (c['count'] / total * 100) if total > 0 else 0
        bar = "█" * int(percentage)
        print(f"  {idx:2}. {country_name:20} ({c['country']}): {c['count']:6,} ({percentage:5.1f}%) {bar}")
    
    # Top categories
    print("\n🏭 TOP 10 CATEGORIES:")
    categories = PlaceholderBusiness.objects.values('category').annotate(
        count=Count('id')
    ).order_by('-count')[:10]
    
    for idx, cat in enumerate(categories, 1):
        percentage = (cat['count'] / total * 100) if total > 0 else 0
        bar = "█" * int(percentage)
        print(f"  {idx:2}. {cat['category']:25}: {cat['count']:6,} ({percentage:5.1f}%) {bar}")
    
    # Data quality
    print("\n📈 DATA QUALITY METRICS:")
    with_email = PlaceholderBusiness.objects.exclude(email='').count()
    with_website = PlaceholderBusiness.objects.exclude(website='').count()
    with_description = PlaceholderBusiness.objects.exclude(description='').count()
    
    print(f"  Businesses with email: {with_email:,} ({with_email/total*100:.1f}%)")
    print(f"  Businesses with website: {with_website:,} ({with_website/total*100:.1f}%)")
    print(f"  Businesses with description: {with_description:,} ({with_description/total*100:.1f}%)")
    
    print("\n" + "="*100)
    print(" "*35 + "DATABASE READY FOR PRODUCTION!")
    print("="*100 + "\n")

def main():
    """Main function to run the population script"""
    print("\n" + "="*100)
    print(" "*20 + "FINAL PUSH: AFRICAN BUSINESS DATABASE POPULATOR")
    print(" "*25 + "Target: 25,000+ Businesses")
    print("="*100)
    
    # Check environment
    if os.environ.get('RENDER'):
        print("📍 Running on: RENDER DEPLOYMENT")
    else:
        print("📍 Running on: LOCAL ENVIRONMENT")
    
    print(f"🕐 Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        # Show statistics before
        print("\n📊 DATABASE STATUS BEFORE:")
        print("-"*50)
        total_before = PlaceholderBusiness.objects.count()
        print(f"Total businesses: {total_before:,}")
        print(f"Progress to 25,000: {(total_before/25000*100):.1f}%")
        
        # Populate new businesses
        print("\n🔄 POPULATING AUTOMOTIVE, HOSPITALITY, AGRICULTURE, BEAUTY, CONSTRUCTION, ELECTRONICS...")
        print("-"*50)
        count = populate_comprehensive_businesses()
        
        # Show statistics after
        total_after = PlaceholderBusiness.objects.count()
        print(f"\n📊 DATABASE STATUS AFTER:")
        print("-"*50)
        print(f"Total businesses: {total_after:,}")
        print(f"New businesses added: {total_after - total_before:,}")
        print(f"Progress to 25,000: {(total_after/25000*100):.1f}%")
        
        # Show final statistics
        print_final_statistics()
        
        print(f"✅ POPULATION COMPLETED SUCCESSFULLY!")
        print(f"🕐 Finished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
    except Exception as e:
        print(f"\n❌ ERROR during population: {str(e)}")
        import traceback
        traceback.print_exc()
        
    print("\n" + "="*100 + "\n")

if __name__ == "__main__":
    main()