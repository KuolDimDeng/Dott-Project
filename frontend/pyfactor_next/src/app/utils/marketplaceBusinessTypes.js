/**
 * Marketplace Business Types
 * Complete list of all business types aligned with the backend marketplace system
 * This file should be used for onboarding and business type selection
 */

export const MARKETPLACE_BUSINESS_TYPES = {
  // Food & Beverage
  FOOD_BEVERAGE: {
    label: 'Food & Beverage',
    types: [
      { value: 'restaurant', label: 'Restaurant' },
      { value: 'cafe', label: 'Cafe' },
      { value: 'bar', label: 'Bar' },
      { value: 'bakery', label: 'Bakery' },
      { value: 'food_truck', label: 'Food Truck' },
      { value: 'catering', label: 'Catering Service' },
      { value: 'grocery', label: 'Grocery Store' },
    ]
  },
  
  // Retail
  RETAIL: {
    label: 'Retail',
    types: [
      { value: 'clothing', label: 'Clothing Store' },
      { value: 'electronics', label: 'Electronics Store' },
      { value: 'furniture', label: 'Furniture Store' },
      { value: 'bookstore', label: 'Bookstore' },
      { value: 'pharmacy', label: 'Pharmacy' },
      { value: 'jewelry', label: 'Jewelry Store' },
      { value: 'sporting_goods', label: 'Sporting Goods' },
    ]
  },
  
  // Accommodation
  ACCOMMODATION: {
    label: 'Accommodation',
    types: [
      { value: 'hotel', label: 'Hotel' },
      { value: 'motel', label: 'Motel' },
      { value: 'hostel', label: 'Hostel' },
      { value: 'vacation_rental', label: 'Vacation Rental' },
      { value: 'bed_breakfast', label: 'Bed & Breakfast' },
    ]
  },
  
  // Health & Wellness
  HEALTH_WELLNESS: {
    label: 'Health & Wellness',
    types: [
      { value: 'clinic', label: 'Medical Clinic' },
      { value: 'hospital', label: 'Hospital' },
      { value: 'dentist', label: 'Dental Practice' },
      { value: 'pharmacy_clinic', label: 'Pharmacy & Clinic' },
      { value: 'therapist', label: 'Therapist' },
      { value: 'chiropractor', label: 'Chiropractor' },
    ]
  },
  
  // Beauty & Personal Care
  BEAUTY_CARE: {
    label: 'Beauty & Personal Care',
    types: [
      { value: 'salon', label: 'Hair Salon' },
      { value: 'barbershop', label: 'Barbershop' },
      { value: 'spa', label: 'Spa' },
      { value: 'nail_salon', label: 'Nail Salon' },
      { value: 'massage', label: 'Massage Therapy' },
      { value: 'tattoo', label: 'Tattoo Parlor' },
    ]
  },
  
  // Fitness & Sports
  FITNESS_SPORTS: {
    label: 'Fitness & Sports',
    types: [
      { value: 'gym', label: 'Gym/Fitness Center' },
      { value: 'yoga_studio', label: 'Yoga Studio' },
      { value: 'martial_arts', label: 'Martial Arts' },
      { value: 'sports_club', label: 'Sports Club' },
      { value: 'personal_trainer', label: 'Personal Training' },
    ]
  },
  
  // Professional Services
  PROFESSIONAL: {
    label: 'Professional Services',
    types: [
      { value: 'lawyer', label: 'Law Firm' },
      { value: 'accountant', label: 'Accounting Firm' },
      { value: 'consultant', label: 'Consulting' },
      { value: 'real_estate', label: 'Real Estate Agency' },
      { value: 'insurance', label: 'Insurance Agency' },
      { value: 'financial_advisor', label: 'Financial Advisory' },
    ]
  },
  
  // Home Services
  HOME_SERVICES: {
    label: 'Home Services',
    types: [
      { value: 'plumber', label: 'Plumbing Service' },
      { value: 'electrician', label: 'Electrical Service' },
      { value: 'carpenter', label: 'Carpentry' },
      { value: 'painter', label: 'Painting Service' },
      { value: 'landscaper', label: 'Landscaping' },
      { value: 'cleaning', label: 'Cleaning Service' },
      { value: 'pest_control', label: 'Pest Control' },
      { value: 'handyman', label: 'Handyman Services' },
    ]
  },
  
  // Transportation
  TRANSPORTATION: {
    label: 'Transportation',
    types: [
      { value: 'taxi', label: 'Taxi Service' },
      { value: 'ride_share', label: 'Ride Share' },
      { value: 'car_rental', label: 'Car Rental' },
      { value: 'bike_rental', label: 'Bike Rental' },
      { value: 'moving', label: 'Moving Company' },
      { value: 'delivery', label: 'Delivery Service' },
      { value: 'courier', label: 'Courier Service' },
    ]
  },
  
  // Education
  EDUCATION: {
    label: 'Education',
    types: [
      { value: 'school', label: 'School' },
      { value: 'university', label: 'University/College' },
      { value: 'training_center', label: 'Training Center' },
      { value: 'tutoring', label: 'Tutoring Service' },
      { value: 'driving_school', label: 'Driving School' },
      { value: 'language_school', label: 'Language School' },
    ]
  },
  
  // Entertainment & Events
  ENTERTAINMENT: {
    label: 'Entertainment & Events',
    types: [
      { value: 'event_venue', label: 'Event Venue' },
      { value: 'wedding_planner', label: 'Wedding Planning' },
      { value: 'photographer', label: 'Photography' },
      { value: 'dj', label: 'DJ Services' },
      { value: 'band', label: 'Band/Music' },
      { value: 'party_rental', label: 'Party Rentals' },
    ]
  },
  
  // Technology
  TECHNOLOGY: {
    label: 'Technology',
    types: [
      { value: 'software', label: 'Software Development' },
      { value: 'web_design', label: 'Web Design' },
      { value: 'it_support', label: 'IT Support' },
      { value: 'app_development', label: 'App Development' },
      { value: 'digital_marketing', label: 'Digital Marketing' },
    ]
  },
  
  // Automotive
  AUTOMOTIVE: {
    label: 'Automotive',
    types: [
      { value: 'auto_repair', label: 'Auto Repair Shop' },
      { value: 'car_wash', label: 'Car Wash' },
      { value: 'auto_parts', label: 'Auto Parts Store' },
      { value: 'tire_shop', label: 'Tire Shop' },
      { value: 'dealership', label: 'Vehicle Dealership' },
    ]
  },
  
  // Pet Services
  PET_SERVICES: {
    label: 'Pet Services',
    types: [
      { value: 'veterinary', label: 'Veterinary Clinic' },
      { value: 'pet_grooming', label: 'Pet Grooming' },
      { value: 'pet_boarding', label: 'Pet Boarding' },
      { value: 'pet_store', label: 'Pet Store' },
    ]
  },
  
  // Manufacturing & B2B
  MANUFACTURING: {
    label: 'Manufacturing & B2B',
    types: [
      { value: 'manufacturer', label: 'Manufacturer' },
      { value: 'wholesaler', label: 'Wholesaler' },
      { value: 'distributor', label: 'Distributor' },
      { value: 'supplier', label: 'Supplier' },
    ]
  },
  
  // Employment
  EMPLOYMENT: {
    label: 'Employment',
    types: [
      { value: 'employer', label: 'Employer/Corporation' },
      { value: 'recruitment', label: 'Recruitment Agency' },
      { value: 'temp_agency', label: 'Temp Agency' },
    ]
  },
  
  // Real Estate & Property
  REAL_ESTATE_PROPERTY: {
    label: 'Real Estate & Property',
    types: [
      { value: 'property_management', label: 'Property Management' },
      { value: 'showroom', label: 'Showroom' },
      { value: 'art_gallery', label: 'Art Gallery' },
    ]
  },
  
  // Government & Public
  GOVERNMENT_PUBLIC: {
    label: 'Government & Public',
    types: [
      { value: 'government', label: 'Government Office' },
      { value: 'nonprofit', label: 'Non-Profit Organization' },
      { value: 'utility', label: 'Utility Company' },
    ]
  },
  
  // Other
  OTHER: {
    label: 'Other',
    types: [
      { value: 'other', label: 'Other Business Type' },
    ]
  }
};

