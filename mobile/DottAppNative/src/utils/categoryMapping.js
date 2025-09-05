// Category name mapping from backend values to user-friendly display names
export const CATEGORY_DISPLAY_NAMES = {
  'GROCERY_MARKET': 'Grocery & Markets',
  'MEDICAL_DENTAL': 'Medical & Health',
  'PHARMACY': 'Pharmacy',
  'FINANCIAL_SERVICES': 'Banks & Finance',
  'RESTAURANT': 'Restaurants',
  'HOTEL': 'Hotels & Lodging',
  'RETAIL': 'Shopping & Retail',
  'TRANSPORT': 'Transport & Logistics',
  'BEAUTY': 'Beauty & Spa',
  'EDUCATION': 'Education',
  'AUTOMOTIVE': 'Automotive',
  'REAL_ESTATE': 'Real Estate',
  'TECHNOLOGY': 'Technology',
  'ENTERTAINMENT': 'Entertainment',
  'FITNESS': 'Fitness & Sports',
  'PROFESSIONAL_SERVICES': 'Professional Services',
  'HOME_SERVICES': 'Home Services',
  'FOOD_DELIVERY': 'Food Delivery',
  'ELECTRONICS': 'Electronics',
  'CLOTHING': 'Clothing & Fashion',
};

// Icon mapping for categories
export const CATEGORY_ICONS = {
  'GROCERY_MARKET': 'cart',
  'MEDICAL_DENTAL': 'medical',
  'PHARMACY': 'medical',
  'FINANCIAL_SERVICES': 'cash',
  'RESTAURANT': 'restaurant',
  'HOTEL': 'bed',
  'RETAIL': 'bag',
  'TRANSPORT': 'car',
  'BEAUTY': 'cut',
  'EDUCATION': 'school',
  'AUTOMOTIVE': 'car',
  'REAL_ESTATE': 'home',
  'TECHNOLOGY': 'laptop',
  'ENTERTAINMENT': 'game-controller',
  'FITNESS': 'fitness',
  'PROFESSIONAL_SERVICES': 'briefcase',
  'HOME_SERVICES': 'build',
  'FOOD_DELIVERY': 'fast-food',
  'ELECTRONICS': 'phone-portrait',
  'CLOTHING': 'shirt',
};

// Color mapping for categories
export const CATEGORY_COLORS = {
  'GROCERY_MARKET': '#10b981',
  'MEDICAL_DENTAL': '#3b82f6',
  'PHARMACY': '#06b6d4',
  'FINANCIAL_SERVICES': '#10b981',
  'RESTAURANT': '#ef4444',
  'HOTEL': '#8b5cf6',
  'RETAIL': '#f59e0b',
  'TRANSPORT': '#06b6d4',
  'BEAUTY': '#ec4899',
  'EDUCATION': '#3b82f6',
  'AUTOMOTIVE': '#6b7280',
  'REAL_ESTATE': '#a855f7',
  'TECHNOLOGY': '#1e40af',
  'ENTERTAINMENT': '#dc2626',
  'FITNESS': '#059669',
  'PROFESSIONAL_SERVICES': '#7c3aed',
  'HOME_SERVICES': '#ea580c',
  'FOOD_DELIVERY': '#f97316',
  'ELECTRONICS': '#0891b2',
  'CLOTHING': '#c026d3',
};

// Helper function to get display name
export const getCategoryDisplayName = (categoryKey) => {
  return CATEGORY_DISPLAY_NAMES[categoryKey] || categoryKey;
};

// Helper function to get icon
export const getCategoryIcon = (categoryKey) => {
  return CATEGORY_ICONS[categoryKey] || 'business';
};

// Helper function to get color
export const getCategoryColor = (categoryKey) => {
  return CATEGORY_COLORS[categoryKey] || '#6b7280';
};