// Business Profile Template Model
// Defines the structure and default values for business marketplace profiles

export const BusinessProfileTemplate = {
  // Basic Information
  basic: {
    businessName: '',
    businessType: '',
    tagline: '',  // Short catchy phrase
    description: '', // Detailed description
    established: null, // Year established
    registrationNumber: '', // Business registration
  },

  // Visual Assets
  visuals: {
    bannerImage: null, // Header background image
    logoImage: null, // Business logo/profile image
    galleryImages: [], // Additional photos (max 10)
    menuImages: [], // Menu/product specific images
  },

  // Contact & Location
  contact: {
    phone: '',
    whatsapp: '',
    email: '',
    website: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
      coordinates: {
        latitude: null,
        longitude: null,
      }
    }
  },

  // Social Media
  social: {
    facebook: '',
    instagram: '',
    twitter: '',
    linkedin: '',
    youtube: '',
    tiktok: '',
  },

  // Operating Information
  operations: {
    operatingHours: {
      monday: { open: '09:00', close: '17:00', isClosed: false },
      tuesday: { open: '09:00', close: '17:00', isClosed: false },
      wednesday: { open: '09:00', close: '17:00', isClosed: false },
      thursday: { open: '09:00', close: '17:00', isClosed: false },
      friday: { open: '09:00', close: '17:00', isClosed: false },
      saturday: { open: '09:00', close: '17:00', isClosed: false },
      sunday: { open: '09:00', close: '17:00', isClosed: true },
    },
    holidaySchedule: [], // Special holiday hours
    currentStatus: 'closed', // open, closed, busy
    autoStatus: true, // Auto-update based on hours
  },

  // Service Options
  services: {
    delivery: {
      enabled: false,
      radius: 5, // km
      minOrder: 0,
      fee: 0,
      estimatedTime: '30-45 min',
    },
    pickup: {
      enabled: false,
      estimatedTime: '15-20 min',
    },
    dineIn: {
      enabled: false,
      reservations: false,
      capacity: 0,
    },
    booking: {
      enabled: false,
      advanceBooking: 7, // days
      cancellationPolicy: '24 hours',
    }
  },

  // Products/Menu/Services (Dynamic based on business type)
  offerings: {
    type: 'menu', // 'menu', 'products', 'services'
    categories: [],
    featured: [], // Featured items IDs
    displayMode: 'grid', // 'grid', 'list', 'carousel'
  },

  // Reviews & Ratings
  reputation: {
    rating: 0,
    reviewCount: 0,
    responseRate: 0,
    responseTime: '< 1 hour',
    verified: false,
  },

  // Payment Options
  payments: {
    cash: true,
    card: false,
    mobileMoney: false,
    bankTransfer: false,
    cryptocurrency: false,
  },

  // Categories & Tags
  discovery: {
    mainCategory: '',
    subcategories: [],
    tags: [], // searchable tags
    keywords: [], // SEO keywords
  },

  // Business Features (varies by type)
  features: {
    wifi: false,
    parking: false,
    wheelchair: false,
    outdoor: false,
    airConditioning: false,
    delivery: false,
    takeaway: false,
    petFriendly: false,
    kidsFriendly: false,
  },

  // Marketplace Settings
  marketplace: {
    isPublished: false,
    publishedAt: null,
    lastUpdated: null,
    viewCount: 0,
    saveCount: 0,
    shareCount: 0,
    priority: 0, // For featured listings
  }
};

// Business Type Specific Templates
export const BusinessTypeTemplates = {
  RESTAURANT_CAFE: {
    offerings: {
      type: 'menu',
      displayMode: 'list',
    },
    services: {
      delivery: { enabled: true },
      pickup: { enabled: true },
      dineIn: { enabled: true, reservations: true },
    },
    features: {
      wifi: true,
      airConditioning: true,
      parking: true,
    }
  },
  
  RETAIL_STORE: {
    offerings: {
      type: 'products',
      displayMode: 'grid',
    },
    services: {
      delivery: { enabled: true },
      pickup: { enabled: true },
    },
    features: {
      parking: true,
      wheelchair: true,
    }
  },
  
  SERVICE_BUSINESS: {
    offerings: {
      type: 'services',
      displayMode: 'list',
    },
    services: {
      booking: { enabled: true, advanceBooking: 14 },
    },
    features: {
      wifi: true,
      parking: true,
    }
  },
  
  TAXI_DRIVER: {
    offerings: {
      type: 'services',
      displayMode: 'list',
    },
    services: {
      booking: { enabled: true, advanceBooking: 1 },
    },
    features: {
      airConditioning: true,
      petFriendly: false,
    }
  },
  
  COURIER: {
    offerings: {
      type: 'services',
      displayMode: 'list',
    },
    services: {
      delivery: { enabled: true, radius: 20 },
    },
  },
  
  HAIRSTYLIST: {
    offerings: {
      type: 'services',
      displayMode: 'grid',
    },
    services: {
      booking: { enabled: true, advanceBooking: 30 },
    },
    features: {
      wifi: true,
      airConditioning: true,
      parking: true,
    }
  },
  
  MEDICAL_DENTAL: {
    offerings: {
      type: 'services',
      displayMode: 'list',
    },
    services: {
      booking: { enabled: true, advanceBooking: 60 },
    },
    features: {
      wheelchair: true,
      parking: true,
      airConditioning: true,
    }
  },
  
  GROCERY_MARKET: {
    offerings: {
      type: 'products',
      displayMode: 'grid',
    },
    services: {
      delivery: { enabled: true },
      pickup: { enabled: true },
    },
    features: {
      parking: true,
      wheelchair: true,
      airConditioning: true,
    }
  },
};