// Flatten all business types for dropdown
export const ALL_MARKETPLACE_BUSINESS_TYPES = Object.entries(MARKETPLACE_BUSINESS_TYPES)
  .flatMap(([categoryKey, category]) => 
    category.types.map(type => ({
      ...type,
      category: category.label,
      categoryKey
    }))
  );

// Map old business types to new ones for migration
export const BUSINESS_TYPE_MIGRATION_MAP = {
  // Old simplified types to new marketplace types
  'HOME_SERVICES': 'handyman',
  'CONSTRUCTION': 'carpenter',
  'CLEANING': 'cleaning',
  'AUTOMOTIVE_REPAIR': 'auto_repair',
  'PROFESSIONAL_SERVICES': 'consultant',
  'CREATIVE_SERVICES': 'web_design',
  'RETAIL_STORE': 'other',
  'RESTAURANT_CAFE': 'restaurant',
  'GROCERY_MARKET': 'grocery',
  'PHARMACY': 'pharmacy',
  'ONLINE_STORE': 'other',
  'SALON_SPA': 'spa',
  'MEDICAL_DENTAL': 'clinic',
  'VETERINARY': 'veterinary',
  'FITNESS_CENTER': 'gym',
  'AUTO_PARTS_REPAIR': 'auto_repair',
  'WAREHOUSE_STORAGE': 'other',
  'MANUFACTURING': 'manufacturer',
  'LOGISTICS_FREIGHT': 'delivery',
  'FINANCIAL_SERVICES': 'financial_advisor',
  'REAL_ESTATE': 'real_estate',
  'AGRICULTURE': 'other',
  'NON_PROFIT': 'nonprofit',
  'OTHER': 'other'
};

