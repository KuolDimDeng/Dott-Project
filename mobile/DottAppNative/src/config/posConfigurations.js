/**
 * POS Configuration System for Different Business Types
 * Provides adaptive terminology, categories, features, and workflows
 */

// Business Type Configurations
export const POS_CONFIGURATIONS = {
  'RESTAURANT_CAFE': {
    terminology: {
      products: 'Menu Items',
      product: 'Menu Item',
      cart: 'Order',
      categories: 'Menu Categories',
      addToCart: 'Add to Order',
      checkout: 'Process Order',
      customer: 'Customer',
      receipt: 'Order Receipt'
    },
    categories: [
      { id: 'appetizers', name: 'Appetizers', icon: 'restaurant-outline', color: '#f97316' },
      { id: 'main_courses', name: 'Main Courses', icon: 'fast-food-outline', color: '#ef4444' },
      { id: 'beverages', name: 'Beverages', icon: 'wine-outline', color: '#3b82f6' },
      { id: 'desserts', name: 'Desserts', icon: 'ice-cream-outline', color: '#f59e0b' },
      { id: 'coffee', name: 'Coffee & Tea', icon: 'cafe-outline', color: '#8b5cf6' },
      { id: 'sides', name: 'Sides', icon: 'leaf-outline', color: '#10b981' }
    ],
    features: ['tableSelection', 'orderType', 'kitchenNotes', 'dietaryTags', 'courseTiming'],
    specialFields: ['table_number', 'order_type', 'special_instructions', 'dietary_preferences'],
    orderTypes: ['Dine-in', 'Takeout', 'Delivery'],
    primaryColor: '#1e3a8a',
    taxLabel: 'Service Tax'
  },

  'RETAIL_STORE': {
    terminology: {
      products: 'Products',
      product: 'Product',
      cart: 'Cart',
      categories: 'Categories',
      addToCart: 'Add to Cart',
      checkout: 'Checkout',
      customer: 'Customer',
      receipt: 'Sales Receipt'
    },
    categories: [
      { id: 'electronics', name: 'Electronics', icon: 'phone-portrait-outline', color: '#3b82f6' },
      { id: 'clothing', name: 'Clothing', icon: 'shirt-outline', color: '#f59e0b' },
      { id: 'accessories', name: 'Accessories', icon: 'watch-outline', color: '#8b5cf6' },
      { id: 'footwear', name: 'Footwear', icon: 'walk-outline', color: '#ef4444' },
      { id: 'home', name: 'Home & Garden', icon: 'home-outline', color: '#10b981' },
      { id: 'beauty', name: 'Beauty & Care', icon: 'rose-outline', color: '#f97316' }
    ],
    features: ['barcodeScanning', 'variants', 'stockAlerts', 'warranty', 'returns'],
    specialFields: ['size', 'color', 'brand', 'warranty_period'],
    primaryColor: '#3b82f6',
    taxLabel: 'Sales Tax'
  },

  'PHARMACY': {
    terminology: {
      products: 'Medications & Products',
      product: 'Product',
      cart: 'Cart',
      categories: 'Product Categories',
      addToCart: 'Add to Cart',
      checkout: 'Process Sale',
      customer: 'Patient',
      receipt: 'Pharmacy Receipt'
    },
    categories: [
      { id: 'prescription', name: 'Prescription', icon: 'medical-outline', color: '#ef4444' },
      { id: 'otc', name: 'Over-the-Counter', icon: 'bandage-outline', color: '#10b981' },
      { id: 'vitamins', name: 'Vitamins & Supplements', icon: 'fitness-outline', color: '#f59e0b' },
      { id: 'personal_care', name: 'Personal Care', icon: 'heart-outline', color: '#f97316' },
      { id: 'medical_devices', name: 'Medical Devices', icon: 'thermometer-outline', color: '#3b82f6' },
      { id: 'baby_care', name: 'Baby Care', icon: 'baby-outline', color: '#ec4899' }
    ],
    features: ['prescriptionVerification', 'dosageInstructions', 'drugInteractions', 'insurance'],
    specialFields: ['prescription_number', 'dosage', 'instructions', 'expiry_date'],
    primaryColor: '#10b981',
    taxLabel: 'Health Tax'
  },

  'GROCERY_MARKET': {
    terminology: {
      products: 'Groceries',
      product: 'Item',
      cart: 'Basket',
      categories: 'Sections',
      addToCart: 'Add to Basket',
      checkout: 'Checkout',
      customer: 'Shopper',
      receipt: 'Grocery Receipt'
    },
    categories: [
      { id: 'fresh_produce', name: 'Fresh Produce', icon: 'leaf-outline', color: '#10b981' },
      { id: 'meat_fish', name: 'Meat & Fish', icon: 'fish-outline', color: '#ef4444' },
      { id: 'dairy', name: 'Dairy & Eggs', icon: 'egg-outline', color: '#f59e0b' },
      { id: 'bakery', name: 'Bakery', icon: 'pizza-outline', color: '#f97316' },
      { id: 'pantry', name: 'Pantry Staples', icon: 'archive-outline', color: '#8b5cf6' },
      { id: 'frozen', name: 'Frozen Foods', icon: 'snow-outline', color: '#3b82f6' }
    ],
    features: ['weightBasedPricing', 'expiryTracking', 'bulkDiscounts', 'loyaltyPoints'],
    specialFields: ['weight', 'expiry_date', 'origin', 'organic'],
    primaryColor: '#10b981',
    taxLabel: 'Food Tax'
  },

  'BAKERY': {
    terminology: {
      products: 'Baked Goods',
      product: 'Item',
      cart: 'Order',
      categories: 'Bakery Sections',
      addToCart: 'Add to Order',
      checkout: 'Complete Order',
      customer: 'Customer',
      receipt: 'Bakery Receipt'
    },
    categories: [
      { id: 'fresh_bread', name: 'Fresh Bread', icon: 'pizza-outline', color: '#f97316' },
      { id: 'pastries', name: 'Pastries', icon: 'cafe-outline', color: '#f59e0b' },
      { id: 'cakes', name: 'Cakes', icon: 'gift-outline', color: '#ec4899' },
      { id: 'cookies', name: 'Cookies & Biscuits', icon: 'heart-outline', color: '#8b5cf6' },
      { id: 'beverages', name: 'Beverages', icon: 'wine-outline', color: '#3b82f6' },
      { id: 'custom_orders', name: 'Custom Orders', icon: 'construct-outline', color: '#ef4444' }
    ],
    features: ['freshnessIndicators', 'customOrders', 'preOrders', 'allergenWarnings'],
    specialFields: ['baked_time', 'ingredients', 'allergens', 'custom_message'],
    primaryColor: '#f97316',
    taxLabel: 'Food Tax'
  },

  'FUEL_STATION': {
    terminology: {
      products: 'Fuel & Services',
      product: 'Item',
      cart: 'Transaction',
      categories: 'Services',
      addToCart: 'Add Service',
      checkout: 'Complete Sale',
      customer: 'Customer',
      receipt: 'Fuel Receipt'
    },
    categories: [
      { id: 'fuel', name: 'Fuel Types', icon: 'car-outline', color: '#ef4444' },
      { id: 'motor_oil', name: 'Motor Oil & Fluids', icon: 'water-outline', color: '#3b82f6' },
      { id: 'car_care', name: 'Car Care', icon: 'construct-outline', color: '#f59e0b' },
      { id: 'convenience', name: 'Convenience Items', icon: 'storefront-outline', color: '#10b981' },
      { id: 'services', name: 'Services', icon: 'settings-outline', color: '#8b5cf6' }
    ],
    features: ['pumpSelection', 'fuelTypes', 'literBasedPricing', 'vehicleServices'],
    specialFields: ['pump_number', 'fuel_type', 'liters', 'vehicle_plate'],
    primaryColor: '#ef4444',
    taxLabel: 'Fuel Tax'
  },

  'MOBILE_MONEY': {
    terminology: {
      products: 'Services',
      product: 'Service',
      cart: 'Transaction',
      categories: 'Service Types',
      addToCart: 'Add Service',
      checkout: 'Process Transaction',
      customer: 'Client',
      receipt: 'Transaction Receipt'
    },
    categories: [
      { id: 'cash_in', name: 'Cash In', icon: 'arrow-down-outline', color: '#10b981' },
      { id: 'cash_out', name: 'Cash Out', icon: 'arrow-up-outline', color: '#ef4444' },
      { id: 'transfers', name: 'Money Transfers', icon: 'swap-horizontal-outline', color: '#3b82f6' },
      { id: 'bill_payments', name: 'Bill Payments', icon: 'receipt-outline', color: '#f59e0b' },
      { id: 'airtime', name: 'Airtime & Data', icon: 'phone-portrait-outline', color: '#8b5cf6' }
    ],
    features: ['transactionLimits', 'commissionCalculation', 'phoneVerification', 'balanceCheck'],
    specialFields: ['phone_number', 'transaction_id', 'commission_rate', 'recipient_details'],
    primaryColor: '#10b981',
    taxLabel: 'Service Tax'
  },

  'FITNESS_CENTER': {
    terminology: {
      products: 'Services & Products',
      product: 'Service/Product',
      cart: 'Booking',
      categories: 'Service Categories',
      addToCart: 'Add to Booking',
      checkout: 'Complete Booking',
      customer: 'Member',
      receipt: 'Service Receipt'
    },
    categories: [
      { id: 'memberships', name: 'Memberships', icon: 'card-outline', color: '#3b82f6' },
      { id: 'personal_training', name: 'Personal Training', icon: 'fitness-outline', color: '#ef4444' },
      { id: 'classes', name: 'Fitness Classes', icon: 'people-outline', color: '#10b981' },
      { id: 'supplements', name: 'Supplements', icon: 'nutrition-outline', color: '#f59e0b' },
      { id: 'equipment', name: 'Equipment Rental', icon: 'barbell-outline', color: '#8b5cf6' }
    ],
    features: ['membershipTracking', 'trainerScheduling', 'classBooking', 'lockerRental'],
    specialFields: ['membership_type', 'trainer_name', 'class_time', 'locker_number'],
    primaryColor: '#ef4444',
    taxLabel: 'Service Tax'
  }
};

