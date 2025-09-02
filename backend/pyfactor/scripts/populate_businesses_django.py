#!/usr/bin/env python3
"""
Script to populate 10,000 African businesses using Django ORM.
Focuses primarily on Kenya and South Sudan with some coverage of other African countries.
Distribution: 45% Kenya, 35% South Sudan, 20% other East African countries.
"""

import os
import sys
import django
import random
from datetime import datetime

# Add the project directory to the Python path
sys.path.insert(0, '/Users/kuoldeng/projectx/backend/pyfactor')

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connections, transaction
from business.models import PlaceholderBusiness

# Business categories with weights for realistic distribution
BUSINESS_CATEGORIES = {
    'Retail': 15,
    'Food & Dining': 12,
    'Healthcare': 8,
    'Technology': 6,
    'Transport': 10,
    'Agriculture': 8,
    'Manufacturing': 5,
    'Education': 6,
    'Finance': 5,
    'Real Estate': 4,
    'Tourism': 3,
    'Mining': 2,
    'Energy': 2,
    'Construction': 5,
    'Fashion': 4,
    'Beauty': 5
}

# Kenyan cities with population weights
KENYA_CITIES = {
    'Nairobi': 30,
    'Mombasa': 15,
    'Kisumu': 10,
    'Nakuru': 8,
    'Eldoret': 7,
    'Thika': 5,
    'Malindi': 4,
    'Kitale': 3,
    'Garissa': 3,
    'Kakamega': 3,
    'Nyeri': 2,
    'Machakos': 2,
    'Meru': 2,
    'Nanyuki': 2,
    'Naivasha': 2,
    'Kisii': 2
}

# South Sudan cities with weights
SOUTH_SUDAN_CITIES = {
    'Juba': 35,
    'Wau': 12,
    'Malakal': 10,
    'Yei': 8,
    'Aweil': 7,
    'Rumbek': 6,
    'Torit': 5,
    'Bor': 5,
    'Yambio': 4,
    'Kuajok': 3,
    'Bentiu': 3,
    'Nimule': 2
}

# Other African countries and their major cities
OTHER_AFRICAN_CITIES = {
    'UG': {  # Uganda
        'Kampala': 20,
        'Gulu': 5,
        'Lira': 3,
        'Mbarara': 3,
        'Jinja': 3,
        'Entebbe': 2
    },
    'TZ': {  # Tanzania
        'Dar es Salaam': 20,
        'Arusha': 5,
        'Mwanza': 3,
        'Dodoma': 2,
        'Mbeya': 2
    },
    'ET': {  # Ethiopia
        'Addis Ababa': 25,
        'Dire Dawa': 5,
        'Mekelle': 3,
        'Gondar': 2,
        'Bahir Dar': 2
    },
    'RW': {  # Rwanda
        'Kigali': 20,
        'Butare': 3,
        'Gisenyi': 2
    }
}

# Business name prefixes and suffixes
NAME_PREFIXES = [
    'Premier', 'Elite', 'Global', 'National', 'Royal', 'Golden', 'Silver', 'Diamond',
    'Crystal', 'Star', 'Sun', 'Moon', 'Unity', 'Liberty', 'Victory', 'Success',
    'Pioneer', 'Modern', 'Smart', 'Quick', 'Fast', 'Express', 'Instant', 'Pro',
    'Quality', 'Best', 'Top', 'Prime', 'Superior', 'Excellent', 'Perfect', 'Ultimate'
]

BUSINESS_TYPES = {
    'Retail': ['Store', 'Shop', 'Mart', 'Market', 'Outlet', 'Trading', 'Supplies', 'Merchants'],
    'Food & Dining': ['Restaurant', 'Cafe', 'Bistro', 'Kitchen', 'Diner', 'Eatery', 'Grill', 'Bakery'],
    'Healthcare': ['Clinic', 'Medical Center', 'Hospital', 'Pharmacy', 'Health Services', 'Wellness'],
    'Technology': ['Tech', 'Solutions', 'Systems', 'Software', 'Digital', 'Innovations', 'IT Services'],
    'Transport': ['Transport', 'Logistics', 'Carriers', 'Movers', 'Freight', 'Shipping', 'Delivery'],
    'Agriculture': ['Farms', 'Agro', 'Agricultural', 'Produce', 'Harvest', 'Growers', 'Plantation'],
    'Manufacturing': ['Industries', 'Manufacturing', 'Factory', 'Production', 'Works', 'Plant'],
    'Education': ['School', 'Academy', 'Institute', 'College', 'Training Center', 'Education'],
    'Finance': ['Finance', 'Capital', 'Investments', 'Banking', 'Credit', 'Loans', 'Insurance'],
    'Real Estate': ['Properties', 'Real Estate', 'Estates', 'Realty', 'Developers', 'Housing'],
    'Tourism': ['Tours', 'Travel', 'Safari', 'Adventures', 'Expeditions', 'Tourism'],
    'Mining': ['Mining', 'Minerals', 'Resources', 'Extraction', 'Quarry'],
    'Energy': ['Energy', 'Power', 'Solar', 'Electric', 'Petroleum', 'Gas'],
    'Construction': ['Construction', 'Builders', 'Contractors', 'Engineering', 'Development'],
    'Fashion': ['Fashion', 'Boutique', 'Apparel', 'Clothing', 'Wear', 'Designs', 'Tailors'],
    'Beauty': ['Beauty', 'Salon', 'Spa', 'Cosmetics', 'Hair', 'Wellness', 'Aesthetics']
}

