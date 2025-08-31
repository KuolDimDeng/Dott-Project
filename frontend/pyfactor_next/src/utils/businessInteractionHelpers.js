/**
 * Business Interaction Helpers
 * Dynamic text and configuration based on business type
 */

/**
 * Get the primary interaction button text based on business type
 */
export function getInteractionButtonText(businessType) {
  const interactionTexts = {
    // Food & Beverage
    'restaurant': 'Orders',
    'cafe': 'Orders',
    'bar': 'Orders',
    'bakery': 'Orders',
    'food_truck': 'Orders',
    'catering': 'Catering Orders',
    'grocery': 'Orders',
    
    // Retail
    'clothing': 'Orders',
    'electronics': 'Orders',
    'furniture': 'Orders',
    'bookstore': 'Orders',
    'pharmacy': 'Prescriptions',
    'jewelry': 'Orders',
    'sporting_goods': 'Orders',
    
    // Accommodation
    'hotel': 'Bookings',
    'motel': 'Bookings',
    'hostel': 'Bookings',
    'vacation_rental': 'Bookings',
    'bed_breakfast': 'Bookings',
    
    // Health & Wellness
    'clinic': 'Appointments',
    'hospital': 'Appointments',
    'dentist': 'Appointments',
    'pharmacy_clinic': 'Appointments',
    'therapist': 'Sessions',
    'chiropractor': 'Appointments',
    
    // Beauty & Personal Care
    'salon': 'Appointments',
    'barbershop': 'Appointments',
    'spa': 'Bookings',
    'nail_salon': 'Appointments',
    'massage': 'Bookings',
    'tattoo': 'Consultations',
    
    // Fitness & Sports
    'gym': 'Memberships',
    'yoga_studio': 'Classes',
    'martial_arts': 'Classes',
    'sports_club': 'Bookings',
    'personal_trainer': 'Sessions',
    
    // Professional Services
    'lawyer': 'Consultations',
    'accountant': 'Services',
    'consultant': 'Consultations',
    'real_estate': 'Viewings',
    'insurance': 'Policies',
    'financial_advisor': 'Consultations',
    
    // Home Services
    'plumber': 'Service Calls',
    'electrician': 'Service Calls',
    'carpenter': 'Jobs',
    'painter': 'Jobs',
    'landscaper': 'Projects',
    'cleaning': 'Bookings',
    'pest_control': 'Service Calls',
    'handyman': 'Jobs',
    
    // Transportation
    'taxi': 'Rides',
    'ride_share': 'Rides',
    'car_rental': 'Rentals',
    'bike_rental': 'Rentals',
    'moving': 'Moves',
    'delivery': 'Deliveries',
    'courier': 'Deliveries',
    
    // Education
    'school': 'Enrollments',
    'university': 'Enrollments',
    'training_center': 'Registrations',
    'tutoring': 'Sessions',
    'driving_school': 'Lessons',
    'language_school': 'Classes',
    
    // Entertainment & Events
    'event_venue': 'Bookings',
    'wedding_planner': 'Events',
    'photographer': 'Bookings',
    'dj': 'Bookings',
    'band': 'Bookings',
    'party_rental': 'Rentals',
    
    // Technology
    'software': 'Projects',
    'web_design': 'Projects',
    'it_support': 'Tickets',
    'app_development': 'Projects',
    'digital_marketing': 'Campaigns',
    
    // Automotive
    'auto_repair': 'Service Orders',
    'car_wash': 'Services',
    'auto_parts': 'Orders',
    'tire_shop': 'Services',
    'dealership': 'Inquiries',
    
    // Pet Services
    'veterinary': 'Appointments',
    'pet_grooming': 'Appointments',
    'pet_boarding': 'Bookings',
    'pet_store': 'Orders',
    
    // Manufacturing & B2B
    'manufacturer': 'Orders',
    'wholesaler': 'Orders',
    'distributor': 'Orders',
    'supplier': 'Orders',
    
    // Employment
    'employer': 'Applications',
    'recruitment': 'Applications',
    'temp_agency': 'Placements',
    
    // Real Estate & Property
    'property_management': 'Applications',
    'showroom': 'Viewings',
    'art_gallery': 'Inquiries',
    
    // Government & Public
    'government': 'Applications',
    'nonprofit': 'Donations',
    'utility': 'Services',
    
    // Default
    'other': 'Orders'
  };
  
  return interactionTexts[businessType] || 'Orders';
}

/**
 * Get the description for interaction management
 */
