"""
Marketplace Category Configuration
Defines the hierarchical category structure for marketplace businesses
with main categories, subcategories, and auto-detection keywords.
"""

MARKETPLACE_CATEGORIES = {
    'food': {
        'name': 'Food & Dining',
        'icon': 'restaurant',
        'color': '#ff6b6b',
        'subcategories': {
            'all': {
                'name': 'All Food',
                'business_types': ['RESTAURANT_CAFE', 'GROCERY_MARKET', 'EVENT_PLANNING'],
                'keywords': []
            },
            'burgers': {
                'name': 'Burgers',
                'business_types': ['RESTAURANT_CAFE'],
                'keywords': ['burger', 'hamburger', 'beef burger', 'cheeseburger', 'grill', 'patty']
            },
            'pizza': {
                'name': 'Pizza',
                'business_types': ['RESTAURANT_CAFE'],
                'keywords': ['pizza', 'pizzeria', 'italian', 'margherita', 'pepperoni']
            },
            'local_cuisine': {
                'name': 'Local Cuisine',
                'business_types': ['RESTAURANT_CAFE'],
                'keywords': ['local', 'traditional', 'south sudan', 'sudanese', 'african', 'kisra', 'asida', 'ful', 'tamiya']
            },
            'chinese': {
                'name': 'Chinese & Asian',
                'business_types': ['RESTAURANT_CAFE'],
                'keywords': ['chinese', 'asian', 'noodle', 'wok', 'rice', 'sushi', 'japanese', 'thai', 'vietnamese']
            },
            'seafood': {
                'name': 'Seafood',
                'business_types': ['RESTAURANT_CAFE'],
                'keywords': ['fish', 'seafood', 'ocean', 'marine', 'sushi', 'shrimp', 'lobster', 'crab', 'tilapia']
            },
            'bbq_grill': {
                'name': 'BBQ & Grill',
                'business_types': ['RESTAURANT_CAFE'],
                'keywords': ['bbq', 'barbecue', 'grill', 'roast', 'kebab', 'nyama choma', 'suya']
            },
            'bakery': {
                'name': 'Bakery & Desserts',
                'business_types': ['RESTAURANT_CAFE', 'GROCERY_MARKET'],
                'keywords': ['bakery', 'cake', 'bread', 'pastry', 'dessert', 'sweet', 'donut', 'croissant', 'muffin']
            },
            'fast_food': {
                'name': 'Fast Food',
                'business_types': ['RESTAURANT_CAFE'],
                'keywords': ['fast food', 'quick', 'takeaway', 'drive', 'express', 'fried chicken', 'kfc', 'mcdonald']
            },
            'fine_dining': {
                'name': 'Fine Dining',
                'business_types': ['RESTAURANT_CAFE'],
                'keywords': ['fine dining', 'restaurant', 'gourmet', 'luxury', 'premium', 'continental']
            },
            'cafes': {
                'name': 'Cafes & Coffee',
                'business_types': ['RESTAURANT_CAFE'],
                'keywords': ['cafe', 'coffee', 'espresso', 'latte', 'tea', 'cappuccino', 'barista', 'brew']
            },
            'drinks': {
                'name': 'Drinks & Beverages',
                'business_types': ['RESTAURANT_CAFE', 'GROCERY_MARKET'],
                'keywords': ['juice', 'smoothie', 'beverage', 'drink', 'bar', 'pub', 'wine', 'beer']
            },
            'other_food': {
                'name': 'Other Food',
                'business_types': ['RESTAURANT_CAFE', 'GROCERY_MARKET', 'EVENT_PLANNING'],
                'keywords': []
            }
        }
    },
    'shopping': {
        'name': 'Shopping',
        'icon': 'cart',
        'color': '#4ecdc4',
        'subcategories': {
            'all': {
                'name': 'All Shopping',
                'business_types': ['RETAIL_STORE', 'FASHION_CLOTHING', 'ELECTRONICS_TECH', 'GROCERY_MARKET', 'PHARMACY', 'HARDWARE_BUILDING', 'BOOKSTORE_STATIONERY', 'ONLINE_STORE'],
                'keywords': []
            },
            'clothing': {
                'name': 'Clothing & Fashion',
                'business_types': ['FASHION_CLOTHING', 'RETAIL_STORE'],
                'keywords': ['clothing', 'fashion', 'clothes', 'dress', 'shirt', 'pants', 'suit', 'boutique', 'apparel', 'wear']
            },
            'electronics': {
                'name': 'Electronics',
                'business_types': ['ELECTRONICS_TECH', 'RETAIL_STORE'],
                'keywords': ['electronics', 'phone', 'computer', 'laptop', 'tablet', 'gadget', 'tech', 'mobile', 'samsung', 'apple']
            },
            'groceries': {
                'name': 'Groceries & Supermarkets',
                'business_types': ['GROCERY_MARKET'],
                'keywords': ['grocery', 'supermarket', 'market', 'food store', 'provisions', 'vegetables', 'fruits']
            },
            'pharmacy': {
                'name': 'Pharmacy & Health',
                'business_types': ['PHARMACY'],
                'keywords': ['pharmacy', 'medicine', 'drug', 'chemist', 'medical supplies', 'health store']
            },
            'furniture': {
                'name': 'Furniture & Home',
                'business_types': ['RETAIL_STORE'],
                'keywords': ['furniture', 'home decor', 'sofa', 'bed', 'table', 'chair', 'interior', 'decor']
            },
            'sports': {
                'name': 'Sports & Outdoors',
                'business_types': ['RETAIL_STORE'],
                'keywords': ['sports', 'gym equipment', 'fitness', 'outdoor', 'athletic', 'sportswear', 'football', 'basketball']
            },
            'books': {
                'name': 'Books & Stationery',
                'business_types': ['BOOKSTORE_STATIONERY', 'RETAIL_STORE'],
                'keywords': ['book', 'stationery', 'office supplies', 'pen', 'notebook', 'library', 'reading']
            },
            'hardware': {
                'name': 'Hardware & Tools',
                'business_types': ['HARDWARE_BUILDING', 'RETAIL_STORE'],
                'keywords': ['hardware', 'tools', 'building supplies', 'construction', 'paint', 'plumbing', 'electrical']
            },
            'jewelry': {
                'name': 'Jewelry & Accessories',
                'business_types': ['RETAIL_STORE', 'FASHION_CLOTHING'],
                'keywords': ['jewelry', 'jewellery', 'gold', 'silver', 'watch', 'accessories', 'necklace', 'ring', 'bracelet']
            },
            'other_shopping': {
                'name': 'Other Shopping',
                'business_types': ['RETAIL_STORE', 'ONLINE_STORE'],
                'keywords': []
            }
        }
    },
    'beauty': {
        'name': 'Beauty & Wellness',
        'icon': 'color-palette',
        'color': '#ff6b9d',
        'subcategories': {
            'all': {
                'name': 'All Beauty',
                'business_types': ['SALON_SPA'],
                'keywords': []
            },
            'hair_salon': {
                'name': 'Hair Salons',
                'business_types': ['SALON_SPA'],
                'keywords': ['hair salon', 'hairdresser', 'hair stylist', 'hair cut', 'hair style', 'braiding', 'weave']
            },
            'nail_salon': {
                'name': 'Nail Salons',
                'business_types': ['SALON_SPA'],
                'keywords': ['nail', 'manicure', 'pedicure', 'nail art', 'nail polish', 'nail salon']
            },
            'spa': {
                'name': 'Spa & Massage',
                'business_types': ['SALON_SPA'],
                'keywords': ['spa', 'massage', 'wellness', 'relaxation', 'therapy', 'treatment', 'sauna', 'steam']
            },
            'barber': {
                'name': 'Barber Shops',
                'business_types': ['SALON_SPA'],
                'keywords': ['barber', 'barbershop', 'men salon', 'shave', 'beard', 'trim', 'haircut men']
            },
            'makeup': {
                'name': 'Makeup & Cosmetics',
                'business_types': ['SALON_SPA', 'RETAIL_STORE'],
                'keywords': ['makeup', 'cosmetics', 'beauty products', 'skincare', 'facial', 'beautician', 'mua']
            },
            'other_beauty': {
                'name': 'Other Beauty Services',
                'business_types': ['SALON_SPA'],
                'keywords': []
            }
        }
    },
    'transport': {
        'name': 'Transport',
        'icon': 'car',
        'color': '#95e1d3',
        'subcategories': {
            'all': {
                'name': 'All Transport',
                'business_types': ['TRANSPORT_SERVICE', 'AUTOMOTIVE_REPAIR', 'AUTO_PARTS_REPAIR'],
                'keywords': []
            },
            'taxi': {
                'name': 'Taxi & Ride',
                'business_types': ['TRANSPORT_SERVICE'],
                'keywords': ['taxi', 'cab', 'ride', 'uber', 'boda boda', 'rickshaw', 'transport']
            },
            'car_rental': {
                'name': 'Car Rental',
                'business_types': ['TRANSPORT_SERVICE'],
                'keywords': ['car rental', 'rent a car', 'vehicle hire', 'car hire', 'rental']
            },
            'bus': {
                'name': 'Bus & Shuttle',
                'business_types': ['TRANSPORT_SERVICE'],
                'keywords': ['bus', 'shuttle', 'coach', 'public transport', 'transit']
            },
            'delivery': {
                'name': 'Delivery & Courier',
                'business_types': ['TRANSPORT_SERVICE', 'LOGISTICS_FREIGHT'],
                'keywords': ['delivery', 'courier', 'shipping', 'logistics', 'freight', 'cargo']
            },
            'auto_repair': {
                'name': 'Auto Repair',
                'business_types': ['AUTOMOTIVE_REPAIR', 'AUTO_PARTS_REPAIR'],
                'keywords': ['mechanic', 'auto repair', 'car repair', 'garage', 'service', 'maintenance']
            },
            'fuel_station': {
                'name': 'Fuel Stations',
                'business_types': ['FUEL_STATION'],
                'keywords': ['fuel', 'petrol', 'gas station', 'diesel', 'filling station']
            },
            'other_transport': {
                'name': 'Other Transport',
                'business_types': ['TRANSPORT_SERVICE'],
                'keywords': []
            }
        }
    },
    'health': {
        'name': 'Health & Medical',
        'icon': 'medical',
        'color': '#3d5af1',
        'subcategories': {
            'all': {
                'name': 'All Health',
                'business_types': ['MEDICAL_DENTAL', 'PHARMACY', 'VETERINARY'],
                'keywords': []
            },
            'hospital': {
                'name': 'Hospitals',
                'business_types': ['MEDICAL_DENTAL'],
                'keywords': ['hospital', 'medical center', 'health center', 'emergency']
            },
            'clinic': {
                'name': 'Clinics',
                'business_types': ['MEDICAL_DENTAL'],
                'keywords': ['clinic', 'medical clinic', 'health clinic', 'doctor', 'physician']
            },
            'dental': {
                'name': 'Dental',
                'business_types': ['MEDICAL_DENTAL'],
                'keywords': ['dental', 'dentist', 'teeth', 'orthodontist', 'oral']
            },
            'pharmacy': {
                'name': 'Pharmacy',
                'business_types': ['PHARMACY'],
                'keywords': ['pharmacy', 'drug store', 'chemist', 'medicine']
            },
            'lab': {
                'name': 'Labs & Diagnostics',
                'business_types': ['MEDICAL_DENTAL'],
                'keywords': ['lab', 'laboratory', 'diagnostic', 'test', 'x-ray', 'scan', 'ultrasound']
            },
            'veterinary': {
                'name': 'Veterinary',
                'business_types': ['VETERINARY'],
                'keywords': ['vet', 'veterinary', 'animal clinic', 'pet care', 'animal hospital']
            },
            'other_health': {
                'name': 'Other Health Services',
                'business_types': ['MEDICAL_DENTAL'],
                'keywords': []
            }
        }
    },
    'services': {
        'name': 'Services',
        'icon': 'construct',
        'color': '#f38181',
        'subcategories': {
            'all': {
                'name': 'All Services',
                'business_types': ['PROFESSIONAL_SERVICES', 'HOME_SERVICES', 'CONSTRUCTION', 'CLEANING', 'CREATIVE_SERVICES', 'TECH_SERVICES', 'PRINT_MEDIA', 'EVENT_PLANNING', 'SECURITY_SERVICES'],
                'keywords': []
            },
            'home_services': {
                'name': 'Home Services',
                'business_types': ['HOME_SERVICES', 'CLEANING'],
                'keywords': ['plumbing', 'electrical', 'hvac', 'repair', 'maintenance', 'handyman', 'painter']
            },
            'cleaning': {
                'name': 'Cleaning & Laundry',
                'business_types': ['CLEANING'],
                'keywords': ['cleaning', 'laundry', 'dry cleaning', 'wash', 'housekeeping', 'janitorial']
            },
            'professional': {
                'name': 'Professional Services',
                'business_types': ['PROFESSIONAL_SERVICES'],
                'keywords': ['lawyer', 'legal', 'accounting', 'consulting', 'attorney', 'advocate', 'consultant']
            },
            'tech_services': {
                'name': 'Tech & IT Services',
                'business_types': ['TECH_SERVICES'],
                'keywords': ['computer repair', 'it support', 'software', 'tech support', 'network', 'programming']
            },
            'printing': {
                'name': 'Printing & Media',
                'business_types': ['PRINT_MEDIA'],
                'keywords': ['printing', 'print shop', 'copy', 'design', 'graphics', 'banner', 'signage']
            },
            'event_planning': {
                'name': 'Event Planning',
                'business_types': ['EVENT_PLANNING'],
                'keywords': ['event', 'wedding', 'party', 'catering', 'decoration', 'planning', 'ceremony']
            },
            'security': {
                'name': 'Security Services',
                'business_types': ['SECURITY_SERVICES'],
                'keywords': ['security', 'guard', 'surveillance', 'protection', 'patrol']
            },
            'other_services': {
                'name': 'Other Services',
                'business_types': ['PROFESSIONAL_SERVICES'],
                'keywords': []
            }
        }
    },
    'education': {
        'name': 'Education',
        'icon': 'school',
        'color': '#667eea',
        'subcategories': {
            'all': {
                'name': 'All Education',
                'business_types': ['EDUCATION_TRAINING'],
                'keywords': []
            },
            'schools': {
                'name': 'Schools',
                'business_types': ['EDUCATION_TRAINING'],
                'keywords': ['school', 'primary', 'secondary', 'high school', 'academy', 'kindergarten']
            },
            'university': {
                'name': 'Universities & Colleges',
                'business_types': ['EDUCATION_TRAINING'],
                'keywords': ['university', 'college', 'institute', 'higher education', 'campus']
            },
            'training': {
                'name': 'Training Centers',
                'business_types': ['EDUCATION_TRAINING'],
                'keywords': ['training', 'course', 'workshop', 'seminar', 'skill', 'vocational']
            },
            'tutoring': {
                'name': 'Tutoring & Lessons',
                'business_types': ['EDUCATION_TRAINING'],
                'keywords': ['tutor', 'tutoring', 'lesson', 'coaching', 'teacher', 'instructor']
            },
            'other_education': {
                'name': 'Other Education',
                'business_types': ['EDUCATION_TRAINING'],
                'keywords': []
            }
        }
    },
    'more': {
        'name': 'More',
        'icon': 'grid',
        'color': '#6c757d',
        'subcategories': {
            'all': {
                'name': 'All Categories',
                'business_types': ['FITNESS_CENTER', 'HOTEL_HOSPITALITY', 'FINANCIAL_SERVICES', 'REAL_ESTATE', 'AGRICULTURE', 'MANUFACTURING', 'MOBILE_MONEY', 'TOURISM_TRAVEL', 'NON_PROFIT', 'OTHER'],
                'keywords': []
            },
            'fitness': {
                'name': 'Fitness & Sports',
                'business_types': ['FITNESS_CENTER'],
                'keywords': ['gym', 'fitness', 'sport', 'yoga', 'workout', 'exercise', 'health club']
            },
            'hotels': {
                'name': 'Hotels & Lodging',
                'business_types': ['HOTEL_HOSPITALITY'],
                'keywords': ['hotel', 'lodge', 'guest house', 'accommodation', 'motel', 'hostel', 'inn']
            },
            'financial': {
                'name': 'Financial Services',
                'business_types': ['FINANCIAL_SERVICES', 'MOBILE_MONEY'],
                'keywords': ['bank', 'finance', 'insurance', 'loan', 'money transfer', 'mpesa', 'mobile money', 'forex']
            },
            'real_estate': {
                'name': 'Real Estate',
                'business_types': ['REAL_ESTATE'],
                'keywords': ['real estate', 'property', 'house', 'apartment', 'rental', 'estate agent']
            },
            'agriculture': {
                'name': 'Agriculture',
                'business_types': ['AGRICULTURE'],
                'keywords': ['farm', 'agriculture', 'agro', 'livestock', 'crop', 'farming']
            },
            'manufacturing': {
                'name': 'Manufacturing',
                'business_types': ['MANUFACTURING'],
                'keywords': ['factory', 'manufacturing', 'production', 'industry', 'plant']
            },
            'tourism': {
                'name': 'Tourism & Travel',
                'business_types': ['TOURISM_TRAVEL'],
                'keywords': ['travel', 'tour', 'tourism', 'travel agency', 'safari', 'tourist']
            },
            'nonprofit': {
                'name': 'Non-Profit & NGO',
                'business_types': ['NON_PROFIT'],
                'keywords': ['ngo', 'non profit', 'charity', 'foundation', 'humanitarian', 'volunteer']
            },
            'other': {
                'name': 'Other',
                'business_types': ['OTHER'],
                'keywords': []
            }
        }
    }
}

