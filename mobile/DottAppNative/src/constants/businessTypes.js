// Business Types Configuration for Progressive Registration
// This matches the backend business_types.py structure

export const ENTITY_TYPES = [
  { value: 'INDIVIDUAL', label: 'Individual Service Provider', description: 'Freelancer, Sole Proprietor, Independent Contractor' },
  { value: 'SMALL_BUSINESS', label: 'Small Business', description: '1-10 employees' },
  { value: 'MEDIUM_BUSINESS', label: 'Medium Business', description: '11-50 employees' },
  { value: 'LARGE_COMPANY', label: 'Large Company', description: '50+ employees' },
  { value: 'NON_PROFIT', label: 'Non-Profit Organization', description: 'NGO, Charity, Foundation' },
];

export const INDIVIDUAL_CATEGORIES = {
  'TRANSPORT_DELIVERY': {
    label: 'Transportation & Delivery',
    icon: 'car-outline',
    types: [
      { value: 'COURIER', label: 'Courier/Delivery Driver', requiresVehicle: true },
      { value: 'TAXI_DRIVER', label: 'Taxi/Ride Share Driver', requiresVehicle: true },
      { value: 'TRUCK_DRIVER', label: 'Truck/Freight Driver', requiresVehicle: true },
      { value: 'BODA_BODA', label: 'Boda Boda (Motorcycle Taxi)', requiresVehicle: true },
      { value: 'MOVING_SERVICES', label: 'Moving Services', requiresVehicle: true },
    ]
  },
  'HOME_SERVICES': {
    label: 'Home & Trade Services',
    icon: 'hammer-outline',
    types: [
      { value: 'PLUMBER', label: 'Plumber' },
      { value: 'ELECTRICIAN', label: 'Electrician' },
      { value: 'CARPENTER', label: 'Carpenter' },
      { value: 'PAINTER', label: 'Painter' },
      { value: 'MASON', label: 'Mason/Bricklayer' },
      { value: 'WELDER', label: 'Welder' },
      { value: 'MECHANIC', label: 'Mechanic' },
      { value: 'HVAC_TECH', label: 'HVAC Technician' },
      { value: 'HANDYMAN', label: 'General Handyman' },
      { value: 'CLEANER', label: 'Cleaner/Housekeeper' },
      { value: 'LANDSCAPER', label: 'Landscaper/Gardener' },
      { value: 'PEST_CONTROL', label: 'Pest Control' },
    ]
  },
  'PROFESSIONAL': {
    label: 'Professional Services',
    icon: 'briefcase-outline',
    types: [
      { value: 'CONSULTANT', label: 'Consultant' },
      { value: 'ACCOUNTANT', label: 'Accountant' },
      { value: 'LAWYER', label: 'Lawyer/Legal Advisor' },
      { value: 'REAL_ESTATE_AGENT', label: 'Real Estate Agent' },
      { value: 'INSURANCE_AGENT', label: 'Insurance Agent' },
      { value: 'FINANCIAL_ADVISOR', label: 'Financial Advisor' },
      { value: 'TAX_PREPARER', label: 'Tax Preparer' },
      { value: 'TRANSLATOR', label: 'Translator/Interpreter' },
    ]
  },
  'CREATIVE': {
    label: 'Creative & Digital Services',
    icon: 'color-palette-outline',
    types: [
      { value: 'PHOTOGRAPHER', label: 'Photographer' },
      { value: 'VIDEOGRAPHER', label: 'Videographer' },
      { value: 'GRAPHIC_DESIGNER', label: 'Graphic Designer' },
      { value: 'WEB_DEVELOPER', label: 'Web Developer' },
      { value: 'APP_DEVELOPER', label: 'App Developer' },
      { value: 'CONTENT_CREATOR', label: 'Content Creator' },
      { value: 'SOCIAL_MEDIA_MANAGER', label: 'Social Media Manager' },
      { value: 'WRITER', label: 'Writer/Copywriter' },
      { value: 'MUSICIAN', label: 'Musician/DJ' },
      { value: 'ARTIST', label: 'Artist' },
    ]
  },
  'PERSONAL_CARE': {
    label: 'Personal Care & Wellness',
    icon: 'heart-outline',
    types: [
      { value: 'HAIRSTYLIST', label: 'Hairstylist/Barber' },
      { value: 'MAKEUP_ARTIST', label: 'Makeup Artist' },
      { value: 'NAIL_TECHNICIAN', label: 'Nail Technician' },
      { value: 'MASSAGE_THERAPIST', label: 'Massage Therapist' },
      { value: 'PERSONAL_TRAINER', label: 'Personal Trainer' },
      { value: 'YOGA_INSTRUCTOR', label: 'Yoga Instructor' },
      { value: 'NUTRITIONIST', label: 'Nutritionist' },
      { value: 'LIFE_COACH', label: 'Life Coach' },
    ]
  },
  'EDUCATION': {
    label: 'Education & Training',
    icon: 'school-outline',
    types: [
      { value: 'TUTOR', label: 'Private Tutor' },
      { value: 'LANGUAGE_TEACHER', label: 'Language Teacher' },
      { value: 'MUSIC_TEACHER', label: 'Music Teacher' },
      { value: 'DRIVING_INSTRUCTOR', label: 'Driving Instructor' },
      { value: 'SPORTS_COACH', label: 'Sports Coach' },
      { value: 'SKILLS_TRAINER', label: 'Skills Trainer' },
    ]
  },
  'SPECIALIZED': {
    label: 'Specialized Services',
    icon: 'construct-outline',
    types: [
      { value: 'TAILOR', label: 'Tailor/Seamstress' },
      { value: 'COBBLER', label: 'Cobbler/Shoe Repair' },
      { value: 'LOCKSMITH', label: 'Locksmith' },
      { value: 'SECURITY_GUARD', label: 'Security Guard' },
      { value: 'EVENT_PLANNER', label: 'Event Planner' },
      { value: 'CATERER', label: 'Caterer' },
      { value: 'TOUR_GUIDE', label: 'Tour Guide' },
      { value: 'PET_GROOMER', label: 'Pet Groomer' },
      { value: 'VETERINARY_ASSISTANT', label: 'Veterinary Assistant' },
    ]
  }
};

