// Simplified Business Categories for Onboarding
// This file defines the simplified business types for new users (after 2025-07-26)
// Updated to match marketplace consumer search categories

export const MARKETPLACE_CATEGORIES = [
  { value: 'RESTAURANT', label: 'Restaurant' },
  { value: 'CAFE', label: 'Cafe' },
  { value: 'GROCERY', label: 'Grocery' },
  { value: 'PHARMACY', label: 'Pharmacy' },
  { value: 'RETAIL', label: 'Retail Store' },
  { value: 'FASHION', label: 'Fashion & Clothing' },
  { value: 'ELECTRONICS', label: 'Electronics' },
  { value: 'HOME_GARDEN', label: 'Home & Garden' },
  { value: 'BEAUTY', label: 'Beauty & Salon' },
  { value: 'HEALTH', label: 'Health & Medical' },
  { value: 'FITNESS', label: 'Fitness & Sports' },
  { value: 'AUTOMOTIVE', label: 'Automotive' },
  { value: 'SERVICES', label: 'Professional Services' },
  { value: 'EDUCATION', label: 'Education & Training' },
  { value: 'ENTERTAINMENT', label: 'Entertainment' },
  { value: 'OTHER', label: 'Other' }
];

export const DELIVERY_SCOPE_OPTIONS = [
  { value: 'local', label: 'Local Delivery Only (within city/town)' },
  { value: 'national', label: 'Nationwide Delivery' },
  { value: 'international', label: 'International Shipping' },
  { value: 'digital', label: 'Digital/Online Service (no physical delivery)' }
];

export const BUSINESS_CATEGORIES = {
  SERVICE: {
    label: 'Service Businesses',
    description: 'Businesses that provide services and manage jobs',
    features: ['jobs'],
    types: [
      { value: 'HOME_SERVICES', label: 'Home Services (Plumbing, Electrical, HVAC)' },
      { value: 'CONSTRUCTION', label: 'Construction & Contracting' },
      { value: 'CLEANING', label: 'Cleaning & Maintenance' },
      { value: 'AUTOMOTIVE_REPAIR', label: 'Automotive Repair' },
      { value: 'PROFESSIONAL_SERVICES', label: 'Professional Services (Consulting, Accounting)' },
      { value: 'CREATIVE_SERVICES', label: 'Creative Services (Design, Photography)' },
    ]
  },
  RETAIL: {
    label: 'Retail Businesses',
    description: 'Businesses that sell products and need point of sale',
    features: ['pos'],
    types: [
      { value: 'RETAIL_STORE', label: 'Retail Store' },
      { value: 'RESTAURANT_CAFE', label: 'Restaurant/Cafe' },
      { value: 'GROCERY_MARKET', label: 'Grocery/Market' },
      { value: 'PHARMACY', label: 'Pharmacy' },
      { value: 'ONLINE_STORE', label: 'Online Store' },
    ]
  },
  MIXED: {
    label: 'Mixed Businesses',
    description: 'Businesses that need both job management and point of sale',
    features: ['jobs', 'pos'],
    types: [
      { value: 'SALON_SPA', label: 'Salon/Spa' },
      { value: 'MEDICAL_DENTAL', label: 'Medical/Dental Practice' },
      { value: 'VETERINARY', label: 'Veterinary Clinic' },
      { value: 'FITNESS_CENTER', label: 'Fitness Center' },
      { value: 'AUTO_PARTS_REPAIR', label: 'Auto Parts & Repair' },
      { value: 'WAREHOUSE_STORAGE', label: 'Warehouse/Storage' },
      { value: 'MANUFACTURING', label: 'Manufacturing' },
    ]
  },
  OTHER: {
    label: 'Other',
    description: 'Other business types',
    features: ['jobs', 'pos'],
    types: [
      { value: 'LOGISTICS_FREIGHT', label: 'Logistics & Freight' },
      { value: 'FINANCIAL_SERVICES', label: 'Financial Services' },
      { value: 'REAL_ESTATE', label: 'Real Estate' },
      { value: 'AGRICULTURE', label: 'Agriculture' },
      { value: 'NON_PROFIT', label: 'Non-Profit' },
      { value: 'OTHER', label: 'Other' },
    ]
  }
};

// Flatten all business types for easy access
export const ALL_BUSINESS_TYPES = Object.values(BUSINESS_CATEGORIES)
  .flatMap(category => category.types);

// Get features for a business type
export function getFeaturesForBusinessType(businessType) {
  if (!businessType) return ['jobs', 'pos'];
  
  for (const [categoryKey, category] of Object.entries(BUSINESS_CATEGORIES)) {
    const type = category.types.find(t => t.value === businessType);
    if (type) {
      return category.features;
    }
  }
  
  return ['jobs', 'pos']; // Default to all features
}

// Get category for a business type
export function getCategoryForBusinessType(businessType) {
  if (!businessType) return 'OTHER';
  
  for (const [categoryKey, category] of Object.entries(BUSINESS_CATEGORIES)) {
    const type = category.types.find(t => t.value === businessType);
    if (type) {
      return categoryKey;
    }
  }
  
  return 'OTHER';
}