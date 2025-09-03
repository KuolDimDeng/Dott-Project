/**
 * Business Type Mapping
 * Maps backend business type constants to user-friendly display names
 */

export const BUSINESS_TYPE_DISPLAY_NAMES = {
  // Service Businesses (Jobs only)
  'HOME_SERVICES': 'Home Services',
  'CONSTRUCTION': 'Construction & Contracting',
  'CLEANING': 'Cleaning & Maintenance',
  'AUTOMOTIVE_REPAIR': 'Automotive Repair',
  'PROFESSIONAL_SERVICES': 'Professional Services',
  'CREATIVE_SERVICES': 'Creative Services',
  'EDUCATION_TRAINING': 'Education & Training',
  'EVENT_PLANNING': 'Event Planning',
  'SECURITY_SERVICES': 'Security Services',
  
  // Retail Businesses (POS only)
  'RETAIL_STORE': 'Retail Store',
  'RESTAURANT_CAFE': 'Restaurant / Cafe',
  'GROCERY_MARKET': 'Grocery / Market',
  'PHARMACY': 'Pharmacy',
  'ONLINE_STORE': 'Online Store',
  'FASHION_CLOTHING': 'Fashion & Clothing',
  'ELECTRONICS_TECH': 'Electronics & Technology',
  'HARDWARE_BUILDING': 'Hardware & Building Supplies',
  'BOOKSTORE_STATIONERY': 'Bookstore & Stationery',
  'FUEL_STATION': 'Fuel Station',
  
  // Mixed Businesses (Both Jobs & POS)
  'SALON_SPA': 'Salon / Spa',
  'MEDICAL_DENTAL': 'Medical / Dental',
  'VETERINARY': 'Veterinary Clinic',
  'FITNESS_CENTER': 'Fitness Center',
  'AUTO_PARTS_REPAIR': 'Auto Parts & Repair',
  'WAREHOUSE_STORAGE': 'Warehouse / Storage',
  'MANUFACTURING': 'Manufacturing',
  'HOTEL_HOSPITALITY': 'Hotel & Hospitality',
  'TECH_SERVICES': 'Technology Services',
  'PRINT_MEDIA': 'Printing & Media',
  'MOBILE_MONEY': 'Mobile Money & Transfers',
  
  // Other (Both features)
  'LOGISTICS_FREIGHT': 'Logistics & Freight',
  'FINANCIAL_SERVICES': 'Financial Services',
  'REAL_ESTATE': 'Real Estate',
  'AGRICULTURE': 'Agriculture',
  'NON_PROFIT': 'Non-Profit',
  'TRANSPORT_SERVICE': 'Transport Services',
  'MINING_ENERGY': 'Mining & Energy',
  'TOURISM_TRAVEL': 'Tourism & Travel',
  'IMPORT_EXPORT': 'Import / Export',
  'TELECOM': 'Telecommunications',
  'OTHER': 'Other'
};

/**
 * Business categories with icons and colors for UI display
 */