export const BUSINESS_CATEGORIES = {
  'RETAIL_COMMERCE': {
    label: 'Retail & Commerce',
    icon: 'storefront-outline',
    types: [
      { value: 'RETAIL_STORE', label: 'General Retail Store' },
      { value: 'GROCERY_MARKET', label: 'Grocery/Supermarket' },
      { value: 'FASHION_CLOTHING', label: 'Fashion & Clothing' },
      { value: 'ELECTRONICS_TECH', label: 'Electronics Store' },
      { value: 'HARDWARE_BUILDING', label: 'Hardware & Building Supplies' },
      { value: 'PHARMACY', label: 'Pharmacy' },
      { value: 'BOOKSTORE_STATIONERY', label: 'Bookstore & Stationery' },
      { value: 'ONLINE_STORE', label: 'E-commerce/Online Store' },
      { value: 'MOBILE_MONEY', label: 'Mobile Money Agent' },
      { value: 'FUEL_STATION', label: 'Fuel/Petrol Station' },
    ]
  },
  'FOOD_HOSPITALITY': {
    label: 'Food & Hospitality',
    icon: 'restaurant-outline',
    types: [
      { value: 'RESTAURANT_CAFE', label: 'Restaurant/Cafe' },
      { value: 'FAST_FOOD', label: 'Fast Food' },
      { value: 'BAKERY', label: 'Bakery' },
      { value: 'BAR_NIGHTCLUB', label: 'Bar/Nightclub' },
      { value: 'HOTEL_HOSPITALITY', label: 'Hotel/Lodge' },
      { value: 'GUEST_HOUSE', label: 'Guest House/B&B' },
      { value: 'CATERING_SERVICE', label: 'Catering Service' },
      { value: 'FOOD_DELIVERY', label: 'Food Delivery Service' },
    ]
  },
  'HEALTHCARE': {
    label: 'Healthcare & Wellness',
    icon: 'medical-outline',
    types: [
      { value: 'MEDICAL_DENTAL', label: 'Medical/Dental Clinic' },
      { value: 'VETERINARY', label: 'Veterinary Clinic' },
      { value: 'LABORATORY', label: 'Medical Laboratory' },
      { value: 'OPTICAL', label: 'Optical/Eye Care' },
      { value: 'PHYSIOTHERAPY', label: 'Physiotherapy Center' },
      { value: 'MENTAL_HEALTH', label: 'Mental Health Services' },
      { value: 'TRADITIONAL_MEDICINE', label: 'Traditional Medicine' },
    ]
  },
  'PROFESSIONAL_SERVICES': {
    label: 'Professional Services',
    icon: 'business-outline',
    types: [
      { value: 'CONSULTING_FIRM', label: 'Consulting Firm' },
      { value: 'LAW_FIRM', label: 'Law Firm' },
      { value: 'ACCOUNTING_FIRM', label: 'Accounting Firm' },
      { value: 'REAL_ESTATE', label: 'Real Estate Agency' },
      { value: 'INSURANCE_COMPANY', label: 'Insurance Services' },
      { value: 'FINANCIAL_SERVICES', label: 'Financial Services' },
      { value: 'MARKETING_AGENCY', label: 'Marketing/Advertising Agency' },
    ]
  },
  'MANUFACTURING': {
    label: 'Manufacturing & Production',
    icon: 'cog-outline',
    types: [
      { value: 'MANUFACTURING', label: 'Manufacturing' },
      { value: 'FOOD_PROCESSING', label: 'Food Processing' },
      { value: 'TEXTILE_GARMENT', label: 'Textile & Garment' },
      { value: 'FURNITURE_MAKING', label: 'Furniture Making' },
      { value: 'PRINTING_PUBLISHING', label: 'Printing & Publishing' },
      { value: 'PACKAGING', label: 'Packaging Services' },
    ]
  },
  'TECHNOLOGY': {
    label: 'Technology & Digital',
    icon: 'laptop-outline',
    types: [
      { value: 'SOFTWARE_COMPANY', label: 'Software Company' },
      { value: 'IT_SERVICES', label: 'IT Services & Support' },
      { value: 'TELECOM', label: 'Telecommunications' },
      { value: 'INTERNET_CAFE', label: 'Internet Cafe' },
      { value: 'COMPUTER_REPAIR', label: 'Computer/Phone Repair' },
      { value: 'WEB_HOSTING', label: 'Web Hosting/Domain Services' },
    ]
  },
  'CONSTRUCTION': {
    label: 'Construction & Real Estate',
    icon: 'home-outline',
    types: [
      { value: 'CONSTRUCTION', label: 'Construction Company' },
      { value: 'ARCHITECTURE', label: 'Architecture Firm' },
      { value: 'PROPERTY_MANAGEMENT', label: 'Property Management' },
      { value: 'INTERIOR_DESIGN', label: 'Interior Design' },
      { value: 'LANDSCAPING_COMPANY', label: 'Landscaping Company' },
    ]
  },
  'TRANSPORT_LOGISTICS': {
    label: 'Transport & Logistics',
    icon: 'airplane-outline',
    types: [
      { value: 'TRANSPORT_SERVICE', label: 'Transport Company' },
      { value: 'LOGISTICS_FREIGHT', label: 'Logistics & Freight' },
      { value: 'COURIER_COMPANY', label: 'Courier Company' },
      { value: 'CAR_RENTAL', label: 'Car Rental' },
      { value: 'TOUR_OPERATOR', label: 'Tour Operator' },
      { value: 'TRAVEL_AGENCY', label: 'Travel Agency' },
    ]
  },
  'EDUCATION_TRAINING': {
    label: 'Education & Training',
    icon: 'school-outline',
    types: [
      { value: 'SCHOOL', label: 'School/College' },
      { value: 'TRAINING_CENTER', label: 'Training Center' },
      { value: 'DAYCARE', label: 'Daycare/Nursery' },
      { value: 'DRIVING_SCHOOL', label: 'Driving School' },
      { value: 'LANGUAGE_SCHOOL', label: 'Language School' },
      { value: 'VOCATIONAL_TRAINING', label: 'Vocational Training' },
    ]
  },
  'AGRICULTURE': {
    label: 'Agriculture & Farming',
    icon: 'leaf-outline',
    types: [
      { value: 'FARM', label: 'Farm/Agricultural Business' },
      { value: 'LIVESTOCK', label: 'Livestock/Poultry' },
      { value: 'AGRO_PROCESSING', label: 'Agro-processing' },
      { value: 'AGRICULTURAL_SUPPLIES', label: 'Agricultural Supplies' },
      { value: 'FISHERY', label: 'Fishery/Aquaculture' },
    ]
  },
  'OTHER': {
    label: 'Other Services',
    icon: 'ellipsis-horizontal-outline',
    types: [
      { value: 'FITNESS_CENTER', label: 'Gym/Fitness Center' },
      { value: 'SALON_SPA', label: 'Beauty Salon/Spa' },
      { value: 'ENTERTAINMENT', label: 'Entertainment/Recreation' },
      { value: 'IMPORT_EXPORT', label: 'Import/Export' },
      { value: 'MINING_ENERGY', label: 'Mining/Energy' },
      { value: 'WASTE_MANAGEMENT', label: 'Waste Management' },
      { value: 'SECURITY_COMPANY', label: 'Security Company' },
      { value: 'CLEANING_COMPANY', label: 'Cleaning Company' },
      { value: 'EVENT_MANAGEMENT', label: 'Event Management' },
      { value: 'OTHER', label: 'Other' },
    ]
  }
};

