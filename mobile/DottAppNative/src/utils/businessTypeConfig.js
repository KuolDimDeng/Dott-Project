// Business Type Configuration System
// Defines features, navigation modes, and menu items for all business types

export const BUSINESS_FEATURES = {
  // Transport & Delivery Services
  COURIER: {
    category: 'TRANSPORT_DELIVERY',
    serviceType: 'mobile',
    features: {
      bookings: false,
      deliveries: true,
      navigation: true,
      calendar: false, // Optional for scheduled pickups
      inventory: false,
      invoicing: false,
      pos: false,
      scheduling: false,
      timesheets: false,
    },
    navigationMode: 'multi-stop', // pickup -> delivery
    menuItems: [
      { id: 'deliveries', label: 'Active Deliveries', icon: 'cube-outline', screen: 'DeliveryList' },
      { id: 'navigate', label: 'Navigate', icon: 'navigate-outline', screen: 'NavigationScreen' },
      { id: 'earnings', label: "Today's Earnings", icon: 'cash-outline', screen: 'EarningsScreen' },
      { id: 'status', label: 'Go Online/Offline', icon: 'power-outline', screen: 'OnlineStatus' },
      { id: 'history', label: 'Delivery History', icon: 'time-outline', screen: 'DeliveryHistory' },
    ],
  },

  TAXI_DRIVER: {
    category: 'TRANSPORT_DELIVERY',
    serviceType: 'mobile',
    features: {
      bookings: true,
      deliveries: false,
      navigation: true,
      calendar: true, // For pre-booked rides
      inventory: false,
      invoicing: false,
      pos: false,
      scheduling: true,
      timesheets: false,
    },
    navigationMode: 'pickup-dropoff',
    menuItems: [
      { id: 'rides', label: 'Current Ride', icon: 'car-outline', screen: 'RideManagement' },
      { id: 'navigate', label: 'Navigate', icon: 'navigate-outline', screen: 'NavigationScreen' },
      { id: 'bookings', label: 'Bookings', icon: 'calendar-outline', screen: 'BookingsList' },
      { id: 'earnings', label: 'Earnings', icon: 'cash-outline', screen: 'EarningsScreen' },
      { id: 'status', label: 'Availability', icon: 'power-outline', screen: 'OnlineStatus' },
    ],
  },

  BODA_BODA: {
    category: 'TRANSPORT_DELIVERY',
    serviceType: 'mobile',
    features: {
      bookings: true,
      deliveries: true, // Can do both passenger and delivery
      navigation: true,
      calendar: false,
      inventory: false,
      invoicing: false,
      pos: false,
      scheduling: false,
      timesheets: false,
    },
    navigationMode: 'pickup-dropoff',
    menuItems: [
      { id: 'rides', label: 'Active Trip', icon: 'bicycle-outline', screen: 'RideManagement' },
      { id: 'navigate', label: 'Navigate', icon: 'navigate-outline', screen: 'NavigationScreen' },
      { id: 'earnings', label: 'Earnings', icon: 'cash-outline', screen: 'EarningsScreen' },
      { id: 'status', label: 'Go Online/Offline', icon: 'power-outline', screen: 'OnlineStatus' },
    ],
  },

  MOVING_SERVICES: {
    category: 'TRANSPORT_DELIVERY',
    serviceType: 'mobile',
    features: {
      bookings: true,
      deliveries: false,
      navigation: true,
      calendar: true,
      inventory: true, // Packing materials
      invoicing: true,
      pos: false,
      scheduling: true,
      timesheets: true, // For crew
    },
    navigationMode: 'multi-stop',
    menuItems: [
      { id: 'jobs', label: "Today's Moves", icon: 'home-outline', screen: 'ServiceJobs' },
      { id: 'navigate', label: 'Navigate', icon: 'navigate-outline', screen: 'NavigationScreen' },
      { id: 'calendar', label: 'Schedule', icon: 'calendar-outline', screen: 'CalendarView' },
      { id: 'invoice', label: 'Create Invoice', icon: 'receipt-outline', screen: 'InvoiceCreator' },
      { id: 'team', label: 'Crew', icon: 'people-outline', screen: 'TeamManagement' },
    ],
  },

  // Home & Trade Services
  PLUMBER: {
    category: 'HOME_SERVICES',
    serviceType: 'mobile',
    features: {
      bookings: true,
      deliveries: false,
      navigation: true,
      calendar: true,
      inventory: true, // Parts and supplies
      invoicing: true,
      pos: false,
      scheduling: true,
      timesheets: false,
    },
    navigationMode: 'single-destination',
    menuItems: [
      { id: 'jobs', label: "Today's Jobs", icon: 'construct-outline', screen: 'ServiceJobs' },
      { id: 'navigate', label: 'Navigate to Next', icon: 'navigate-outline', screen: 'NavigationScreen' },
      { id: 'bookings', label: 'Service Requests', icon: 'clipboard-outline', screen: 'BookingRequests' },
      { id: 'calendar', label: 'Schedule', icon: 'calendar-outline', screen: 'CalendarView' },
      { id: 'parts', label: 'Parts Inventory', icon: 'hardware-chip-outline', screen: 'PartsInventory' },
      { id: 'invoice', label: 'Create Invoice', icon: 'receipt-outline', screen: 'InvoiceCreator' },
    ],
  },

  ELECTRICIAN: {
    category: 'HOME_SERVICES',
    serviceType: 'mobile',
    features: {
      bookings: true,
      deliveries: false,
      navigation: true,
      calendar: true,
      inventory: true,
      invoicing: true,
      pos: false,
      scheduling: true,
      timesheets: false,
    },
    navigationMode: 'single-destination',
    menuItems: [
      { id: 'jobs', label: "Today's Jobs", icon: 'flash-outline', screen: 'ServiceJobs' },
      { id: 'navigate', label: 'Navigate to Next', icon: 'navigate-outline', screen: 'NavigationScreen' },
      { id: 'bookings', label: 'Service Requests', icon: 'clipboard-outline', screen: 'BookingRequests' },
      { id: 'calendar', label: 'Schedule', icon: 'calendar-outline', screen: 'CalendarView' },
      { id: 'parts', label: 'Parts Inventory', icon: 'hardware-chip-outline', screen: 'PartsInventory' },
      { id: 'invoice', label: 'Create Invoice', icon: 'receipt-outline', screen: 'InvoiceCreator' },
    ],
  },

  CARPENTER: {
    category: 'HOME_SERVICES',
    serviceType: 'mobile',
    features: {
      bookings: true,
      deliveries: false,
      navigation: true,
      calendar: true,
      inventory: true, // Wood, materials
      invoicing: true,
      pos: false,
      scheduling: true,
      timesheets: true, // For project work
    },
    navigationMode: 'single-destination',
    menuItems: [
      { id: 'jobs', label: "Today's Jobs", icon: 'hammer-outline', screen: 'ServiceJobs' },
      { id: 'navigate', label: 'Navigate to Site', icon: 'navigate-outline', screen: 'NavigationScreen' },
      { id: 'bookings', label: 'Projects', icon: 'clipboard-outline', screen: 'BookingRequests' },
      { id: 'calendar', label: 'Schedule', icon: 'calendar-outline', screen: 'CalendarView' },
      { id: 'materials', label: 'Materials', icon: 'cube-outline', screen: 'PartsInventory' },
      { id: 'invoice', label: 'Create Invoice', icon: 'receipt-outline', screen: 'InvoiceCreator' },
    ],
  },

  CLEANER: {
    category: 'HOME_SERVICES',
    serviceType: 'mobile',
    features: {
      bookings: true,
      deliveries: false,
      navigation: true,
      calendar: true,
      inventory: true, // Cleaning supplies
      invoicing: true,
      pos: false,
      scheduling: true,
      timesheets: true,
    },
    navigationMode: 'single-destination',
    menuItems: [
      { id: 'jobs', label: "Today's Cleaning", icon: 'sparkles-outline', screen: 'ServiceJobs' },
      { id: 'navigate', label: 'Navigate', icon: 'navigate-outline', screen: 'NavigationScreen' },
      { id: 'calendar', label: 'Schedule', icon: 'calendar-outline', screen: 'CalendarView' },
      { id: 'recurring', label: 'Regular Clients', icon: 'repeat-outline', screen: 'RecurringJobs' },
      { id: 'invoice', label: 'Invoice', icon: 'receipt-outline', screen: 'InvoiceCreator' },
    ],
  },

  MECHANIC: {
    category: 'HOME_SERVICES',
    serviceType: 'hybrid', // Can be mobile or fixed garage
    features: {
      bookings: true,
      deliveries: false,
      navigation: true,
      calendar: true,
      inventory: true, // Auto parts
      invoicing: true,
      pos: true,
      scheduling: true,
      timesheets: false,
    },
    navigationMode: 'single-destination',
    menuItems: [
      { id: 'jobs', label: "Today's Repairs", icon: 'car-sport-outline', screen: 'ServiceJobs' },
      { id: 'navigate', label: 'Navigate to Vehicle', icon: 'navigate-outline', screen: 'NavigationScreen' },
      { id: 'bookings', label: 'Appointments', icon: 'clipboard-outline', screen: 'BookingRequests' },
      { id: 'parts', label: 'Parts Inventory', icon: 'cog-outline', screen: 'PartsInventory' },
      { id: 'invoice', label: 'Create Invoice', icon: 'receipt-outline', screen: 'InvoiceCreator' },
    ],
  },

  // Personal Care & Wellness
  HAIRSTYLIST: {
    category: 'PERSONAL_CARE',
    serviceType: 'hybrid', // Salon or mobile
    features: {
      bookings: true,
      deliveries: false,
      navigation: true, // If mobile
      calendar: true,
      inventory: true, // Hair products
      invoicing: true,
      pos: true,
      scheduling: true,
      timesheets: false,
    },
    navigationMode: 'single-destination',
    menuItems: [
      { id: 'appointments', label: 'Appointments', icon: 'cut-outline', screen: 'AppointmentList' },
      { id: 'calendar', label: 'Calendar', icon: 'calendar-outline', screen: 'CalendarView' },
      { id: 'pos', label: 'Checkout', icon: 'card-outline', screen: 'POSScreen' },
      { id: 'portfolio', label: 'Portfolio', icon: 'images-outline', screen: 'Portfolio' },
      { id: 'products', label: 'Products', icon: 'color-palette-outline', screen: 'ProductInventory' },
    ],
  },

  PERSONAL_TRAINER: {
    category: 'PERSONAL_CARE',
    serviceType: 'mobile',
    features: {
      bookings: true,
      deliveries: false,
      navigation: true,
      calendar: true,
      inventory: false,
      invoicing: true,
      pos: false,
      scheduling: true,
      timesheets: false,
    },
    navigationMode: 'single-destination',
    menuItems: [
      { id: 'sessions', label: "Today's Sessions", icon: 'fitness-outline', screen: 'ServiceJobs' },
      { id: 'navigate', label: 'Navigate', icon: 'navigate-outline', screen: 'NavigationScreen' },
      { id: 'calendar', label: 'Schedule', icon: 'calendar-outline', screen: 'CalendarView' },
      { id: 'clients', label: 'Clients', icon: 'people-outline', screen: 'ClientList' },
      { id: 'programs', label: 'Programs', icon: 'list-outline', screen: 'TrainingPrograms' },
    ],
  },

  // Education & Training
  TUTOR: {
    category: 'EDUCATION',
    serviceType: 'mobile',
    features: {
      bookings: true,
      deliveries: false,
      navigation: true,
      calendar: true,
      inventory: false,
      invoicing: true,
      pos: false,
      scheduling: true,
      timesheets: true, // Track lesson hours
    },
    navigationMode: 'single-destination',
    menuItems: [
      { id: 'lessons', label: "Today's Lessons", icon: 'book-outline', screen: 'ServiceJobs' },
      { id: 'navigate', label: 'Navigate', icon: 'navigate-outline', screen: 'NavigationScreen' },
      { id: 'calendar', label: 'Schedule', icon: 'calendar-outline', screen: 'CalendarView' },
      { id: 'students', label: 'Students', icon: 'school-outline', screen: 'StudentList' },
      { id: 'invoice', label: 'Invoice', icon: 'receipt-outline', screen: 'InvoiceCreator' },
    ],
  },

  DRIVING_INSTRUCTOR: {
    category: 'EDUCATION',
    serviceType: 'mobile',
    features: {
      bookings: true,
      deliveries: false,
      navigation: true, // To pickup point
      calendar: true,
      inventory: false,
      invoicing: true,
      pos: false,
      scheduling: true,
      timesheets: true,
    },
    navigationMode: 'pickup-dropoff',
    menuItems: [
      { id: 'lessons', label: "Today's Lessons", icon: 'car-outline', screen: 'ServiceJobs' },
      { id: 'navigate', label: 'Navigate to Pickup', icon: 'navigate-outline', screen: 'NavigationScreen' },
      { id: 'calendar', label: 'Schedule', icon: 'calendar-outline', screen: 'CalendarView' },
      { id: 'students', label: 'Students', icon: 'people-outline', screen: 'StudentList' },
      { id: 'progress', label: 'Progress Tracking', icon: 'trending-up-outline', screen: 'StudentProgress' },
    ],
  },

  // Professional Services
  CONSULTANT: {
    category: 'PROFESSIONAL',
    serviceType: 'hybrid',
    features: {
      bookings: true,
      deliveries: false,
      navigation: false, // Usually remote or office
      calendar: true,
      inventory: false,
      invoicing: true,
      pos: false,
      scheduling: true,
      timesheets: true, // Billable hours
    },
    navigationMode: 'optional',
    menuItems: [
      { id: 'meetings', label: "Today's Meetings", icon: 'briefcase-outline', screen: 'MeetingList' },
      { id: 'calendar', label: 'Calendar', icon: 'calendar-outline', screen: 'CalendarView' },
      { id: 'clients', label: 'Clients', icon: 'people-outline', screen: 'ClientList' },
      { id: 'timetrack', label: 'Time Tracking', icon: 'time-outline', screen: 'TimeTracking' },
      { id: 'invoice', label: 'Invoice', icon: 'receipt-outline', screen: 'InvoiceCreator' },
    ],
  },

  REAL_ESTATE_AGENT: {
    category: 'PROFESSIONAL',
    serviceType: 'mobile',
    features: {
      bookings: true,
      deliveries: false,
      navigation: true, // Property showings
      calendar: true,
      inventory: true, // Property listings
      invoicing: false,
      pos: false,
      scheduling: true,
      timesheets: false,
    },
    navigationMode: 'single-destination',
    menuItems: [
      { id: 'showings', label: "Today's Showings", icon: 'home-outline', screen: 'PropertyShowings' },
      { id: 'navigate', label: 'Navigate', icon: 'navigate-outline', screen: 'NavigationScreen' },
      { id: 'calendar', label: 'Calendar', icon: 'calendar-outline', screen: 'CalendarView' },
      { id: 'listings', label: 'Listings', icon: 'business-outline', screen: 'PropertyListings' },
      { id: 'clients', label: 'Clients', icon: 'people-outline', screen: 'ClientList' },
    ],
  },

  // Creative & Digital
  PHOTOGRAPHER: {
    category: 'CREATIVE',
    serviceType: 'mobile',
    features: {
      bookings: true,
      deliveries: false,
      navigation: true, // Event locations
      calendar: true,
      inventory: false,
      invoicing: true,
      pos: false,
      scheduling: true,
      timesheets: false,
    },
    navigationMode: 'single-destination',
    menuItems: [
      { id: 'shoots', label: "Today's Shoots", icon: 'camera-outline', screen: 'ServiceJobs' },
      { id: 'navigate', label: 'Navigate', icon: 'navigate-outline', screen: 'NavigationScreen' },
      { id: 'calendar', label: 'Calendar', icon: 'calendar-outline', screen: 'CalendarView' },
      { id: 'portfolio', label: 'Portfolio', icon: 'images-outline', screen: 'Portfolio' },
      { id: 'invoice', label: 'Invoice', icon: 'receipt-outline', screen: 'InvoiceCreator' },
    ],
  },

  // Specialized Services
  LOCKSMITH: {
    category: 'SPECIALIZED',
    serviceType: 'mobile',
    features: {
      bookings: true,
      deliveries: false,
      navigation: true, // Emergency calls
      calendar: false, // Mostly on-demand
      inventory: true, // Locks and parts
      invoicing: true,
      pos: false,
      scheduling: false,
      timesheets: false,
    },
    navigationMode: 'single-destination',
    menuItems: [
      { id: 'calls', label: 'Service Calls', icon: 'key-outline', screen: 'ServiceJobs' },
      { id: 'navigate', label: 'Navigate', icon: 'navigate-outline', screen: 'NavigationScreen' },
      { id: 'emergency', label: 'Emergency Mode', icon: 'warning-outline', screen: 'EmergencyMode' },
      { id: 'inventory', label: 'Parts', icon: 'hardware-chip-outline', screen: 'PartsInventory' },
      { id: 'invoice', label: 'Invoice', icon: 'receipt-outline', screen: 'InvoiceCreator' },
    ],
  },

  EVENT_PLANNER: {
    category: 'SPECIALIZED',
    serviceType: 'mobile',
    features: {
      bookings: true,
      deliveries: false,
      navigation: true, // Venue visits
      calendar: true,
      inventory: true, // Event supplies
      invoicing: true,
      pos: false,
      scheduling: true,
      timesheets: true, // Event staff
      menu: true,  // Menu planning for events
    },
    navigationMode: 'multi-location', // Multiple venues per event
    menuItems: [
      { id: 'events', label: "Today's Events", icon: 'balloon-outline', screen: 'EventList' },
      { id: 'navigate', label: 'Navigate to Venue', icon: 'navigate-outline', screen: 'NavigationScreen' },
      { id: 'calendar', label: 'Calendar', icon: 'calendar-outline', screen: 'CalendarView' },
      { id: 'vendors', label: 'Vendors', icon: 'people-outline', screen: 'VendorList' },
      { id: 'checklist', label: 'Checklists', icon: 'checkmark-done-outline', screen: 'EventChecklists' },
    ],
  },

  CATERER: {
    category: 'SPECIALIZED',
    serviceType: 'mobile',
    features: {
      bookings: true,
      deliveries: true, // Food delivery
      navigation: true,
      calendar: true,
      inventory: true, // Food supplies
      invoicing: true,
      pos: false,
      scheduling: true,
      timesheets: true, // Catering staff
    },
    navigationMode: 'single-destination',
    menuItems: [
      { id: 'events', label: "Today's Catering", icon: 'restaurant-outline', screen: 'CateringJobs' },
      { id: 'navigate', label: 'Navigate', icon: 'navigate-outline', screen: 'NavigationScreen' },
      { id: 'calendar', label: 'Calendar', icon: 'calendar-outline', screen: 'CalendarView' },
      { id: 'menu', label: 'Menu Items', icon: 'list-outline', screen: 'MenuManagement' },
      { id: 'inventory', label: 'Inventory', icon: 'cube-outline', screen: 'FoodInventory' },
    ],
  },

  // Retail & Commerce (Fixed Location)
  RETAIL_STORE: {
    category: 'RETAIL_COMMERCE',
    serviceType: 'fixed',
    features: {
      bookings: false,
      deliveries: true, // Optional delivery
      navigation: false,
      calendar: false,
      inventory: true,
      invoicing: true,
      pos: true,
      scheduling: false,
      timesheets: true,
    },
    navigationMode: 'none',
    menuItems: [
      { id: 'pos', label: 'POS', icon: 'card-outline', screen: 'POSScreen' },
      { id: 'inventory', label: 'Inventory', icon: 'cube-outline', screen: 'InventoryScreen' },
      { id: 'orders', label: 'Orders', icon: 'cart-outline', screen: 'OrderManagement' },
      { id: 'reports', label: 'Reports', icon: 'bar-chart-outline', screen: 'ReportsScreen' },
      { id: 'employees', label: 'Staff', icon: 'people-outline', screen: 'EmployeeManagement' },
    ],
  },

  GROCERY_MARKET: {
    category: 'RETAIL_COMMERCE',
    serviceType: 'fixed',
    features: {
      bookings: false,
      deliveries: true,
      navigation: false,
      calendar: false,
      inventory: true,
      invoicing: true,
      pos: true,
      scheduling: false,
      timesheets: true,
      menu: true,  // For prepared foods section
    },
    navigationMode: 'none',
    menuItems: [
      { id: 'pos', label: 'Checkout', icon: 'card-outline', screen: 'POSScreen' },
      { id: 'inventory', label: 'Stock', icon: 'cube-outline', screen: 'InventoryScreen' },
      { id: 'orders', label: 'Online Orders', icon: 'cart-outline', screen: 'OnlineOrders' },
      { id: 'delivery', label: 'Delivery', icon: 'bicycle-outline', screen: 'DeliveryDispatch' },
      { id: 'menu', label: 'Prepared Foods Menu', icon: 'list-outline', screen: 'MenuManagement' },
      { id: 'reports', label: 'Sales', icon: 'trending-up-outline', screen: 'SalesReports' },
    ],
  },

  PHARMACY: {
    category: 'RETAIL_COMMERCE',
    serviceType: 'fixed',
    features: {
      bookings: false,
      deliveries: true, // Medicine delivery
      navigation: false,
      calendar: false,
      inventory: true,
      invoicing: true,
      pos: true,
      scheduling: false,
      timesheets: true,
    },
    navigationMode: 'none',
    menuItems: [
      { id: 'pos', label: 'POS', icon: 'card-outline', screen: 'POSScreen' },
      { id: 'inventory', label: 'Medicine Stock', icon: 'medical-outline', screen: 'MedicineInventory' },
      { id: 'prescriptions', label: 'Prescriptions', icon: 'document-text-outline', screen: 'PrescriptionManagement' },
      { id: 'delivery', label: 'Delivery', icon: 'bicycle-outline', screen: 'MedicineDelivery' },
      { id: 'expiry', label: 'Expiry Tracking', icon: 'warning-outline', screen: 'ExpiryTracking' },
    ],
  },

  // Food & Hospitality
  RESTAURANT_CAFE: {
    category: 'FOOD_HOSPITALITY',
    serviceType: 'fixed',
    features: {
      bookings: true, // Table reservations
      deliveries: true,
      navigation: false,
      calendar: true, // For reservations
      inventory: true,
      invoicing: true,
      pos: true,
      scheduling: true,
      timesheets: false,  // Disabled for restaurants
      menu: true,  // Menu management for restaurant
    },
    navigationMode: 'none',
    menuItems: [
      { id: 'pos', label: 'POS', icon: 'card-outline', screen: 'POS' },
      { id: 'inventory', label: 'Inventory', icon: 'cube-outline', screen: 'Inventory' },
      { id: 'employees', label: 'Staff', icon: 'people-outline', screen: 'Employees' },
      { id: 'menu', label: 'Menu', icon: 'list-outline', screen: 'MenuManagement' },
      { id: 'advertise', label: 'Advertise', icon: 'megaphone-outline', screen: 'MarketplaceSettings' },
    ],
  },

  BAKERY: {
    category: 'FOOD_HOSPITALITY',
    serviceType: 'fixed',
    features: {
      bookings: true, // Custom orders
      deliveries: true,
      navigation: false,
      calendar: true,
      inventory: true,
      invoicing: true,
      pos: true,
      scheduling: true,
      timesheets: true,
    },
    navigationMode: 'none',
    menuItems: [
      { id: 'orders', label: 'Orders', icon: 'gift-outline', screen: 'CustomOrders' },
      { id: 'pos', label: 'POS', icon: 'card-outline', screen: 'POSScreen' },
      { id: 'production', label: 'Production', icon: 'timer-outline', screen: 'ProductionSchedule' },
      { id: 'inventory', label: 'Ingredients', icon: 'nutrition-outline', screen: 'IngredientInventory' },
      { id: 'delivery', label: 'Delivery', icon: 'bicycle-outline', screen: 'DeliveryOrders' },
    ],
  },

  CATERING_SERVICE: {
    category: 'FOOD_HOSPITALITY',
    serviceType: 'mobile',
    features: {
      bookings: true,
      deliveries: true,
      navigation: true,
      calendar: true,
      inventory: true,
      invoicing: true,
      pos: false,
      scheduling: true,
      timesheets: true,
    },
    navigationMode: 'single-destination',
    menuItems: [
      { id: 'events', label: "Today's Events", icon: 'restaurant-outline', screen: 'CateringJobs' },
      { id: 'navigate', label: 'Navigate', icon: 'navigate-outline', screen: 'NavigationScreen' },
      { id: 'calendar', label: 'Calendar', icon: 'calendar-outline', screen: 'CalendarView' },
      { id: 'menu', label: 'Menu Planning', icon: 'list-outline', screen: 'MenuPlanning' },
      { id: 'inventory', label: 'Supplies', icon: 'cube-outline', screen: 'CateringInventory' },
    ],
  },

  // Healthcare
  MEDICAL_DENTAL: {
    category: 'HEALTHCARE',
    serviceType: 'fixed',
    features: {
      bookings: true,
      deliveries: false,
      navigation: false,
      calendar: true,
      inventory: true, // Medical supplies
      invoicing: true,
      pos: true,
      scheduling: true,
      timesheets: true,
    },
    navigationMode: 'none',
    menuItems: [
      { id: 'appointments', label: 'Appointments', icon: 'medical-outline', screen: 'AppointmentList' },
      { id: 'calendar', label: 'Calendar', icon: 'calendar-outline', screen: 'CalendarView' },
      { id: 'patients', label: 'Patients', icon: 'people-outline', screen: 'PatientList' },
      { id: 'pos', label: 'Billing', icon: 'card-outline', screen: 'MedicalBilling' },
      { id: 'inventory', label: 'Supplies', icon: 'medkit-outline', screen: 'MedicalSupplies' },
    ],
  },

  // Add more business types as needed...
};