export function getInteractionDescription(businessType) {
  const descriptions = {
    // Food & Beverage
    'restaurant': 'Manage customer orders and deliveries',
    'cafe': 'Handle coffee orders and pickups',
    'bar': 'Track drink orders and tabs',
    'hotel': 'Manage room bookings and reservations',
    'clinic': 'Schedule and manage patient appointments',
    'salon': 'Book and manage beauty appointments',
    'gym': 'Manage member subscriptions and classes',
    'lawyer': 'Schedule client consultations and cases',
    'plumber': 'Track service calls and repairs',
    'real_estate': 'Schedule property viewings and tours',
    'dealership': 'Manage test drives and vehicle inquiries',
    'showroom': 'Schedule private viewings and appointments',
    'art_gallery': 'Handle art inquiries and exhibition bookings',
    // Add more specific descriptions as needed
  };
  
  const defaultText = getInteractionButtonText(businessType);
  return descriptions[businessType] || `Manage customer ${defaultText.toLowerCase()}`;
}

/**
 * Get stats label for the interaction
 */
export function getInteractionStatsLabel(businessType) {
  const buttonText = getInteractionButtonText(businessType);
  const statsLabels = {
    'Orders': 'Pending Orders',
    'Bookings': 'Active Bookings',
    'Appointments': 'Today\'s Appointments',
    'Consultations': 'Scheduled Consultations',
    'Services': 'Active Services',
    'Viewings': 'Scheduled Viewings',
    'Jobs': 'Active Jobs',
    'Projects': 'Active Projects',
    'Rentals': 'Active Rentals',
    'Applications': 'New Applications',
    'Sessions': 'Upcoming Sessions',
    'Classes': 'Today\'s Classes',
    'Rides': 'Active Rides',
    'Deliveries': 'Pending Deliveries',
    'Enrollments': 'New Enrollments',
    'Events': 'Upcoming Events',
    'Tickets': 'Open Tickets',
    'Inquiries': 'New Inquiries',
    'Donations': 'Recent Donations',
    'Memberships': 'Active Members',
    'Policies': 'Active Policies',
    'Campaigns': 'Active Campaigns',
    'Placements': 'Active Placements',
    'Prescriptions': 'Pending Prescriptions',
    'Lessons': 'Scheduled Lessons',
    'Moves': 'Scheduled Moves',
    'Service Calls': 'Pending Calls',
    'Service Orders': 'Open Orders',
    'Catering Orders': 'Upcoming Events'
  };
  
  return statsLabels[buttonText] || `Active ${buttonText}`;
}

/**
 * Get the advertise form configuration based on business type
 */