// Global Sales Tax Rates by Country (ISO 3166-1 alpha-2 codes)
export const GLOBAL_SALES_TAX = {
  'SS': { rate: 0.18, name: 'VAT', country: 'South Sudan' }, // 18% VAT
  'US': { rate: 0.08, name: 'Sales Tax', country: 'United States' }, // Average ~8%
  'KE': { rate: 0.16, name: 'VAT', country: 'Kenya' }, // 16% VAT
  'UG': { rate: 0.18, name: 'VAT', country: 'Uganda' }, // 18% VAT
  'TZ': { rate: 0.18, name: 'VAT', country: 'Tanzania' }, // 18% VAT
  'NG': { rate: 0.075, name: 'VAT', country: 'Nigeria' }, // 7.5% VAT
  'ZA': { rate: 0.15, name: 'VAT', country: 'South Africa' }, // 15% VAT
  'ET': { rate: 0.15, name: 'VAT', country: 'Ethiopia' }, // 15% VAT
  'RW': { rate: 0.18, name: 'VAT', country: 'Rwanda' }, // 18% VAT
  'GH': { rate: 0.125, name: 'VAT', country: 'Ghana' }, // 12.5% VAT
  'GB': { rate: 0.20, name: 'VAT', country: 'United Kingdom' }, // 20% VAT
  'FR': { rate: 0.20, name: 'VAT', country: 'France' }, // 20% VAT
  'DE': { rate: 0.19, name: 'VAT', country: 'Germany' }, // 19% VAT
  'CA': { rate: 0.13, name: 'HST/GST', country: 'Canada' }, // Average ~13%
  'AU': { rate: 0.10, name: 'GST', country: 'Australia' }, // 10% GST
  'IN': { rate: 0.18, name: 'GST', country: 'India' }, // 18% GST average
  'BR': { rate: 0.17, name: 'ICMS', country: 'Brazil' }, // Average ~17%
  'MX': { rate: 0.16, name: 'IVA', country: 'Mexico' }, // 16% IVA
  'JP': { rate: 0.10, name: 'Consumption Tax', country: 'Japan' }, // 10%
  'CN': { rate: 0.13, name: 'VAT', country: 'China' }, // 13% VAT
  'DEFAULT': { rate: 0.15, name: 'Tax', country: 'Default' } // 15% default
};