// Helper function to get business configuration
export function getBusinessConfig(businessType) {
  return BUSINESS_FEATURES[businessType] || BUSINESS_FEATURES.OTHER;
}

// Alias for backward compatibility
export const getBusinessTypeConfig = getBusinessConfig;

// Helper function to check if business needs navigation
export function needsNavigation(businessType) {
  const config = getBusinessConfig(businessType);
  return config.features.navigation === true;
}

// Helper function to check if business needs calendar
export function needsCalendar(businessType) {
  const config = getBusinessConfig(businessType);
  return config.features.calendar === true;
}

// Helper function to get menu items for business
export function getBusinessMenuItems(businessType) {
  const config = getBusinessConfig(businessType);
  return config.menuItems || [];
}

// Helper function to get navigation mode
export function getNavigationMode(businessType) {
  const config = getBusinessConfig(businessType);
  return config.navigationMode || 'none';
}

// Group similar businesses for shared functionality
export const BUSINESS_GROUPS = {
  HOME_SERVICES: [
    'PLUMBER', 'ELECTRICIAN', 'CARPENTER', 'PAINTER',
    'MASON', 'WELDER', 'MECHANIC', 'HVAC_TECH',
    'HANDYMAN', 'CLEANER', 'LANDSCAPER', 'PEST_CONTROL'
  ],
  
  TRANSPORT_SERVICES: [
    'COURIER', 'TAXI_DRIVER', 'BODA_BODA',
    'TRUCK_DRIVER', 'MOVING_SERVICES'
  ],
  
  RETAIL_BUSINESSES: [
    'RETAIL_STORE', 'GROCERY_MARKET', 'PHARMACY',
    'BOOKSTORE_STATIONERY', 'HARDWARE_BUILDING',
    'ELECTRONICS_TECH', 'FASHION_CLOTHING'
  ],
  
  FOOD_SERVICES: [
    'RESTAURANT_CAFE', 'FAST_FOOD', 'BAKERY',
    'CATERING_SERVICE', 'BAR_NIGHTCLUB'
  ],
  
  PERSONAL_CARE: [
    'HAIRSTYLIST', 'MAKEUP_ARTIST', 'NAIL_TECHNICIAN',
    'MASSAGE_THERAPIST', 'PERSONAL_TRAINER',
    'YOGA_INSTRUCTOR', 'NUTRITIONIST'
  ],
  
  EDUCATION_SERVICES: [
    'TUTOR', 'LANGUAGE_TEACHER', 'MUSIC_TEACHER',
    'DRIVING_INSTRUCTOR', 'SPORTS_COACH', 'SKILLS_TRAINER'
  ],
  
  PROFESSIONAL_SERVICES: [
    'CONSULTANT', 'ACCOUNTANT', 'LAWYER',
    'REAL_ESTATE_AGENT', 'INSURANCE_AGENT',
    'FINANCIAL_ADVISOR', 'TAX_PREPARER'
  ],
  
  CREATIVE_SERVICES: [
    'PHOTOGRAPHER', 'VIDEOGRAPHER', 'GRAPHIC_DESIGNER',
    'WEB_DEVELOPER', 'APP_DEVELOPER', 'CONTENT_CREATOR',
    'SOCIAL_MEDIA_MANAGER', 'WRITER', 'MUSICIAN', 'ARTIST'
  ],
};

