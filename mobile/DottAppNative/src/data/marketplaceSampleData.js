// Sample marketplace data for Juba, South Sudan

export const MARKETPLACE_CATEGORIES = [
  { 
    id: 1, 
    name: 'Restaurants', 
    original_name: 'RESTAURANT',
    icon: 'restaurant',
    color: '#ef4444',
    count: 25
  },
  { 
    id: 2, 
    name: 'Grocery Stores', 
    original_name: 'GROCERY',
    icon: 'cart',
    color: '#10b981',
    count: 18
  },
  { 
    id: 3, 
    name: 'Medical & Health', 
    original_name: 'MEDICAL',
    icon: 'medical',
    color: '#3b82f6',
    count: 15
  },
  { 
    id: 4, 
    name: 'Hotels & Lodging', 
    original_name: 'HOTEL',
    icon: 'bed',
    color: '#8b5cf6',
    count: 12
  },
  { 
    id: 5, 
    name: 'Shopping & Retail', 
    original_name: 'RETAIL',
    icon: 'bag',
    color: '#f59e0b',
    count: 22
  },
  { 
    id: 6, 
    name: 'Transport & Logistics', 
    original_name: 'TRANSPORT',
    icon: 'car',
    color: '#06b6d4',
    count: 10
  },
  { 
    id: 7, 
    name: 'Banks & Finance', 
    original_name: 'BANK',
    icon: 'cash',
    color: '#10b981',
    count: 8
  },
  { 
    id: 8, 
    name: 'Beauty & Spa', 
    original_name: 'BEAUTY',
    icon: 'cut',
    color: '#ec4899',
    count: 14
  }
];