/**
 * Get POS configuration for a specific business type
 */
export const getPOSConfig = (businessType) => {
  return POS_CONFIGURATIONS[businessType] || POS_CONFIGURATIONS['RESTAURANT_CAFE'];
};

/**
 * Get sales tax rate for a country
 */
export const getSalesTaxRate = (countryCode, customerCountry = null) => {
  // If customer has different country, use customer's tax rate
  if (customerCountry && customerCountry !== countryCode) {
    return GLOBAL_SALES_TAX[customerCountry] || GLOBAL_SALES_TAX['DEFAULT'];
  }
  
  // Otherwise use business country tax rate
  return GLOBAL_SALES_TAX[countryCode] || GLOBAL_SALES_TAX['DEFAULT'];
};

/**
 * Generate mock products for a specific business type
 */
export const getMockProductsByType = (businessType) => {
  const formatPrice = (price) => typeof price === 'number' ? price : parseFloat(price) || 0;
  const config = getPOSConfig(businessType);
  
  const productsByType = {
    'RESTAURANT_CAFE': [
      { id: 1, name: 'Americano', price: formatPrice(4.50), category: 'coffee', sku: 'COF001', stock: 120, description: 'Rich black coffee' },
      { id: 2, name: 'Cappuccino', price: formatPrice(5.50), category: 'coffee', sku: 'COF002', stock: 95, description: 'Espresso with steamed milk foam' },
      { id: 3, name: 'Caesar Salad', price: formatPrice(16.99), category: 'appetizers', sku: 'APP001', stock: 30, description: 'Fresh romaine with parmesan' },
      { id: 4, name: 'Grilled Chicken Breast', price: formatPrice(24.99), category: 'main_courses', sku: 'MC001', stock: 45, description: 'Tender grilled chicken breast with rosemary herbs' },
      { id: 5, name: 'Chocolate Lava Cake', price: formatPrice(12.99), category: 'desserts', sku: 'DES001', stock: 20, description: 'Warm chocolate cake with molten center' },
      { id: 6, name: 'Craft Beer Selection', price: formatPrice(8.99), category: 'beverages', sku: 'BEV001', stock: 85, description: 'Local craft beer selection' },
      { id: 7, name: 'Orange Juice', price: formatPrice(3.99), category: 'beverages', sku: 'BEV002', stock: 60, description: 'Fresh-squeezed orange juice' },
      { id: 8, name: 'Pasta Carbonara', price: formatPrice(18.99), category: 'main_courses', sku: 'MC002', stock: 35, description: 'Classic Italian pasta with eggs and bacon' }
    ],
    
    'RETAIL_STORE': [
      { id: 1, name: 'iPhone 15', price: formatPrice(999.99), category: 'electronics', sku: 'ELEC001', stock: 25, description: 'Latest Apple smartphone' },
      { id: 2, name: 'Samsung Galaxy S24', price: formatPrice(849.99), category: 'electronics', sku: 'ELEC002', stock: 30, description: 'Android flagship phone' },
      { id: 3, name: 'Designer T-Shirt', price: formatPrice(29.99), category: 'clothing', sku: 'CLO001', stock: 100, description: 'Premium cotton tee' },
      { id: 4, name: 'Running Shoes', price: formatPrice(129.99), category: 'footwear', sku: 'FOOT001', stock: 50, description: 'Athletic running shoes' },
      { id: 5, name: 'Wireless Earbuds', price: formatPrice(199.99), category: 'accessories', sku: 'ACC001', stock: 75, description: 'Bluetooth earbuds' }
    ],
    
    'PHARMACY': [
      { id: 1, name: 'Paracetamol 500mg', price: formatPrice(5.99), category: 'otc', sku: 'OTC001', stock: 500, description: 'Pain relief tablets' },
      { id: 2, name: 'Vitamin D3', price: formatPrice(12.99), category: 'vitamins', sku: 'VIT001', stock: 200, description: 'Bone health supplement' },
      { id: 3, name: 'Digital Thermometer', price: formatPrice(25.99), category: 'medical_devices', sku: 'DEV001', stock: 50, description: 'Fast-read thermometer' },
      { id: 4, name: 'Hand Sanitizer', price: formatPrice(4.99), category: 'personal_care', sku: 'PC001', stock: 300, description: '70% alcohol sanitizer' },
      { id: 5, name: 'Baby Formula', price: formatPrice(24.99), category: 'baby_care', sku: 'BABY001', stock: 80, description: 'Infant nutrition formula' }
    ],
    
    'GROCERY_MARKET': [
      { id: 1, name: 'Bananas (1kg)', price: formatPrice(2.99), category: 'fresh_produce', sku: 'FP001', stock: 200, description: 'Fresh ripe bananas' },
      { id: 2, name: 'Chicken Breast (1kg)', price: formatPrice(12.99), category: 'meat_fish', sku: 'MEAT001', stock: 50, description: 'Fresh chicken breast' },
      { id: 3, name: 'Milk (1L)', price: formatPrice(3.49), category: 'dairy', sku: 'DAIRY001', stock: 100, description: 'Fresh whole milk' },
      { id: 4, name: 'Whole Wheat Bread', price: formatPrice(2.99), category: 'bakery', sku: 'BAK001', stock: 80, description: 'Freshly baked bread' },
      { id: 5, name: 'Rice (2kg)', price: formatPrice(8.99), category: 'pantry', sku: 'PAN001', stock: 150, description: 'Long grain white rice' }
    ]
  };
  
  return productsByType[businessType] || productsByType['RESTAURANT_CAFE'];
};

export default {
  POS_CONFIGURATIONS,
  GLOBAL_SALES_TAX,
  getPOSConfig,
  getSalesTaxRate,
  getMockProductsByType
};