export function getAdvertiseFormConfig(businessType) {
  const configs = {
    // Restaurant - Menu items
    'restaurant': {
      title: 'Add Menu Item',
      fields: [
        { name: 'name', label: 'Dish Name', type: 'text', required: true },
        { name: 'category', label: 'Category', type: 'select', options: ['Appetizer', 'Main Course', 'Dessert', 'Beverage'] },
        { name: 'price', label: 'Price', type: 'number', required: true },
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'ingredients', label: 'Ingredients', type: 'tags' },
        { name: 'dietary', label: 'Dietary Info', type: 'multiselect', options: ['Vegetarian', 'Vegan', 'Gluten-Free', 'Halal'] },
        { name: 'image', label: 'Photo', type: 'image' },
        { name: 'availability', label: 'Availability', type: 'select', options: ['Available', 'Out of Stock', 'Limited'] }
      ]
    },
    
    // Hotel - Rooms
    'hotel': {
      title: 'Add Room/Suite',
      fields: [
        { name: 'roomType', label: 'Room Type', type: 'text', required: true },
        { name: 'capacity', label: 'Max Guests', type: 'number', required: true },
        { name: 'beds', label: 'Bed Configuration', type: 'text' },
        { name: 'pricePerNight', label: 'Price per Night', type: 'number', required: true },
        { name: 'amenities', label: 'Amenities', type: 'multiselect', 
          options: ['WiFi', 'TV', 'Mini Bar', 'Air Conditioning', 'Balcony', 'Sea View'] },
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'images', label: 'Photos', type: 'images', multiple: true },
        { name: 'availability', label: 'Available Dates', type: 'daterange' }
      ]
    },
    
    // Real Estate - Properties
    'real_estate': {
      title: 'List Property',
      fields: [
        { name: 'propertyType', label: 'Property Type', type: 'select', 
          options: ['House', 'Apartment', 'Condo', 'Land', 'Commercial'] },
        { name: 'listingType', label: 'Listing Type', type: 'select', options: ['Sale', 'Rent'] },
        { name: 'price', label: 'Price', type: 'number', required: true },
        { name: 'location', label: 'Location', type: 'location', required: true },
        { name: 'bedrooms', label: 'Bedrooms', type: 'number' },
        { name: 'bathrooms', label: 'Bathrooms', type: 'number' },
        { name: 'area', label: 'Square Footage', type: 'number' },
        { name: 'yearBuilt', label: 'Year Built', type: 'number' },
        { name: 'features', label: 'Features', type: 'multiselect',
          options: ['Parking', 'Garden', 'Pool', 'Security', 'Furnished'] },
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'images', label: 'Property Photos', type: 'images', multiple: true },
        { name: 'virtualTour', label: 'Virtual Tour Link', type: 'url' }
      ]
    },
    
    // Car Dealership - Vehicles
    'dealership': {
      title: 'Add Vehicle',
      fields: [
        { name: 'make', label: 'Make', type: 'text', required: true },
        { name: 'model', label: 'Model', type: 'text', required: true },
        { name: 'year', label: 'Year', type: 'number', required: true },
        { name: 'price', label: 'Price', type: 'number', required: true },
        { name: 'mileage', label: 'Mileage', type: 'number' },
        { name: 'color', label: 'Color', type: 'text' },
        { name: 'fuelType', label: 'Fuel Type', type: 'select', 
          options: ['Gasoline', 'Diesel', 'Electric', 'Hybrid'] },
        { name: 'transmission', label: 'Transmission', type: 'select', 
          options: ['Manual', 'Automatic', 'CVT'] },
        { name: 'features', label: 'Features', type: 'multiselect',
          options: ['Leather Seats', 'Sunroof', 'Navigation', 'Backup Camera', 'Bluetooth'] },
        { name: 'condition', label: 'Condition', type: 'select', options: ['New', 'Used', 'Certified'] },
        { name: 'images', label: 'Vehicle Photos', type: 'images', multiple: true }
      ]
    },
    
    // Salon - Services
    'salon': {
      title: 'Add Service',
      fields: [
        { name: 'serviceName', label: 'Service Name', type: 'text', required: true },
        { name: 'category', label: 'Category', type: 'select', 
          options: ['Hair', 'Nails', 'Facial', 'Makeup', 'Massage'] },
        { name: 'duration', label: 'Duration (minutes)', type: 'number', required: true },
        { name: 'price', label: 'Price', type: 'number', required: true },
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'staffMember', label: 'Performed By', type: 'select' },
        { name: 'image', label: 'Service Photo', type: 'image' }
      ]
    },
    
    // Clinic - Services
    'clinic': {
      title: 'Add Medical Service',
      fields: [
        { name: 'serviceName', label: 'Service Name', type: 'text', required: true },
        { name: 'department', label: 'Department', type: 'select',
          options: ['General', 'Pediatrics', 'Cardiology', 'Dermatology', 'Orthopedics'] },
        { name: 'consultationFee', label: 'Consultation Fee', type: 'number', required: true },
        { name: 'duration', label: 'Appointment Duration', type: 'select',
          options: ['15 min', '30 min', '45 min', '1 hour'] },
        { name: 'doctorName', label: 'Doctor', type: 'select' },
        { name: 'description', label: 'Service Description', type: 'textarea' },
        { name: 'requirements', label: 'Pre-appointment Requirements', type: 'textarea' }
      ]
    },
    
    // Default product listing
    'default': {
      title: 'Add Product/Service',
      fields: [
        { name: 'name', label: 'Name', type: 'text', required: true },
        { name: 'category', label: 'Category', type: 'text' },
        { name: 'price', label: 'Price', type: 'number', required: true },
        { name: 'description', label: 'Description', type: 'textarea' },
        { name: 'images', label: 'Photos', type: 'images', multiple: true },
        { name: 'availability', label: 'Availability', type: 'select', 
          options: ['Available', 'Out of Stock', 'Coming Soon'] }
      ]
    }
  };
  
  return configs[businessType] || configs.default;
}

/**
 * Get icon for interaction type
 */
export function getInteractionIcon(businessType) {
  const buttonText = getInteractionButtonText(businessType);
  const iconMap = {
    'Orders': 'Cart',
    'Bookings': 'Calendar',
    'Appointments': 'Calendar',
    'Consultations': 'People',
    'Services': 'Work',
    'Viewings': 'Home',
    'Jobs': 'Jobs',
    'Projects': 'Work',
    'Rentals': 'Receipt',
    'Applications': 'Description',
    'Sessions': 'Calendar',
    'Classes': 'Calendar',
    'Rides': 'Car',
    'Deliveries': 'Shipping',
    'Enrollments': 'School',
    'Events': 'Event',
    'Tickets': 'Receipt',
    'Inquiries': 'Description',
    'Donations': 'Payment',
    'Memberships': 'People',
    'Policies': 'Description',
    'Campaigns': 'Analytics',
    'Placements': 'People',
    'Service Calls': 'Work',
    'Service Orders': 'Work',
    'Catering Orders': 'Restaurant',
    'Prescriptions': 'Receipt',
    'Lessons': 'School',
    'Moves': 'Shipping'
  };
  
  return iconMap[buttonText] || 'Cart';
}