# Street names for addresses
STREET_NAMES = [
    'Main', 'Market', 'Commercial', 'Industrial', 'Business', 'Trade', 'Central',
    'Station', 'Airport', 'Hospital', 'School', 'Church', 'Mosque', 'Temple',
    'River', 'Lake', 'Hill', 'Valley', 'Garden', 'Park', 'Plaza', 'Square'
]

def generate_phone_number(country_code):
    """Generate a realistic phone number for the country"""
    if country_code == 'KE':
        # Kenya: +254 7XX XXX XXX
        return f"+254{random.choice(['7', '1'])}{random.randint(10000000, 99999999)}"
    elif country_code == 'SS':
        # South Sudan: +211 9XX XXX XXX
        return f"+211{random.choice(['9', '92', '95'])}{random.randint(1000000, 9999999)}"
    elif country_code == 'UG':
        # Uganda: +256 7XX XXX XXX
        return f"+256{random.choice(['7', '70', '75', '77'])}{random.randint(1000000, 9999999)}"
    elif country_code == 'TZ':
        # Tanzania: +255 7XX XXX XXX
        return f"+255{random.choice(['7', '71', '75', '76'])}{random.randint(1000000, 9999999)}"
    elif country_code == 'ET':
        # Ethiopia: +251 9XX XXX XXX
        return f"+251{random.choice(['9', '91', '92'])}{random.randint(1000000, 9999999)}"
    elif country_code == 'RW':
        # Rwanda: +250 78X XXX XXX
        return f"+250{random.choice(['78', '72', '73'])}{random.randint(1000000, 9999999)}"
    else:
        # Generic African number
        return f"+2{random.randint(10000000000, 99999999999)}"

def generate_business_name(category, city):
    """Generate a realistic business name"""
    prefix = random.choice(NAME_PREFIXES) if random.random() > 0.3 else city
    suffix = random.choice(BUSINESS_TYPES.get(category, ['Business']))
    
    if random.random() > 0.7:
        # Add location to name sometimes
        return f"{prefix} {suffix}"
    else:
        # Add category hint
        category_hint = category.split(' & ')[0]
        return f"{prefix} {category_hint} {suffix}"

def generate_address(city, country):
    """Generate a realistic address"""
    street_num = random.randint(1, 999)
    street = random.choice(STREET_NAMES)
    
    if random.random() > 0.5:
        area = random.choice(['District', 'Zone', 'Area', 'Sector', 'Quarter'])
        return f"{street_num} {street} Road, {area} {random.randint(1, 20)}, {city}"
    else:
        return f"{street_num} {street} Street, {city}"

def weighted_choice(choices_dict):
    """Make a weighted random choice from a dictionary"""
    choices = list(choices_dict.keys())
    weights = list(choices_dict.values())
    return random.choices(choices, weights=weights)[0]

