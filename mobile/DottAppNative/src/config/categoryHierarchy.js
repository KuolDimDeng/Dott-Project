export const CATEGORY_HIERARCHY = {
  food: {
    id: 'food',
    name: 'Food & Dining',
    icon: 'restaurant',
    color: '#ff6b6b',
    subcategories: [
      { id: 'burgers', name: 'Burgers', icon: 'fast-food' },
      { id: 'pizza', name: 'Pizza', icon: 'pizza' },
      { id: 'local_cuisine', name: 'Local Cuisine', icon: 'restaurant' },
      { id: 'chinese', name: 'Chinese', icon: 'nutrition' },
      { id: 'indian', name: 'Indian', icon: 'nutrition' },
      { id: 'italian', name: 'Italian', icon: 'restaurant' },
      { id: 'mexican', name: 'Mexican', icon: 'nutrition' },
      { id: 'fast_food', name: 'Fast Food', icon: 'fast-food' },
      { id: 'fine_dining', name: 'Fine Dining', icon: 'wine' },
      { id: 'cafe', name: 'Café & Coffee', icon: 'cafe' },
      { id: 'bakery', name: 'Bakery', icon: 'nutrition' },
      { id: 'seafood', name: 'Seafood', icon: 'fish' },
      { id: 'vegetarian', name: 'Vegetarian', icon: 'leaf' },
      { id: 'desserts', name: 'Desserts & Ice Cream', icon: 'ice-cream' },
      { id: 'healthy', name: 'Healthy & Organic', icon: 'heart' }
    ]
  },
  shopping: {
    id: 'shopping',
    name: 'Shopping',
    icon: 'cart',
    color: '#4ecdc4',
    subcategories: [
      { id: 'clothing', name: 'Clothing & Fashion', icon: 'shirt' },
      { id: 'electronics', name: 'Electronics', icon: 'phone-portrait' },
      { id: 'groceries', name: 'Groceries', icon: 'basket' },
      { id: 'pharmacy', name: 'Pharmacy', icon: 'medical' },
      { id: 'hardware', name: 'Hardware & Tools', icon: 'hammer' },
      { id: 'books', name: 'Books & Stationery', icon: 'book' },
      { id: 'furniture', name: 'Furniture', icon: 'bed' },
      { id: 'sports', name: 'Sports & Outdoors', icon: 'football' },
      { id: 'toys', name: 'Toys & Games', icon: 'game-controller' },
      { id: 'jewelry', name: 'Jewelry & Accessories', icon: 'diamond' },
      { id: 'home_decor', name: 'Home & Decor', icon: 'home' },
      { id: 'cosmetics', name: 'Cosmetics & Beauty', icon: 'sparkles' }
    ]
  },
  transport: {
    id: 'transport',
    name: 'Transport',
    icon: 'car',
    color: '#95e1d3',
    subcategories: [
      { id: 'taxi', name: 'Taxi', icon: 'car' },
      { id: 'ride_share', name: 'Ride Share', icon: 'car-sport' },
      { id: 'delivery', name: 'Delivery Service', icon: 'bicycle' },
      { id: 'logistics', name: 'Logistics & Freight', icon: 'bus' },
      { id: 'car_rental', name: 'Car Rental', icon: 'key' },
      { id: 'moving', name: 'Moving Services', icon: 'cube' },
      { id: 'courier', name: 'Courier', icon: 'send' },
      { id: 'airport_transfer', name: 'Airport Transfer', icon: 'airplane' }
    ]
  },
  services: {
    id: 'services',
    name: 'Services',
    icon: 'construct',
    color: '#f38181',
    subcategories: [
      { id: 'plumber', name: 'Plumbing', icon: 'water' },
      { id: 'electrician', name: 'Electrical', icon: 'flash' },
      { id: 'cleaning', name: 'Cleaning', icon: 'sparkles' },
      { id: 'gardening', name: 'Gardening & Landscaping', icon: 'leaf' },
      { id: 'pest_control', name: 'Pest Control', icon: 'bug' },
      { id: 'repair', name: 'Repair & Maintenance', icon: 'build' },
      { id: 'painting', name: 'Painting', icon: 'color-palette' },
      { id: 'construction', name: 'Construction', icon: 'hammer' },
      { id: 'consulting', name: 'Consulting', icon: 'briefcase' },
      { id: 'legal', name: 'Legal Services', icon: 'document-text' },
      { id: 'accounting', name: 'Accounting & Tax', icon: 'calculator' },
      { id: 'it_services', name: 'IT Services', icon: 'desktop' }
    ]
  },
  health: {
    id: 'health',
    name: 'Health & Medical',
    icon: 'medical',
    color: '#3d5af1',
    subcategories: [
      { id: 'clinic', name: 'Clinic', icon: 'medical' },
      { id: 'hospital', name: 'Hospital', icon: 'medkit' },
      { id: 'dental', name: 'Dental', icon: 'medical' },
      { id: 'optical', name: 'Optical', icon: 'eye' },
      { id: 'diagnostic', name: 'Diagnostic Center', icon: 'pulse' },
      { id: 'specialist', name: 'Specialist Doctor', icon: 'person' },
      { id: 'veterinary', name: 'Veterinary', icon: 'paw' },
      { id: 'mental_health', name: 'Mental Health', icon: 'happy' },
      { id: 'physiotherapy', name: 'Physiotherapy', icon: 'body' },
      { id: 'alternative', name: 'Alternative Medicine', icon: 'leaf' }
    ]
  },
  beauty: {
    id: 'beauty',
    name: 'Beauty & Wellness',
    icon: 'color-palette',
    color: '#ff6b9d',
    subcategories: [
      { id: 'salon', name: 'Hair Salon', icon: 'cut' },
      { id: 'spa', name: 'Spa & Massage', icon: 'flower' },
      { id: 'nails', name: 'Nail Salon', icon: 'hand-left' },
      { id: 'barber', name: 'Barber Shop', icon: 'cut' },
      { id: 'makeup', name: 'Makeup Artist', icon: 'color-palette' },
      { id: 'skincare', name: 'Skincare', icon: 'water' },
      { id: 'tattoo', name: 'Tattoo & Piercing', icon: 'color-fill' },
      { id: 'gym', name: 'Gym & Fitness', icon: 'fitness' },
      { id: 'yoga', name: 'Yoga & Pilates', icon: 'body' }
    ]
  },
  education: {
    id: 'education',
    name: 'Education',
    icon: 'school',
    color: '#667eea',
    subcategories: [
      { id: 'school', name: 'School', icon: 'school' },
      { id: 'college', name: 'College & University', icon: 'school' },
      { id: 'tutoring', name: 'Tutoring', icon: 'person' },
      { id: 'language', name: 'Language Classes', icon: 'language' },
      { id: 'music', name: 'Music Lessons', icon: 'musical-notes' },
      { id: 'art', name: 'Art Classes', icon: 'color-palette' },
      { id: 'vocational', name: 'Vocational Training', icon: 'build' },
      { id: 'online', name: 'Online Courses', icon: 'desktop' },
      { id: 'daycare', name: 'Daycare & Preschool', icon: 'happy' },
      { id: 'driving', name: 'Driving School', icon: 'car' }
    ]
  },
  entertainment: {
    id: 'entertainment',
    name: 'Entertainment',
    icon: 'game-controller',
    color: '#a8e6cf',
    subcategories: [
      { id: 'cinema', name: 'Cinema', icon: 'film' },
      { id: 'theater', name: 'Theater', icon: 'mic' },
      { id: 'nightclub', name: 'Nightclub & Bar', icon: 'wine' },
      { id: 'gaming', name: 'Gaming Center', icon: 'game-controller' },
      { id: 'bowling', name: 'Bowling', icon: 'tennisball' },
      { id: 'karaoke', name: 'Karaoke', icon: 'mic' },
      { id: 'events', name: 'Event Planning', icon: 'calendar' },
      { id: 'photography', name: 'Photography', icon: 'camera' },
      { id: 'dj', name: 'DJ Services', icon: 'musical-notes' }
    ]
  },
  real_estate: {
    id: 'real_estate',
    name: 'Real Estate',
    icon: 'business',
    color: '#ffd93d',
    subcategories: [
      { id: 'rent', name: 'For Rent', icon: 'key' },
      { id: 'sale', name: 'For Sale', icon: 'home' },
      { id: 'commercial', name: 'Commercial', icon: 'business' },
      { id: 'land', name: 'Land & Plots', icon: 'map' },
      { id: 'property_mgmt', name: 'Property Management', icon: 'briefcase' },
      { id: 'real_estate_agent', name: 'Real Estate Agent', icon: 'person' }
    ]
  },
  hotels: {
    id: 'hotels',
    name: 'Hotels & Lodging',
    icon: 'bed',
    color: '#c7ceea',
    subcategories: [
      { id: 'hotel', name: 'Hotel', icon: 'bed' },
      { id: 'motel', name: 'Motel', icon: 'bed' },
      { id: 'guesthouse', name: 'Guest House', icon: 'home' },
      { id: 'hostel', name: 'Hostel', icon: 'people' },
      { id: 'resort', name: 'Resort', icon: 'sunny' },
      { id: 'vacation_rental', name: 'Vacation Rental', icon: 'key' }
    ]
  }
};