export const BUSINESS_CATEGORIES_UI = {
  'RESTAURANT_CAFE': { icon: '🍽️', color: 'bg-orange-100', category: 'food_dining' },
  'GROCERY_MARKET': { icon: '🛒', color: 'bg-green-100', category: 'shopping_retail' },
  'RETAIL_STORE': { icon: '🛍️', color: 'bg-blue-100', category: 'shopping_retail' },
  'FASHION_CLOTHING': { icon: '👔', color: 'bg-pink-100', category: 'shopping_retail' },
  'ELECTRONICS_TECH': { icon: '📱', color: 'bg-indigo-100', category: 'shopping_retail' },
  'PHARMACY': { icon: '💊', color: 'bg-red-100', category: 'health_medical' },
  'MEDICAL_DENTAL': { icon: '🏥', color: 'bg-red-100', category: 'health_medical' },
  'VETERINARY': { icon: '🐾', color: 'bg-yellow-100', category: 'health_medical' },
  'SALON_SPA': { icon: '💇', color: 'bg-pink-100', category: 'beauty_personal' },
  'FITNESS_CENTER': { icon: '🏃', color: 'bg-green-100', category: 'health_medical' },
  'TRANSPORT_SERVICE': { icon: '🚗', color: 'bg-blue-100', category: 'transport_logistics' },
  'LOGISTICS_FREIGHT': { icon: '📦', color: 'bg-gray-100', category: 'transport_logistics' },
  'HOTEL_HOSPITALITY': { icon: '🏨', color: 'bg-purple-100', category: 'accommodation' },
  'TOURISM_TRAVEL': { icon: '✈️', color: 'bg-cyan-100', category: 'travel' },
  'FINANCIAL_SERVICES': { icon: '🏦', color: 'bg-teal-100', category: 'professional_services' },
  'TELECOM': { icon: '📞', color: 'bg-blue-100', category: 'technology' },
  'FUEL_STATION': { icon: '⛽', color: 'bg-gray-100', category: 'automotive' },
  'HOME_SERVICES': { icon: '🔧', color: 'bg-yellow-100', category: 'services_repairs' },
  'CONSTRUCTION': { icon: '🏗️', color: 'bg-orange-100', category: 'services_repairs' },
  'CLEANING': { icon: '🧹', color: 'bg-cyan-100', category: 'services_repairs' },
  'PROFESSIONAL_SERVICES': { icon: '💼', color: 'bg-indigo-100', category: 'professional_services' },
  'EDUCATION_TRAINING': { icon: '📚', color: 'bg-green-100', category: 'education_training' },
  'EVENT_PLANNING': { icon: '🎉', color: 'bg-purple-100', category: 'events_entertainment' },
  'MANUFACTURING': { icon: '🏭', color: 'bg-gray-100', category: 'industrial' },
  'AGRICULTURE': { icon: '🌾', color: 'bg-green-100', category: 'agriculture' },
  'REAL_ESTATE': { icon: '🏠', color: 'bg-blue-100', category: 'real_estate' },
  'OTHER': { icon: '📋', color: 'bg-gray-100', category: 'other' }
};

/**
 * Get display name for a business type
 * @param {string} businessType - The backend business type constant
 * @returns {string} User-friendly display name
 */
export function getBusinessTypeDisplay(businessType) {
  return BUSINESS_TYPE_DISPLAY_NAMES[businessType] || businessType;
}

/**
 * Get UI properties (icon, color) for a business type
 * @param {string} businessType - The backend business type constant
 * @returns {object} Object with icon, color, and category
 */
export function getBusinessTypeUI(businessType) {
  return BUSINESS_CATEGORIES_UI[businessType] || {
    icon: '📋',
    color: 'bg-gray-100',
    category: 'other'
  };
}

/**
 * Group businesses by their UI category
 * @param {array} businesses - Array of businesses with business_type field
 * @returns {object} Businesses grouped by UI category
 */
export function groupBusinessesByCategory(businesses) {
  const grouped = {};
  
  businesses.forEach(business => {
    const ui = getBusinessTypeUI(business.business_type);
    const category = ui.category;
    
    if (!grouped[category]) {
      grouped[category] = {
        name: getCategoryDisplayName(category),
        businesses: []
      };
    }
    
    grouped[category].businesses.push({
      ...business,
      display_type: getBusinessTypeDisplay(business.business_type),
      ui
    });
  });
  
  return grouped;
}

/**
 * Get display name for a category
 * @param {string} category - The category ID
 * @returns {string} Display name for the category
 */
function getCategoryDisplayName(category) {
  const categoryNames = {
    'food_dining': 'Food & Dining',
    'shopping_retail': 'Shopping & Retail',
    'transport_logistics': 'Transport & Logistics',
    'health_medical': 'Health & Medical',
    'beauty_personal': 'Beauty & Personal Care',
    'services_repairs': 'Services & Repairs',
    'accommodation': 'Hotels & Accommodation',
    'travel': 'Travel & Tourism',
    'professional_services': 'Professional Services',
    'technology': 'Technology',
    'automotive': 'Automotive',
    'education_training': 'Education & Training',
    'events_entertainment': 'Events & Entertainment',
    'industrial': 'Industrial & Manufacturing',
    'agriculture': 'Agriculture',
    'real_estate': 'Real Estate',
    'other': 'Other'
  };
  
  return categoryNames[category] || 'Other';
}

export default {
  BUSINESS_TYPE_DISPLAY_NAMES,
  BUSINESS_CATEGORIES_UI,
  getBusinessTypeDisplay,
  getBusinessTypeUI,
  groupBusinessesByCategory
};