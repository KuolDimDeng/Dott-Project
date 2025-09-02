"""
Django management command to populate 10,000 African businesses.
Run with: python manage.py populate_african_businesses
"""

import random
from django.core.management.base import BaseCommand
from django.db import transaction
from business.models import PlaceholderBusiness

class Command(BaseCommand):
    help = 'Populate database with 10,000 African businesses focused on Kenya and South Sudan'

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

    def generate_phone_number(self, country_code):
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

    def generate_business_name(self, category, city):
        """Generate a realistic business name"""
        prefix = random.choice(self.NAME_PREFIXES) if random.random() > 0.3 else city
        suffix = random.choice(self.BUSINESS_TYPES.get(category, ['Business']))
        
        if random.random() > 0.7:
            # Add location to name sometimes
            return f"{prefix} {suffix}"
        else:
            # Add category hint
            category_hint = category.split(' & ')[0]
            return f"{prefix} {category_hint} {suffix}"

    def generate_address(self, city, country):
        """Generate a realistic address"""
        street_num = random.randint(1, 999)
        street = random.choice(self.STREET_NAMES)
        
        if random.random() > 0.5:
            area = random.choice(['District', 'Zone', 'Area', 'Sector', 'Quarter'])
            return f"{street_num} {street} Road, {area} {random.randint(1, 20)}, {city}"
        else:
            return f"{street_num} {street} Street, {city}"

    def weighted_choice(self, choices_dict):
        """Make a weighted random choice from a dictionary"""
        choices = list(choices_dict.keys())
        weights = list(choices_dict.values())
        return random.choices(choices, weights=weights)[0]

    def handle(self, *args, **options):
        """Main command handler"""
        self.stdout.write("=" * 60)
        self.stdout.write("AFRICAN BUSINESS POPULATION COMMAND")
        self.stdout.write("=" * 60)
        self.stdout.write(f"Target: 10,000 businesses")
        self.stdout.write(f"Focus: Kenya (45%), South Sudan (35%), Other Africa (20%)")
        self.stdout.write("=" * 60)
        
        # Get existing phone numbers to avoid duplicates
        existing_phones = set(PlaceholderBusiness.objects.values_list('phone', flat=True))
        self.stdout.write(f"\nFound {len(existing_phones)} existing businesses in database")
        
        businesses = []
        used_phones = set(existing_phones)
        used_names = set()
        
        total_count = 10000
        # Distribution: 45% Kenya, 35% South Sudan, 20% other African countries
        kenya_count = int(total_count * 0.45)
        south_sudan_count = int(total_count * 0.35)
        other_count = total_count - kenya_count - south_sudan_count
        
        # Generate Kenyan businesses
        self.stdout.write(f"\nGenerating {kenya_count} Kenyan businesses...")
        for i in range(kenya_count):
            city = self.weighted_choice(self.KENYA_CITIES)
            category = self.weighted_choice(self.BUSINESS_CATEGORIES)
            
            # Generate unique phone
            phone = self.generate_phone_number('KE')
            attempts = 0
            while phone in used_phones and attempts < 100:
                phone = self.generate_phone_number('KE')
                attempts += 1
            if attempts >= 100:
                continue
            used_phones.add(phone)
            
            # Generate unique name
            name = self.generate_business_name(category, city)
            attempt = 0
            while name in used_names and attempt < 10:
                name = self.generate_business_name(category, city) + f" {random.randint(1, 99)}"
                attempt += 1
            used_names.add(name)
            
            businesses.append(PlaceholderBusiness(
                name=name,
                phone=phone,
                email=None,
                address=self.generate_address(city, 'Kenya'),
                city=city,
                country='KE',
                business_type=category,
                description=f"{category} business in {city}, Kenya",
                opted_out=False,
                converted_to_real_business=False,
                contact_attempts=0
            ))
            
            if (i + 1) % 500 == 0:
                self.stdout.write(f"  Generated {i + 1} Kenyan businesses...")
        
        # Generate South Sudanese businesses
        self.stdout.write(f"\nGenerating {south_sudan_count} South Sudanese businesses...")
        for i in range(south_sudan_count):
            city = self.weighted_choice(self.SOUTH_SUDAN_CITIES)
            category = self.weighted_choice(self.BUSINESS_CATEGORIES)
            
            # Generate unique phone
            phone = self.generate_phone_number('SS')
            attempts = 0
            while phone in used_phones and attempts < 100:
                phone = self.generate_phone_number('SS')
                attempts += 1
            if attempts >= 100:
                continue
            used_phones.add(phone)
            
            # Generate unique name
            name = self.generate_business_name(category, city)
            attempt = 0
            while name in used_names and attempt < 10:
                name = self.generate_business_name(category, city) + f" {random.randint(1, 99)}"
                attempt += 1
            used_names.add(name)
            
            businesses.append(PlaceholderBusiness(
                name=name,
                phone=phone,
                email=None,
                address=self.generate_address(city, 'South Sudan'),
                city=city,
                country='SS',
                business_type=category,
                description=f"{category} business in {city}, South Sudan",
                opted_out=False,
                converted_to_real_business=False,
                contact_attempts=0
            ))
            
            if (i + 1) % 500 == 0:
                self.stdout.write(f"  Generated {i + 1} South Sudanese businesses...")
        
        # Generate other African businesses
        self.stdout.write(f"\nGenerating {other_count} businesses from other African countries...")
        for i in range(other_count):
            country = random.choice(list(self.OTHER_AFRICAN_CITIES.keys()))
            city = self.weighted_choice(self.OTHER_AFRICAN_CITIES[country])
            category = self.weighted_choice(self.BUSINESS_CATEGORIES)
            
            # Generate unique phone
            phone = self.generate_phone_number(country)
            attempts = 0
            while phone in used_phones and attempts < 100:
                phone = self.generate_phone_number(country)
                attempts += 1
            if attempts >= 100:
                continue
            used_phones.add(phone)
            
            # Generate unique name
            name = self.generate_business_name(category, city)
            attempt = 0
            while name in used_names and attempt < 10:
                name = self.generate_business_name(category, city) + f" {random.randint(1, 99)}"
                attempt += 1
            used_names.add(name)
            
            country_names = {
                'UG': 'Uganda', 'TZ': 'Tanzania', 'ET': 'Ethiopia', 'RW': 'Rwanda'
            }
            
            businesses.append(PlaceholderBusiness(
                name=name,
                phone=phone,
                email=None,
                address=self.generate_address(city, country_names[country]),
                city=city,
                country=country,
                business_type=category,
                description=f"{category} business in {city}, {country_names[country]}",
                opted_out=False,
                converted_to_real_business=False,
                contact_attempts=0
            ))
            
            if (i + 1) % 200 == 0:
                self.stdout.write(f"  Generated {i + 1} other African businesses...")
        
        # Insert businesses in batches
        self.stdout.write(f"\n\nInserting {len(businesses)} businesses into database...")
        batch_size = 500
        total_created = 0
        
        with transaction.atomic():
            for i in range(0, len(businesses), batch_size):
                batch = businesses[i:i + batch_size]
                created = PlaceholderBusiness.objects.bulk_create(
                    batch, 
                    ignore_conflicts=True,
                    batch_size=batch_size
                )
                total_created += len(created)
                self.stdout.write(f"  Inserted batch {i // batch_size + 1} ({len(created)} businesses)")
        
        # Get final count
        total_count = PlaceholderBusiness.objects.count()
        
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write("SCRIPT COMPLETED SUCCESSFULLY!")
        self.stdout.write("=" * 60)
        self.stdout.write(f"\nInserted {total_created} new businesses")
        self.stdout.write(f"Total businesses in database: {total_count}")
        self.stdout.write("\nThe mobile app should now show these businesses in the marketplace.")
        
        self.stdout.write(self.style.SUCCESS('\n✅ Successfully populated African businesses!'))