// Helper function to get subcategories for a main category
export const getSubcategories = (categoryId) => {
  return CATEGORY_HIERARCHY[categoryId]?.subcategories || [];
};

// Helper function to get all categories as array
export const getAllCategories = () => {
  return Object.values(CATEGORY_HIERARCHY);
};

// Helper function to find category by subcategory
export const findCategoryBySubcategory = (subcategoryId) => {
  for (const [categoryId, category] of Object.entries(CATEGORY_HIERARCHY)) {
    const subcategory = category.subcategories.find(sub => sub.id === subcategoryId);
    if (subcategory) {
      return { category: categoryId, subcategory };
    }
  }
  return null;
};

// Business type to category mapping
export const BUSINESS_TYPE_MAPPING = {
  'restaurant': 'food',
  'cafe': 'food',
  'retail': 'shopping',
  'service': 'services',
  'health': 'health',
  'beauty': 'beauty',
  'education': 'education',
  'transport': 'transport',
  'hotel': 'hotels',
  'entertainment': 'entertainment',
  'real_estate': 'real_estate',
  'other': null // Will need manual selection
};

// Operating hours template
export const DEFAULT_OPERATING_HOURS = {
  monday: { open: '09:00', close: '17:00', isClosed: false },
  tuesday: { open: '09:00', close: '17:00', isClosed: false },
  wednesday: { open: '09:00', close: '17:00', isClosed: false },
  thursday: { open: '09:00', close: '17:00', isClosed: false },
  friday: { open: '09:00', close: '17:00', isClosed: false },
  saturday: { open: '09:00', close: '17:00', isClosed: false },
  sunday: { open: '09:00', close: '17:00', isClosed: true }
};

// Check if business should be open based on operating hours
export const isBusinessOpen = (operatingHours) => {
  const now = new Date();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = dayNames[now.getDay()];
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  
  const todayHours = operatingHours[currentDay];
  if (!todayHours || todayHours.isClosed) {
    return false;
  }
  
  return currentTime >= todayHours.open && currentTime <= todayHours.close;
};