def generate_businesses(total_count=10000):
    """Generate the business data"""
    businesses = []
    used_phones = set()
    used_names = set()
    
    # Get existing phone numbers to avoid duplicates
    existing_phones = set(PlaceholderBusiness.objects.values_list('phone', flat=True))
    used_phones.update(existing_phones)
    print(f"Found {len(existing_phones)} existing businesses in database")
    
    # Distribution: 45% Kenya, 35% South Sudan, 20% other African countries
    kenya_count = int(total_count * 0.45)
    south_sudan_count = int(total_count * 0.35)
    other_count = total_count - kenya_count - south_sudan_count
    
    print(f"Generating {kenya_count} Kenyan businesses...")
    for i in range(kenya_count):
        city = weighted_choice(KENYA_CITIES)
        category = weighted_choice(BUSINESS_CATEGORIES)
        
        # Generate unique phone
        phone = generate_phone_number('KE')
        attempts = 0
        while phone in used_phones and attempts < 100:
            phone = generate_phone_number('KE')
            attempts += 1
        if attempts >= 100:
            continue  # Skip this one if we can't generate a unique phone
        used_phones.add(phone)
        
        # Generate unique name
        name = generate_business_name(category, city)
        attempt = 0
        while name in used_names and attempt < 10:
            name = generate_business_name(category, city) + f" {random.randint(1, 99)}"
            attempt += 1
        used_names.add(name)
        
        businesses.append({
            'name': name,
            'phone': phone,
            'email': None,  # Most small businesses don't have email
            'address': generate_address(city, 'Kenya'),
            'city': city,
            'country': 'KE',
            'business_type': category,
            'description': f"{category} business in {city}, Kenya"
        })
        
        if (i + 1) % 500 == 0:
            print(f"  Generated {i + 1} Kenyan businesses...")
    
    print(f"Generating {south_sudan_count} South Sudanese businesses...")
    for i in range(south_sudan_count):
        city = weighted_choice(SOUTH_SUDAN_CITIES)
        category = weighted_choice(BUSINESS_CATEGORIES)
        
        # Generate unique phone
        phone = generate_phone_number('SS')
        attempts = 0
        while phone in used_phones and attempts < 100:
            phone = generate_phone_number('SS')
            attempts += 1
        if attempts >= 100:
            continue
        used_phones.add(phone)
        
        # Generate unique name
        name = generate_business_name(category, city)
        attempt = 0
        while name in used_names and attempt < 10:
            name = generate_business_name(category, city) + f" {random.randint(1, 99)}"
            attempt += 1
        used_names.add(name)
        
        businesses.append({
            'name': name,
            'phone': phone,
            'email': None,
            'address': generate_address(city, 'South Sudan'),
            'city': city,
            'country': 'SS',
            'business_type': category,
            'description': f"{category} business in {city}, South Sudan"
        })
        
        if (i + 1) % 500 == 0:
            print(f"  Generated {i + 1} South Sudanese businesses...")
    
    print(f"Generating {other_count} businesses from other African countries...")
    for i in range(other_count):
        country = random.choice(list(OTHER_AFRICAN_CITIES.keys()))
        city = weighted_choice(OTHER_AFRICAN_CITIES[country])
        category = weighted_choice(BUSINESS_CATEGORIES)
        
        # Generate unique phone
        phone = generate_phone_number(country)
        attempts = 0
        while phone in used_phones and attempts < 100:
            phone = generate_phone_number(country)
            attempts += 1
        if attempts >= 100:
            continue
        used_phones.add(phone)
        
        # Generate unique name
        name = generate_business_name(category, city)
        attempt = 0
        while name in used_names and attempt < 10:
            name = generate_business_name(category, city) + f" {random.randint(1, 99)}"
            attempt += 1
        used_names.add(name)
        
        country_names = {
            'UG': 'Uganda', 'TZ': 'Tanzania', 'ET': 'Ethiopia', 'RW': 'Rwanda'
        }
        
        businesses.append({
            'name': name,
            'phone': phone,
            'email': None,
            'address': generate_address(city, country_names[country]),
            'city': city,
            'country': country,
            'business_type': category,
            'description': f"{category} business in {city}, {country_names[country]}"
        })
        
        if (i + 1) % 200 == 0:
            print(f"  Generated {i + 1} other African businesses...")
    
    return businesses

def insert_businesses(businesses):
    """Insert businesses using Django ORM"""
    print(f"\nInserting {len(businesses)} businesses into database...")
    
    # Create PlaceholderBusiness objects
    business_objects = []
    for b in businesses:
        business_objects.append(PlaceholderBusiness(
            name=b['name'],
            phone=b['phone'],
            email=b['email'],
            address=b['address'],
            city=b['city'],
            country=b['country'],
            business_type=b['business_type'],
            description=b['description'],
            opted_out=False,
            converted_to_real_business=False,
            contact_attempts=0
        ))
    
    # Bulk create with ignore_conflicts to handle any duplicate phones
    batch_size = 500
    total_created = 0
    
    with transaction.atomic():
        for i in range(0, len(business_objects), batch_size):
            batch = business_objects[i:i + batch_size]
            created = PlaceholderBusiness.objects.bulk_create(
                batch, 
                ignore_conflicts=True,
                batch_size=batch_size
            )
            total_created += len(created)
            print(f"  Inserted batch {i // batch_size + 1} ({len(created)} businesses)")
    
    return total_created

def main():
    """Main function"""
    print("=" * 60)
    print("AFRICAN BUSINESS POPULATION SCRIPT (Django Version)")
    print("=" * 60)
    print(f"Target: 10,000 businesses")
    print(f"Focus: Kenya (45%), South Sudan (35%), Other Africa (20%)")
    print("=" * 60)
    
    # Generate businesses
    print("\nGenerating businesses...")
    businesses = generate_businesses(10000)
    print(f"\nGenerated {len(businesses)} total businesses")
    
    # Count by country
    country_counts = {}
    for b in businesses:
        country_counts[b['country']] = country_counts.get(b['country'], 0) + 1
    
    print("\nBusinesses by country:")
    for country, count in sorted(country_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"  {country}: {count}")
    
    # Insert into database
    print("\n" + "=" * 60)
    print("INSERTING INTO DATABASE")
    print("=" * 60)
    
    total_created = insert_businesses(businesses)
    
    # Get final count
    total_count = PlaceholderBusiness.objects.count()
    
    print("\n" + "=" * 60)
    print("SCRIPT COMPLETED SUCCESSFULLY!")
    print("=" * 60)
    print(f"\nInserted {total_created} new businesses")
    print(f"Total businesses in database: {total_count}")
    print("\nThe mobile app should now show these businesses in the marketplace.")

if __name__ == "__main__":
    main()