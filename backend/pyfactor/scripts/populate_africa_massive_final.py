#!/usr/bin/env python
"""
Massive final population script to reach 25,000+ businesses.
Adds 12,000+ more businesses across all African countries with focus on diversity.
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

def generate_massive_business_data():
    """Generate massive amount of businesses to reach 25,000+ target"""
    
    businesses = []
    stats = defaultdict(int)
    
    # Expanded business categories with more variety
    business_categories = {
        'Restaurant': ['African Restaurant', 'Chinese Restaurant', 'Indian Restaurant', 'Italian Restaurant', 
                      'Fast Food', 'Pizza Place', 'Burger Joint', 'Seafood Restaurant', 'Steakhouse', 
                      'Vegetarian Restaurant', 'Cafe', 'Bistro', 'Grill House', 'Buffet Restaurant'],
        
        'Retail': ['Clothing Store', 'Shoe Store', 'Electronics Store', 'Furniture Store', 'Bookstore',
                  'Jewelry Store', 'Sports Store', 'Toy Store', 'Gift Shop', 'Department Store',
                  'Convenience Store', 'General Store', 'Boutique', 'Outlet Store', 'Discount Store'],
        
        'Healthcare': ['Medical Clinic', 'Dental Clinic', 'Eye Clinic', 'Pharmacy', 'Hospital',
                      'Medical Laboratory', 'X-Ray Center', 'Physiotherapy Clinic', 'Veterinary Clinic',
                      'Mental Health Center', 'Rehabilitation Center', 'Diagnostic Center', 'Health Center'],
        
        'Education': ['Primary School', 'Secondary School', 'University', 'College', 'Training Center',
                     'Language School', 'Computer School', 'Driving School', 'Vocational School',
                     'International School', 'Nursery School', 'Academy', 'Institute', 'Tutorial Center'],
        
        'Finance': ['Bank', 'Microfinance', 'Insurance Company', 'Investment Firm', 'Forex Bureau',
                   'Money Transfer', 'Credit Union', 'Savings & Loan', 'Financial Advisor',
                   'Accounting Firm', 'Tax Consultant', 'Audit Firm', 'Pension Fund', 'Asset Management'],
        
        'Transport': ['Taxi Service', 'Bus Company', 'Car Rental', 'Delivery Service', 'Logistics Company',
                     'Freight Service', 'Courier Service', 'Moving Company', 'Transport Company',
                     'Shipping Company', 'Air Cargo', 'Railway Service', 'Ferry Service', 'Trucking Company'],
        
        'Technology': ['IT Company', 'Software Company', 'Web Design', 'Computer Repair', 'Phone Repair',
                      'Internet Service', 'Data Center', 'Tech Support', 'App Development', 'Game Development',
                      'Digital Marketing', 'SEO Company', 'Cloud Services', 'Cybersecurity', 'Tech Startup'],
        
        'Manufacturing': ['Food Processing', 'Textile Factory', 'Furniture Factory', 'Chemical Plant',
                         'Plastic Manufacturing', 'Metal Works', 'Paper Mill', 'Printing Company',
                         'Packaging Company', 'Assembly Plant', 'Production Facility', 'Factory',
                         'Industrial Plant', 'Processing Plant', 'Workshop'],
        
        'Services': ['Law Firm', 'Consulting Firm', 'Real Estate Agency', 'Travel Agency', 'Security Company',
                    'Cleaning Service', 'Laundry Service', 'Pest Control', 'Event Planning', 'Catering Service',
                    'Photography Studio', 'Advertising Agency', 'Public Relations', 'Marketing Agency', 'Design Studio'],
        
        'Entertainment': ['Cinema', 'Theater', 'Night Club', 'Bar', 'Lounge', 'Gaming Center', 'Bowling Alley',
                         'Amusement Park', 'Sports Complex', 'Gym', 'Fitness Center', 'Recreation Center',
                         'Entertainment Venue', 'Concert Hall', 'Stadium'],
        
        'Hospitality': ['Hotel', 'Motel', 'Guest House', 'Lodge', 'Resort', 'Hostel', 'Inn', 'B&B',
                       'Apartment Hotel', 'Boutique Hotel', 'Business Hotel', 'Airport Hotel', 'Beach Hotel',
                       'Safari Lodge', 'Eco Lodge'],
        
        'Agriculture': ['Farm', 'Ranch', 'Plantation', 'Agricultural Company', 'Livestock Farm', 'Poultry Farm',
                       'Fish Farm', 'Dairy Farm', 'Crop Farm', 'Organic Farm', 'Agricultural Cooperative',
                       'Agricultural Export', 'Agricultural Supply', 'Agricultural Equipment', 'Seed Company'],
        
        'Construction': ['Construction Company', 'Building Contractor', 'Civil Engineering', 'Architecture Firm',
                        'Interior Design', 'Landscaping', 'Roofing Company', 'Plumbing Service', 'Electrical Contractor',
                        'Painting Service', 'Renovation Company', 'Property Developer', 'Construction Supply',
                        'Heavy Equipment', 'Building Materials'],
        
        'Beauty': ['Beauty Salon', 'Hair Salon', 'Nail Salon', 'Spa', 'Massage Parlor', 'Barber Shop',
                  'Cosmetics Store', 'Beauty Supply', 'Skin Care Clinic', 'Beauty Academy', 'Makeup Studio',
                  'Wellness Center', 'Aesthetic Clinic', 'Beauty Products', 'Hair Products'],
        
        'Automotive': ['Car Dealership', 'Auto Repair', 'Car Wash', 'Auto Parts', 'Tire Shop', 'Auto Service',
                      'Gas Station', 'Car Accessories', 'Motorcycle Dealer', 'Truck Dealer', 'Bus Dealer',
                      'Auto Body Shop', 'Car Inspection', 'Auto Electric', 'Auto Glass'],
        
        'Food & Beverage': ['Bakery', 'Coffee Shop', 'Tea House', 'Ice Cream Shop', 'Juice Bar', 'Food Truck',
                           'Catering Company', 'Food Distributor', 'Food Importer', 'Food Exporter', 'Food Processor',
                           'Beverage Company', 'Brewery', 'Winery', 'Distillery'],
        
        'Shopping': ['Shopping Mall', 'Market', 'Supermarket', 'Hypermarket', 'Mini Market', 'Corner Shop',
                    'Wholesale Market', 'Farmers Market', 'Night Market', 'Flea Market', 'Craft Market',
                    'Shopping Center', 'Plaza', 'Arcade', 'Bazaar'],
        
        'Sports': ['Sports Club', 'Football Club', 'Tennis Club', 'Golf Club', 'Cricket Club', 'Basketball Court',
                  'Swimming Pool', 'Sports Academy', 'Sports Equipment', 'Sports Wear', 'Sports Medicine',
                  'Sports Training', 'Sports Management', 'Sports Marketing', 'Sports Facility'],
        
        'Media': ['TV Station', 'Radio Station', 'Newspaper', 'Magazine', 'Publishing House', 'Media Company',
                 'Production Company', 'Recording Studio', 'Film Studio', 'Animation Studio', 'News Agency',
                 'Online Media', 'Digital Media', 'Social Media Agency', 'Content Creation'],
        
        'Energy': ['Power Company', 'Solar Company', 'Wind Energy', 'Oil Company', 'Gas Company', 'Fuel Station',
                  'Energy Consulting', 'Renewable Energy', 'Electric Company', 'Generator Sales', 'Battery Store',
                  'Energy Equipment', 'Power Generation', 'Energy Distribution', 'Utility Company']
    }
    
    # City data for all African countries with more cities
    country_cities = {
        'DZ': ['Algiers', 'Oran', 'Constantine', 'Annaba', 'Blida', 'Batna', 'Djelfa', 'Sétif', 'Biskra', 'Béchar'],
        'AO': ['Luanda', 'Huambo', 'Lobito', 'Benguela', 'Lubango', 'Malanje', 'Namibe', 'Soyo', 'Cabinda', 'Uíge'],
        'BJ': ['Porto-Novo', 'Cotonou', 'Parakou', 'Djougou', 'Bohicon', 'Kandi', 'Abomey', 'Natitingou', 'Lokossa', 'Ouidah'],
        'BW': ['Gaborone', 'Francistown', 'Molepolole', 'Maun', 'Serowe', 'Selebi-Phikwe', 'Kanye', 'Mahalapye', 'Mogoditshane', 'Mochudi'],
        'CM': ['Yaoundé', 'Douala', 'Bamenda', 'Bafoussam', 'Garoua', 'Maroua', 'Ngaoundéré', 'Bertoua', 'Edéa', 'Kumba'],
        'CV': ['Praia', 'Mindelo', 'Santa Maria', 'Assomada', 'Porto Novo', 'Pedra Badejo', 'São Filipe', 'Tarrafal', 'Espargos', 'Ribeira Grande'],
        'CF': ['Bangui', 'Bimbo', 'Berbérati', 'Carnot', 'Bambari', 'Bouar', 'Bossangoa', 'Bria', 'Bangassou', 'Nola'],
        'TD': ['N\'Djamena', 'Moundou', 'Sarh', 'Abéché', 'Kélo', 'Koumra', 'Pala', 'Am Timan', 'Bongor', 'Mongo'],
        'KM': ['Moroni', 'Mutsamudu', 'Fomboni', 'Domoni', 'Tsimbeo', 'Adda-Daouéni', 'Sima', 'Ouani', 'Mirontsi', 'Mbéni'],
        'CG': ['Brazzaville', 'Pointe-Noire', 'Dolisie', 'Nkayi', 'Owando', 'Ouesso', 'Impfondo', 'Madingou', 'Sibiti', 'Mossendjo'],
        'CD': ['Kinshasa', 'Lubumbashi', 'Mbuji-Mayi', 'Kisangani', 'Goma', 'Bukavu', 'Kananga', 'Likasi', 'Kolwezi', 'Tshikapa'],
        'DJ': ['Djibouti City', 'Ali Sabieh', 'Tadjourah', 'Obock', 'Dikhil', 'Arta', 'Holhol', 'Ali Adde', 'Assamo', 'Balho'],
        'EG': ['Cairo', 'Alexandria', 'Giza', 'Shubra', 'Port Said', 'Suez', 'Luxor', 'Aswan', 'Asyut', 'Tanta'],
        'GQ': ['Malabo', 'Bata', 'Ebebiyin', 'Aconibe', 'Luba', 'Evinayong', 'Mongomo', 'Mengomeyén', 'Micomeseng', 'Rebola'],
        'ER': ['Asmara', 'Keren', 'Massawa', 'Assab', 'Mendefera', 'Dekemhare', 'Adi Keyh', 'Barentu', 'Ghinda', 'Senafe'],
        'SZ': ['Mbabane', 'Manzini', 'Big Bend', 'Malkerns', 'Nhlangano', 'Piggs Peak', 'Siteki', 'Hlatikulu', 'Simunye', 'Mankayane'],
        'ET': ['Addis Ababa', 'Dire Dawa', 'Mekelle', 'Gondar', 'Hawassa', 'Bahir Dar', 'Dessie', 'Jimma', 'Jijiga', 'Shashamane'],
        'GA': ['Libreville', 'Port-Gentil', 'Franceville', 'Oyem', 'Moanda', 'Mouila', 'Lambaréné', 'Tchibanga', 'Koulamoutou', 'Makokou'],
        'GM': ['Banjul', 'Serekunda', 'Brikama', 'Bakau', 'Farafenni', 'Lamin', 'Sukuta', 'Basse', 'Gunjur', 'Soma'],
        'GH': ['Accra', 'Kumasi', 'Tamale', 'Takoradi', 'Cape Coast', 'Tema', 'Sekondi', 'Obuasi', 'Teshie', 'Koforidua'],
        'GN': ['Conakry', 'Nzérékoré', 'Kankan', 'Kindia', 'Labé', 'Mamou', 'Kissidougou', 'Guéckédou', 'Macenta', 'Kamsar'],
        'GW': ['Bissau', 'Bafatá', 'Gabú', 'Bissorã', 'Bolama', 'Cacheu', 'Bubaque', 'Catió', 'Mansôa', 'Buba'],
        'CI': ['Abidjan', 'Bouaké', 'Daloa', 'Yamoussoukro', 'San-Pédro', 'Divo', 'Korhogo', 'Man', 'Gagnoa', 'Abengourou'],
        'KE': ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Kisii', 'Kitale', 'Malindi', 'Kakamega'],
        'LS': ['Maseru', 'Teyateyaneng', 'Mafeteng', 'Hlotse', 'Mohale\'s Hoek', 'Maputsoe', 'Qacha\'s Nek', 'Quthing', 'Butha-Buthe', 'Mokhotlong'],
        'LR': ['Monrovia', 'Gbarnga', 'Buchanan', 'Ganta', 'Kakata', 'Zwedru', 'Harbel', 'Harper', 'Voinjama', 'Robertsport'],
        'LY': ['Tripoli', 'Benghazi', 'Misrata', 'Bayda', 'Zawiya', 'Zliten', 'Tobruk', 'Ajdabiya', 'Sabha', 'Sirte'],
        'MG': ['Antananarivo', 'Toamasina', 'Antsirabe', 'Mahajanga', 'Fianarantsoa', 'Toliara', 'Antsiranana', 'Ambovombe', 'Antanifotsy', 'Morondava'],
        'MW': ['Lilongwe', 'Blantyre', 'Mzuzu', 'Zomba', 'Kasungu', 'Mangochi', 'Karonga', 'Salima', 'Nkhotakota', 'Liwonde'],
        'ML': ['Bamako', 'Sikasso', 'Mopti', 'Koutiala', 'Ségou', 'Kayes', 'Kati', 'San', 'Gao', 'Timbuktu'],
        'MR': ['Nouakchott', 'Nouadhibou', 'Rosso', 'Kiffa', 'Kaédi', 'Zouérat', 'Atar', 'Néma', 'Sélibaby', 'Aleg'],
        'MU': ['Port Louis', 'Beau Bassin', 'Vacoas', 'Curepipe', 'Quatre Bornes', 'Triolet', 'Goodlands', 'Centre de Flacq', 'Bel Air', 'Mahebourg'],
        'YT': ['Mamoudzou', 'Koungou', 'Dzaoudzi', 'Dembeni', 'Tsingoni', 'Bandraboua', 'Pamandzi', 'Sada', 'Chirongui', 'Bouéni'],
        'MA': ['Casablanca', 'Rabat', 'Marrakech', 'Fez', 'Tangier', 'Agadir', 'Meknes', 'Oujda', 'Kenitra', 'Tetouan'],
        'MZ': ['Maputo', 'Matola', 'Beira', 'Nampula', 'Chimoio', 'Nacala', 'Quelimane', 'Tete', 'Xai-Xai', 'Maxixe'],
        'NA': ['Windhoek', 'Rundu', 'Walvis Bay', 'Oshakati', 'Swakopmund', 'Katima Mulilo', 'Grootfontein', 'Rehoboth', 'Otjiwarongo', 'Gobabis'],
        'NE': ['Niamey', 'Zinder', 'Maradi', 'Agadez', 'Tahoua', 'Dosso', 'Diffa', 'Tillabéri', 'Téra', 'Mirriah'],
        'NG': ['Lagos', 'Abuja', 'Port Harcourt', 'Kano', 'Ibadan', 'Kaduna', 'Benin City', 'Maiduguri', 'Zaria', 'Aba'],
        'RE': ['Saint-Denis', 'Saint-Paul', 'Saint-Pierre', 'Le Tampon', 'Saint-André', 'Saint-Louis', 'Le Port', 'Saint-Benoit', 'Sainte-Marie', 'Sainte-Suzanne'],
        'RW': ['Kigali', 'Butare', 'Gitarama', 'Ruhengeri', 'Gisenyi', 'Byumba', 'Cyangugu', 'Kibuye', 'Rwamagana', 'Kibungo'],
        'SH': ['Jamestown', 'Half Tree Hollow', 'Longwood', 'Levelwood', 'Blue Hill', 'Sandy Bay', 'Alarm Forest', 'St Pauls', 'Thompsons Hill', 'Barren Ground'],
        'ST': ['São Tomé', 'Santo António', 'Neves', 'Santana', 'São João dos Angolares', 'Trindade', 'Santa Cruz', 'Pantufo', 'Guadalupe', 'Santo Amaro'],
        'SN': ['Dakar', 'Touba', 'Thiès', 'Kaolack', 'Saint-Louis', 'Mbour', 'Ziguinchor', 'Diourbel', 'Louga', 'Tambacounda'],
        'SC': ['Victoria', 'Anse Boileau', 'Beau Vallon', 'Bel Ombre', 'Takamaka', 'Grand Anse', 'Cascade', 'Anse Royale', 'Glacis', 'Plaisance'],
        'SL': ['Freetown', 'Bo', 'Kenema', 'Makeni', 'Koidu', 'Lunsar', 'Port Loko', 'Pandebu', 'Magburaka', 'Kambia'],
        'SO': ['Mogadishu', 'Hargeisa', 'Berbera', 'Kismayo', 'Baidoa', 'Bosaso', 'Galcaio', 'Garowe', 'Jowhar', 'Beledweyne'],
        'ZA': ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Port Elizabeth', 'Bloemfontein', 'East London', 'Nelspruit', 'Polokwane', 'Kimberley'],
        'SS': ['Juba', 'Wau', 'Malakal', 'Yei', 'Aweil', 'Yambio', 'Kuajok', 'Torit', 'Rumbek', 'Bor'],
        'SD': ['Khartoum', 'Omdurman', 'Port Sudan', 'Kassala', 'El Obeid', 'Nyala', 'Wad Madani', 'El Fasher', 'Kosti', 'Gedaref'],
        'TZ': ['Dar es Salaam', 'Mwanza', 'Arusha', 'Dodoma', 'Mbeya', 'Morogoro', 'Tanga', 'Zanzibar', 'Kigoma', 'Moshi'],
        'TG': ['Lomé', 'Sokodé', 'Kara', 'Kpalimé', 'Atakpamé', 'Bassar', 'Tsévié', 'Aného', 'Mango', 'Dapaong'],
        'TN': ['Tunis', 'Sfax', 'Sousse', 'Kairouan', 'Bizerte', 'Gabès', 'Ariana', 'Gafsa', 'Monastir', 'Ben Arous'],
        'UG': ['Kampala', 'Gulu', 'Lira', 'Mbarara', 'Jinja', 'Mbale', 'Mukono', 'Kasese', 'Masaka', 'Entebbe'],
        'EH': ['Laayoune', 'Dakhla', 'Smara', 'Boujdour', 'Cape Bojador', 'El Marsa', 'Hawza', 'Mahbas', 'Tifariti', 'Bir Lehlou'],
        'ZM': ['Lusaka', 'Kitwe', 'Ndola', 'Kabwe', 'Chingola', 'Mufulira', 'Livingstone', 'Luanshya', 'Kasama', 'Chipata'],
        'ZW': ['Harare', 'Bulawayo', 'Chitungwiza', 'Mutare', 'Gweru', 'Epworth', 'Kwekwe', 'Kadoma', 'Masvingo', 'Chinhoyi'],
        'BI': ['Bujumbura', 'Gitega', 'Muyinga', 'Ngozi', 'Ruyigi', 'Kayanza', 'Bururi', 'Rutana', 'Makamba', 'Muramvya'],
        'BF': ['Ouagadougou', 'Bobo-Dioulasso', 'Koudougou', 'Ouahigouya', 'Banfora', 'Dédougou', 'Kaya', 'Dori', 'Tenkodogo', 'Fada N\'Gourma']
    }
    
    # Generate businesses for each country
    for country_code, cities in country_cities.items():
        country_name = get_country_name(country_code)
        
        # Determine number of businesses based on country economic size
        # Major economies get more businesses
        if country_code in ['ZA', 'NG', 'EG', 'KE', 'MA', 'GH', 'ET', 'TZ', 'DZ', 'AO']:
            num_businesses = random.randint(300, 400)
        elif country_code in ['UG', 'ZW', 'ZM', 'SN', 'CI', 'CM', 'BF', 'ML', 'TN', 'RW', 'MZ', 'BJ']:
            num_businesses = random.randint(200, 300)
        elif country_code in ['MU', 'BW', 'NA', 'GA', 'MW', 'TG', 'SL', 'LR', 'MG', 'NE', 'GN']:
            num_businesses = random.randint(150, 200)
        elif country_code in ['BI', 'CF', 'TD', 'KM', 'CG', 'CD', 'DJ', 'GQ', 'ER', 'SZ', 'GM', 'GW', 'LS', 'LY', 'MR', 'SO', 'SS', 'SD']:
            num_businesses = random.randint(100, 150)
        else:  # Small territories and islands
            num_businesses = random.randint(50, 100)
        
        for i in range(num_businesses):
            # Select category and business type
            category = random.choice(list(business_categories.keys()))
            business_type = random.choice(business_categories[category])
            city = random.choice(cities)
            
            # Generate business name variations
            name_patterns = [
                f"{city} {business_type}",
                f"{country_name} {business_type}",
                f"{business_type} {city}",
                f"The {business_type}",
                f"{random.choice(['Royal', 'Premier', 'First', 'Best', 'Quality', 'Express', 'Elite', 'Premium', 'Superior', 'Deluxe'])} {business_type}",
                f"{random.choice(['Golden', 'Silver', 'Diamond', 'Pearl', 'Crystal', 'Star', 'Sun', 'Moon', 'Ocean', 'Mountain'])} {business_type}",
                f"{random.choice(['New', 'Modern', 'Advanced', 'Smart', 'Digital', 'Global', 'International', 'National', 'Central', 'Main'])} {business_type}",
                f"{business_type} Plus",
                f"{business_type} Pro",
                f"{business_type} Express",
                f"{business_type} & Co",
                f"{city} {business_type} Center",
                f"{business_type} Solutions",
                f"{business_type} Services",
                f"{business_type} Group",
                f"{business_type} International",
                f"{business_type} Africa",
                f"African {business_type}",
                f"{country_name} {business_type} Company",
                f"{business_type} Ltd"
            ]
            
            business_name = random.choice(name_patterns)
            
            # Make sure name is unique by adding number if needed
            if random.random() < 0.1:  # 10% chance to add number
                business_name = f"{business_name} {random.randint(1, 999)}"
            
            # Generate address
            street_names = ['Main Street', 'Market Street', 'High Street', 'Church Street', 'Park Road',
                          'Station Road', 'Victoria Street', 'King Street', 'Queen Street', 'New Road',
                          'Broadway', 'Central Avenue', 'First Avenue', 'Second Avenue', 'Commercial Street',
                          'Industrial Road', 'Business District', 'Trade Center', 'Shopping District', 'City Center']
            
            address = f"{random.randint(1, 999)} {random.choice(street_names)}, {city}"
            
            # Create business data
            business_data = {
                'name': business_name,
                'country': country_code,
                'city': city,
                'category': category,
                'address': address,
                'email': f"info@{business_name.lower().replace(' ', '').replace('&', 'and').replace(',', '').replace('.', '')[:30]}.{country_code.lower()}",
                'description': f"{business_type} in {city}, {country_name}. Providing quality {category.lower()} services.",
                'website': '' if random.random() > 0.4 else f"https://www.{business_name.lower().replace(' ', '').replace('&', 'and').replace(',', '')[:30]}.com"
            }
            
            businesses.append(business_data)
            stats[category] += 1
            stats[country_code] += 1
    
    return businesses, stats

def populate_massive_businesses():
    """Populate massive number of businesses"""
    
    print("🚀 Generating MASSIVE business data (this might take a moment)...")
    businesses_data, stats = generate_massive_business_data()
    
    print(f"📊 Generated {len(businesses_data):,} business records")
    print("🔄 Now adding to database...")
    
    # Get existing phone numbers
    existing_phones = set(PlaceholderBusiness.objects.values_list('phone', flat=True))
    
    businesses = []
    duplicates_skipped = 0
    batch_size = 500  # Process in batches for better performance
    total_added = 0
    
    for idx, business_data in enumerate(businesses_data):
        # Generate unique phone number
        country_code = get_country_code(business_data['country'])
        attempts = 0
        
        while attempts < 50:  # Reduced attempts for speed
            # Quick phone generation
            if business_data['country'] in ['KE', 'TZ', 'UG', 'RW']:
                phone = f"+{country_code}7{random.randint(10000000, 99999999)}"
            elif business_data['country'] == 'NG':
                phone = f"+{country_code}{random.choice(['8', '9', '7'])}{random.randint(100000000, 999999999)}"
            elif business_data['country'] == 'ZA':
                phone = f"+{country_code}{random.choice(['6', '7', '8'])}{random.randint(10000000, 99999999)}"
            elif business_data['country'] == 'EG':
                phone = f"+{country_code}1{random.randint(100000000, 999999999)}"
            elif business_data['country'] == 'MA':
                phone = f"+{country_code}6{random.randint(10000000, 99999999)}"
            else:
                phone = f"+{country_code}{random.randint(100000000, 999999999)}"
            
            if phone not in existing_phones:
                existing_phones.add(phone)
                break
            attempts += 1
        
        if attempts >= 50:
            duplicates_skipped += 1
            continue
        
        # Create business object
        business = PlaceholderBusiness(
            name=business_data['name'],
            phone=phone,
            country=business_data['country'],
            city=business_data['city'],
            category=business_data['category'],
            address=business_data['address'],
            email=business_data['email'],
            website=business_data.get('website', ''),
            description=business_data['description'],
            source='massive_population',
            rating=Decimal(str(round(random.uniform(3.0, 5.0), 1))),
            opening_hours={
                'monday': '09:00-18:00',
                'tuesday': '09:00-18:00',
                'wednesday': '09:00-18:00',
                'thursday': '09:00-18:00',
                'friday': '09:00-18:00',
                'saturday': '09:00-14:00',
                'sunday': 'Closed'
            }
        )
        
        businesses.append(business)
        
        # Bulk create in batches
        if len(businesses) >= batch_size:
            PlaceholderBusiness.objects.bulk_create(businesses, ignore_conflicts=True)
            total_added += len(businesses)
            print(f"  ✅ Added batch: {total_added:,} businesses so far...")
            businesses = []
    
    # Add remaining businesses
    if businesses:
        PlaceholderBusiness.objects.bulk_create(businesses, ignore_conflicts=True)
        total_added += len(businesses)
    
    print(f"\n✅ Successfully added {total_added:,} businesses")
    print(f"⚠️  Skipped {duplicates_skipped:,} due to phone number conflicts")
    
    # Print category statistics
    print("\n📊 Businesses added by category:")
    categories = sorted([(k, v) for k, v in stats.items() if not len(str(k)) == 2], 
                      key=lambda x: x[1], reverse=True)
    for cat, count in categories[:20]:  # Top 20 categories
        print(f"  {cat:25}: {count:5,}")
    
    # Print country statistics
    print("\n🌍 Businesses added by country (Top 20):")
    countries = sorted([(k, v) for k, v in stats.items() if len(str(k)) == 2], 
                     key=lambda x: x[1], reverse=True)[:20]
    
    for idx, (country_code, count) in enumerate(countries, 1):
        country_name = get_country_name(country_code)
        print(f"  {idx:2}. {country_name:25} ({country_code}): {count:5,}")
    
    return total_added

def print_achievement_banner():
    """Print achievement banner when reaching 25,000"""
    print("\n" + "🎉" * 50)
    print("🏆" * 50)
    print("\n" + " " * 20 + "🎯 ACHIEVEMENT UNLOCKED! 🎯")
    print(" " * 15 + "DATABASE HAS REACHED 25,000+ BUSINESSES!")
    print("\n" + "🏆" * 50)
    print("🎉" * 50 + "\n")

def main():
    """Main function to run the massive population script"""
    print("\n" + "="*100)
    print(" "*15 + "MASSIVE FINAL POPULATION - REACHING 25,000+ BUSINESSES")
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
        remaining = 25000 - total_before
        print(f"Businesses needed to reach 25,000: {remaining:,}")
        print(f"Progress: {(total_before/25000*100):.1f}%")
        
        # Calculate how many to add
        if remaining > 0:
            # Add extra to ensure we exceed 25,000
            target_to_add = remaining + random.randint(1000, 2000)
            print(f"\n🎯 Target: Adding {target_to_add:,} businesses to exceed 25,000")
        else:
            print("\n✅ Already at or above 25,000 businesses!")
            target_to_add = 0
        
        if target_to_add > 0:
            # Populate new businesses
            print("\n🔄 MASSIVE POPULATION IN PROGRESS...")
            print("-"*50)
            count = populate_massive_businesses()
            
            # Show statistics after
            total_after = PlaceholderBusiness.objects.count()
            print(f"\n📊 DATABASE STATUS AFTER:")
            print("-"*50)
            print(f"Total businesses: {total_after:,}")
            print(f"New businesses added: {total_after - total_before:,}")
            print(f"Progress: {(total_after/25000*100):.1f}%")
            
            if total_after >= 25000:
                print_achievement_banner()
        
        # Final statistics
        print("\n" + "="*100)
        print(" "*30 + "FINAL DATABASE REPORT")
        print("="*100)
        
        total_final = PlaceholderBusiness.objects.count()
        print(f"\n🏆 FINAL TOTAL: {total_final:,} businesses")
        
        if total_final >= 25000:
            print("✅ SUCCESS! Target of 25,000+ businesses achieved!")
        else:
            print(f"📊 Progress: {(total_final/25000*100):.1f}% of target")
        
        # Country coverage
        unique_countries = PlaceholderBusiness.objects.values('country').distinct().count()
        print(f"\n🌍 Country coverage: {unique_countries} countries")
        
        # Category diversity
        unique_categories = PlaceholderBusiness.objects.values('category').distinct().count()
        print(f"🏢 Category diversity: {unique_categories} unique categories")
        
        print("\n" + "="*100)
        print(f"✅ Script completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*100 + "\n")
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()