export const REGISTRATION_STATUS = [
  { value: 'REGISTERED', label: 'Yes, fully registered' },
  { value: 'INFORMAL', label: 'No, operating informally' },
  { value: 'IN_PROCESS', label: 'Registration in process' },
];

export const VEHICLE_TYPES = [
  { value: 'bicycle', label: 'Bicycle', requiresLicense: false },
  { value: 'motorcycle', label: 'Motorcycle/Boda Boda', requiresLicense: true },
  { value: 'scooter', label: 'Scooter', requiresLicense: true },
  { value: 'car', label: 'Car', requiresLicense: true },
  { value: 'van', label: 'Van', requiresLicense: true },
  { value: 'truck', label: 'Truck', requiresLicense: true },
];

export const DELIVERY_CATEGORIES = [
  { value: 'food', label: 'Food & Beverages', icon: 'fast-food-outline' },
  { value: 'groceries', label: 'Groceries & Essentials', icon: 'basket-outline' },
  { value: 'packages', label: 'Packages & Documents', icon: 'cube-outline' },
  { value: 'medicine', label: 'Medicine & Healthcare', icon: 'medical-outline' },
  { value: 'electronics', label: 'Electronics & Gadgets', icon: 'phone-portrait-outline' },
  { value: 'clothing', label: 'Clothing & Fashion', icon: 'shirt-outline' },
  { value: 'fragile', label: 'Fragile Items', icon: 'warning-outline' },
  { value: 'heavy', label: 'Heavy/Large Items', icon: 'barbell-outline' },
  { value: 'all', label: 'All Categories', icon: 'checkmark-circle-outline' },
];