// Function to generate template based on business type
export function generateBusinessProfileTemplate(businessType, businessData = {}) {
  const baseTemplate = JSON.parse(JSON.stringify(BusinessProfileTemplate));
  const typeSpecific = BusinessTypeTemplates[businessType] || {};
  
  // Merge type-specific settings
  const template = {
    ...baseTemplate,
    ...typeSpecific,
    basic: {
      ...baseTemplate.basic,
      businessName: businessData.businessName || '',
      businessType: businessType,
    },
    contact: {
      ...baseTemplate.contact,
      phone: businessData.phone || '',
      email: businessData.email || '',
      address: {
        ...baseTemplate.contact.address,
        city: businessData.city || '',
        country: businessData.country || '',
      }
    },
    discovery: {
      ...baseTemplate.discovery,
      mainCategory: getMainCategoryForType(businessType),
    }
  };
  
  return template;
}

// Helper function to map business type to main category
function getMainCategoryForType(businessType) {
  const mapping = {
    RESTAURANT_CAFE: 'food',
    RETAIL_STORE: 'shopping',
    GROCERY_MARKET: 'shopping',
    PHARMACY: 'health',
    MEDICAL_DENTAL: 'health',
    TAXI_DRIVER: 'transport',
    COURIER: 'transport',
    HAIRSTYLIST: 'beauty',
    PLUMBER: 'home_services',
    ELECTRICIAN: 'home_services',
    CONSULTANT: 'professional',
    PHOTOGRAPHER: 'events',
  };
  
  return mapping[businessType] || 'other';
}

// Validation rules for profile completeness
export const ProfileCompleteness = {
  required: [
    'basic.businessName',
    'basic.description',
    'contact.phone',
    'contact.address.city',
    'operations.operatingHours',
    'discovery.subcategories',
  ],
  recommended: [
    'visuals.logoImage',
    'visuals.bannerImage',
    'contact.email',
    'contact.whatsapp',
    'social.facebook',
    'social.instagram',
  ],
  optional: [
    'basic.tagline',
    'visuals.galleryImages',
    'contact.website',
    'social.twitter',
    'social.linkedin',
  ]
};

// Calculate profile completeness percentage
export function calculateProfileCompleteness(profile) {
  const checks = {
    required: 0,
    recommended: 0,
    optional: 0,
  };
  
  const totals = {
    required: ProfileCompleteness.required.length,
    recommended: ProfileCompleteness.recommended.length,
    optional: ProfileCompleteness.optional.length,
  };
  
  // Check required fields
  ProfileCompleteness.required.forEach(path => {
    if (getNestedValue(profile, path)) {
      checks.required++;
    }
  });
  
  // Check recommended fields
  ProfileCompleteness.recommended.forEach(path => {
    if (getNestedValue(profile, path)) {
      checks.recommended++;
    }
  });
  
  // Check optional fields
  ProfileCompleteness.optional.forEach(path => {
    if (getNestedValue(profile, path)) {
      checks.optional++;
    }
  });
  
  // Calculate weighted percentage
  const requiredWeight = 0.5;
  const recommendedWeight = 0.3;
  const optionalWeight = 0.2;
  
  const percentage = Math.round(
    ((checks.required / totals.required) * requiredWeight +
     (checks.recommended / totals.recommended) * recommendedWeight +
     (checks.optional / totals.optional) * optionalWeight) * 100
  );
  
  return {
    percentage,
    checks,
    totals,
    isComplete: checks.required === totals.required,
  };
}

// Helper to get nested object value by path
function getNestedValue(obj, path) {
  return path.split('.').reduce((curr, prop) => curr?.[prop], obj);
}

export default BusinessProfileTemplate;