// Get features for a business type (backward compatibility)
export function getFeaturesForBusinessType(businessType) {
  // Map to feature sets based on business type
  const posOnlyTypes = ['restaurant', 'cafe', 'bar', 'bakery', 'grocery', 'clothing', 
                        'electronics', 'furniture', 'bookstore', 'pharmacy', 'jewelry'];
  const jobsOnlyTypes = ['plumber', 'electrician', 'carpenter', 'painter', 'landscaper',
                         'cleaning', 'consultant', 'photographer', 'moving'];
  
  if (posOnlyTypes.includes(businessType)) {
    return ['pos'];
  } else if (jobsOnlyTypes.includes(businessType)) {
    return ['jobs'];
  }
  
  // Default to both features for mixed businesses
  return ['jobs', 'pos'];
}

// Get interaction types for a business type
export function getInteractionTypesForBusiness(businessType) {
  const interactionMap = {
    // Food & Beverage - primarily orders
    'restaurant': ['order', 'booking', 'subscription'],
    'cafe': ['order'],
    'bar': ['order', 'booking'],
    'bakery': ['order'],
    'food_truck': ['order'],
    'catering': ['order', 'quote', 'booking'],
    'grocery': ['order'],
    
    // Retail - orders and some viewings
    'clothing': ['order'],
    'electronics': ['order', 'service'],
    'furniture': ['order', 'viewing', 'quote', 'rental'],
    'bookstore': ['order'],
    'pharmacy': ['order', 'consultation'],
    'jewelry': ['order', 'service'],
    'sporting_goods': ['order', 'rental'],
    
    // Accommodation - bookings
    'hotel': ['booking'],
    'motel': ['booking'],
    'hostel': ['booking'],
    'vacation_rental': ['booking'],
    'bed_breakfast': ['booking'],
    
    // Health - appointments and consultations
    'clinic': ['booking', 'consultation'],
    'hospital': ['booking', 'consultation'],
    'dentist': ['booking'],
    'therapist': ['booking', 'consultation'],
    
    // Beauty - bookings
    'salon': ['booking'],
    'barbershop': ['booking'],
    'spa': ['booking', 'subscription'],
    'nail_salon': ['booking'],
    'massage': ['booking'],
    'tattoo': ['booking', 'consultation'],
    
    // Home Services - service requests
    'plumber': ['service', 'quote'],
    'electrician': ['service', 'quote'],
    'cleaning': ['service', 'subscription'],
    'landscaper': ['service', 'quote', 'subscription'],
    
    // Professional - consultations
    'lawyer': ['consultation', 'quote'],
    'accountant': ['service', 'subscription'],
    'consultant': ['consultation', 'quote'],
    'real_estate': ['listing', 'viewing', 'inquiry', 'application'],
    
    // Transportation
    'taxi': ['service'],
    'car_rental': ['rental'],
    'moving': ['service', 'quote'],
    'delivery': ['service'],
    
    // Special types with viewings
    'dealership': ['viewing', 'order', 'quote', 'service'],
    'art_gallery': ['viewing', 'order', 'inquiry'],
    'showroom': ['viewing', 'order', 'quote'],
    'property_management': ['application', 'viewing', 'service'],
    
    // Default
    'other': ['order', 'booking', 'service']
  };
  
  return interactionMap[businessType] || ['order', 'service'];
}