// Helper function to get all business types for backend
export const getAllBusinessTypes = () => {
  const types = [];
  
  // Add individual service provider types
  Object.values(INDIVIDUAL_CATEGORIES).forEach(category => {
    category.types.forEach(type => {
      types.push({
        value: type.value,
        label: type.label,
        category: 'INDIVIDUAL',
        requiresVehicle: type.requiresVehicle || false
      });
    });
  });
  
  // Add business types
  Object.values(BUSINESS_CATEGORIES).forEach(category => {
    category.types.forEach(type => {
      types.push({
        value: type.value,
        label: type.label,
        category: 'BUSINESS'
      });
    });
  });
  
  return types;
};

// Map to backend business types (from business_types.py)
export const mapToBackendType = (frontendType) => {
  const mapping = {
    // Individual service providers
    'COURIER': 'TRANSPORT_SERVICE',
    'TAXI_DRIVER': 'TRANSPORT_SERVICE',
    'TRUCK_DRIVER': 'TRANSPORT_SERVICE',
    'BODA_BODA': 'TRANSPORT_SERVICE',
    'PLUMBER': 'HOME_SERVICES',
    'ELECTRICIAN': 'HOME_SERVICES',
    'CARPENTER': 'HOME_SERVICES',
    'MECHANIC': 'AUTOMOTIVE_REPAIR',
    'CONSULTANT': 'PROFESSIONAL_SERVICES',
    'PHOTOGRAPHER': 'CREATIVE_SERVICES',
    'HAIRSTYLIST': 'SALON_SPA',
    'TUTOR': 'EDUCATION_TRAINING',
    
    // Businesses - direct mapping
    'RETAIL_STORE': 'RETAIL_STORE',
    'RESTAURANT_CAFE': 'RESTAURANT_CAFE',
    'MEDICAL_DENTAL': 'MEDICAL_DENTAL',
    'HOTEL_HOSPITALITY': 'HOTEL_HOSPITALITY',
    // ... add more mappings as needed
    
    // Default
    'OTHER': 'OTHER'
  };
  
  return mapping[frontendType] || 'OTHER';
};