// Get business group for a type
export function getBusinessGroup(businessType) {
  for (const [group, types] of Object.entries(BUSINESS_GROUPS)) {
    if (types.includes(businessType)) {
      return group;
    }
  }
  return 'OTHER';
}

// Check if business is mobile service
export function isMobileService(businessType) {
  const config = getBusinessConfig(businessType);
  return config.serviceType === 'mobile' || config.serviceType === 'hybrid';
}

// Check if business needs online/offline status
export function needsOnlineStatus(businessType) {
  const onlineStatusTypes = [
    'COURIER', 'TAXI_DRIVER', 'BODA_BODA',
    'FOOD_DELIVERY', 'LOCKSMITH'
  ];
  return onlineStatusTypes.includes(businessType);
}

// Default configuration for unlisted business types
BUSINESS_FEATURES.OTHER = {
  category: 'OTHER',
  serviceType: 'fixed',
  features: {
    bookings: true,
    deliveries: false,
    navigation: false,
    calendar: true,
    inventory: false,
    invoicing: true,
    pos: false,
    scheduling: true,
    timesheets: false,
  },
  navigationMode: 'none',
  menuItems: [
    { id: 'services', label: 'Services', icon: 'briefcase-outline', screen: 'ServiceList' },
    { id: 'calendar', label: 'Calendar', icon: 'calendar-outline', screen: 'CalendarView' },
    { id: 'clients', label: 'Clients', icon: 'people-outline', screen: 'ClientList' },
    { id: 'invoice', label: 'Invoice', icon: 'receipt-outline', screen: 'InvoiceCreator' },
  ],
};