export const JUBA_BUSINESSES = [
  // Restaurants
  { 
    id: 1, 
    name: 'Juba Restaurant', 
    category: 'Restaurants',
    address: 'Hai Cinema, Juba', 
    phone: '+211 920 123 456',
    rating: 4.5,
    is_verified: true,
    is_featured: true
  },
  { 
    id: 2, 
    name: 'Nile Cafe', 
    category: 'Restaurants',
    address: 'Airport Road, Juba', 
    phone: '+211 920 234 567',
    rating: 4.2,
    is_verified: true
  },
  { 
    id: 3, 
    name: 'African Kitchen', 
    category: 'Restaurants',
    address: 'Ministries Road, Juba', 
    phone: '+211 920 345 678',
    rating: 4.7,
    is_verified: true,
    is_featured: true
  },
  
  // Grocery Stores
  { 
    id: 4, 
    name: 'JIT Supermarket', 
    category: 'Grocery Stores',
    address: 'Juba Town, Central Market', 
    phone: '+211 920 456 789',
    rating: 4.3,
    is_verified: true
  },
  { 
    id: 5, 
    name: 'City Fresh Market', 
    category: 'Grocery Stores',
    address: 'Konyo Konyo Market', 
    phone: '+211 920 567 890',
    rating: 4.1,
    is_verified: true
  },
  { 
    id: 6, 
    name: 'Juba Mart', 
    category: 'Grocery Stores',
    address: 'Hai Malakal, Juba', 
    phone: '+211 920 678 901',
    rating: 4.0,
    is_verified: false
  },
  
  // Medical & Health
  { 
    id: 7, 
    name: 'Juba Teaching Hospital', 
    category: 'Medical & Health',
    address: 'Hospital Road, Juba', 
    phone: '+211 920 789 012',
    rating: 4.4,
    is_verified: true,
    is_featured: true
  },
  { 
    id: 8, 
    name: 'Boma Medical Centre', 
    category: 'Medical & Health',
    address: 'Boma Road, Juba', 
    phone: '+211 920 890 123',
    rating: 4.6,
    is_verified: true
  },
  { 
    id: 9, 
    name: 'Unity Pharmacy', 
    category: 'Medical & Health',
    address: 'Custom Market, Juba', 
    phone: '+211 920 901 234',
    rating: 4.2,
    is_verified: true
  },
  
  // Hotels & Lodging
  { 
    id: 10, 
    name: 'Crown Hotel Juba', 
    category: 'Hotels & Lodging',
    address: 'Airport Road, Juba', 
    phone: '+211 920 012 345',
    rating: 4.5,
    is_verified: true,
    is_featured: true
  },
  { 
    id: 11, 
    name: 'Pyramid Continental Hotel', 
    category: 'Hotels & Lodging',
    address: 'Kololo Road, Juba', 
    phone: '+211 920 123 678',
    rating: 4.3,
    is_verified: true
  },
  { 
    id: 12, 
    name: 'Tulip Inn Juba', 
    category: 'Hotels & Lodging',
    address: 'Hai Cinema, Juba', 
    phone: '+211 920 234 789',
    rating: 4.1,
    is_verified: true
  },
  
  // Shopping & Retail
  { 
    id: 13, 
    name: 'Juba Shopping Mall', 
    category: 'Shopping & Retail',
    address: 'Ministries Road, Juba', 
    phone: '+211 920 345 890',
    rating: 4.4,
    is_verified: true,
    is_featured: true
  },
  { 
    id: 14, 
    name: 'South Sudan Boutique', 
    category: 'Shopping & Retail',
    address: 'Market Street, Juba', 
    phone: '+211 920 456 901',
    rating: 4.2,
    is_verified: true
  },
  { 
    id: 15, 
    name: 'Fashion House Juba', 
    category: 'Shopping & Retail',
    address: 'Hai Amarat, Juba', 
    phone: '+211 920 567 012',
    rating: 4.0,
    is_verified: false
  },
  
  // Transport & Logistics
  { 
    id: 16, 
    name: 'Juba Express Transport', 
    category: 'Transport & Logistics',
    address: 'Bus Park, Juba', 
    phone: '+211 920 678 123',
    rating: 4.1,
    is_verified: true
  },
  { 
    id: 17, 
    name: 'Nile Logistics', 
    category: 'Transport & Logistics',
    address: 'Industrial Area, Juba', 
    phone: '+211 920 789 234',
    rating: 4.3,
    is_verified: true
  },
  
  // Banks & Finance
  { 
    id: 18, 
    name: 'KCB Bank South Sudan', 
    category: 'Banks & Finance',
    address: 'Ministries Road, Juba', 
    phone: '+211 920 890 345',
    rating: 4.4,
    is_verified: true,
    is_featured: true
  },
  { 
    id: 19, 
    name: 'Equity Bank', 
    category: 'Banks & Finance',
    address: 'Juba Town Center', 
    phone: '+211 920 901 456',
    rating: 4.2,
    is_verified: true
  },
  { 
    id: 20, 
    name: 'Stanbic Bank', 
    category: 'Banks & Finance',
    address: 'Airport Road, Juba', 
    phone: '+211 920 012 567',
    rating: 4.3,
    is_verified: true
  },
  
  // Beauty & Spa
  { 
    id: 21, 
    name: 'Beauty Palace Salon', 
    category: 'Beauty & Spa',
    address: 'Hai Malakal, Juba', 
    phone: '+211 920 123 890',
    rating: 4.6,
    is_verified: true
  },
  { 
    id: 22, 
    name: 'Elegance Spa', 
    category: 'Beauty & Spa',
    address: 'Thongpiny, Juba', 
    phone: '+211 920 234 901',
    rating: 4.5,
    is_verified: true,
    is_featured: true
  },
  { 
    id: 23, 
    name: 'Queens Beauty Center', 
    category: 'Beauty & Spa',
    address: 'Custom Market, Juba', 
    phone: '+211 920 345 012',
    rating: 4.3,
    is_verified: false
  },
  
  // Additional businesses
  { 
    id: 24, 
    name: 'Logali House', 
    category: 'Restaurants',
    address: 'Hai Amarat, Juba', 
    phone: '+211 920 456 123',
    rating: 4.8,
    is_verified: true,
    is_featured: true
  },
  { 
    id: 25, 
    name: 'Da Vinci Restaurant', 
    category: 'Restaurants',
    address: 'Juba Town, Juba', 
    phone: '+211 920 567 234',
    rating: 4.4,
    is_verified: true
  }
];

export const getFeaturedBusinesses = () => {
  return JUBA_BUSINESSES.filter(b => b.is_featured);
};

export const getBusinessesByCategory = (category) => {
  if (!category) return JUBA_BUSINESSES;
  return JUBA_BUSINESSES.filter(b => b.category === category);
};

export const searchBusinesses = (query) => {
  const searchTerm = query.toLowerCase();
  return JUBA_BUSINESSES.filter(b => 
    b.name.toLowerCase().includes(searchTerm) ||
    b.category.toLowerCase().includes(searchTerm) ||
    b.address.toLowerCase().includes(searchTerm)
  );
};