def get_main_categories():
    """Get list of main categories for display"""
    return [
        {
            'id': key,
            'name': data['name'],
            'icon': data['icon'],
            'color': data['color']
        }
        for key, data in MARKETPLACE_CATEGORIES.items()
    ]

def get_subcategories(main_category):
    """Get subcategories for a main category"""
    if main_category not in MARKETPLACE_CATEGORIES:
        return []
    
    category_data = MARKETPLACE_CATEGORIES[main_category]
    subcategories = []
    
    for sub_key, sub_data in category_data['subcategories'].items():
        subcategories.append({
            'id': sub_key,
            'name': sub_data['name'],
            'key': f"{main_category}.{sub_key}",
            'business_types': sub_data.get('business_types', [])
        })
    
    return subcategories

def detect_subcategories(business_name, business_description, business_type):
    """
    Auto-detect appropriate subcategories for a business based on its details
    Returns a list of subcategory keys (e.g., ['food.burgers', 'food.fast_food'])
    """
    detected = []
    text_to_check = f"{business_name} {business_description or ''}".lower()
    
    for main_cat, cat_data in MARKETPLACE_CATEGORIES.items():
        for sub_key, sub_data in cat_data['subcategories'].items():
            if sub_key in ['all', 'other', f'other_{main_cat}']:
                continue
                
            # Check if business type matches
            if business_type in sub_data.get('business_types', []):
                # Check keywords in business name/description
                keywords = sub_data.get('keywords', [])
                for keyword in keywords:
                    if keyword.lower() in text_to_check:
                        subcategory_key = f"{main_cat}.{sub_key}"
                        if subcategory_key not in detected:
                            detected.append(subcategory_key)
                        break
    
    # If no subcategories detected, assign based on business type
    if not detected:
        for main_cat, cat_data in MARKETPLACE_CATEGORIES.items():
            for sub_key, sub_data in cat_data['subcategories'].items():
                if business_type in sub_data.get('business_types', []):
                    if sub_key.startswith('other'):
                        # Use the "other" subcategory as fallback
                        detected.append(f"{main_cat}.{sub_key}")
                        break
            if detected:
                break
    
    return detected

def get_business_types_for_subcategory(main_category, subcategory):
    """Get list of business types that belong to a subcategory"""
    if main_category not in MARKETPLACE_CATEGORIES:
        return []
    
    subcategories = MARKETPLACE_CATEGORIES[main_category].get('subcategories', {})
    if subcategory not in subcategories:
        return []
    
    return subcategories[subcategory].get('business_types', [])