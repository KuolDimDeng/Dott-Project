/**
 * Interaction Manager
 * Dynamically handles all business-consumer interaction types
 * Adapts UI based on business category and interaction type
 */

export const InteractionType = {
  ORDER: 'order',
  BOOKING: 'booking',
  RENTAL: 'rental',
  SERVICE: 'service',
  QUOTE: 'quote',
  SUBSCRIPTION: 'subscription',
  APPLICATION: 'application',
  REGISTRATION: 'registration',
  CONSULTATION: 'consultation'
};

export const BusinessCategory = {
  // Food & Beverage
  RESTAURANT: 'restaurant',
  CAFE: 'cafe',
  BAR: 'bar',
  BAKERY: 'bakery',
  FOOD_TRUCK: 'food_truck',
  CATERING: 'catering',
  GROCERY: 'grocery',
  
  // Retail
  CLOTHING: 'clothing',
  ELECTRONICS: 'electronics',
  FURNITURE: 'furniture',
  BOOKSTORE: 'bookstore',
  PHARMACY: 'pharmacy',
  JEWELRY: 'jewelry',
  SPORTING_GOODS: 'sporting_goods',
  
  // Accommodation
  HOTEL: 'hotel',
  MOTEL: 'motel',
  HOSTEL: 'hostel',
  VACATION_RENTAL: 'vacation_rental',
  BED_BREAKFAST: 'bed_breakfast',
  
  // Health & Wellness
  CLINIC: 'clinic',
  HOSPITAL: 'hospital',
  DENTIST: 'dentist',
  PHARMACY_CLINIC: 'pharmacy_clinic',
  THERAPIST: 'therapist',
  CHIROPRACTOR: 'chiropractor',
  
  // Beauty & Personal Care
  SALON: 'salon',
  BARBERSHOP: 'barbershop',
  SPA: 'spa',
  NAIL_SALON: 'nail_salon',
  MASSAGE: 'massage',
  TATTOO: 'tattoo',
  
  // Fitness & Sports
  GYM: 'gym',
  YOGA_STUDIO: 'yoga_studio',
  MARTIAL_ARTS: 'martial_arts',
  SPORTS_CLUB: 'sports_club',
  PERSONAL_TRAINER: 'personal_trainer',
  
  // Professional Services
  LAWYER: 'lawyer',
  ACCOUNTANT: 'accountant',
  CONSULTANT: 'consultant',
  REAL_ESTATE: 'real_estate',
  INSURANCE: 'insurance',
  FINANCIAL_ADVISOR: 'financial_advisor',
  
  // Home Services
  PLUMBER: 'plumber',
  ELECTRICIAN: 'electrician',
  CARPENTER: 'carpenter',
  PAINTER: 'painter',
  LANDSCAPER: 'landscaper',
  CLEANING: 'cleaning',
  PEST_CONTROL: 'pest_control',
  HANDYMAN: 'handyman',
  
  // Transportation
  TAXI: 'taxi',
  RIDE_SHARE: 'ride_share',
  CAR_RENTAL: 'car_rental',
  BIKE_RENTAL: 'bike_rental',
  MOVING: 'moving',
  DELIVERY: 'delivery',
  COURIER: 'courier',
  
  // Education
  SCHOOL: 'school',
  UNIVERSITY: 'university',
  TRAINING_CENTER: 'training_center',
  TUTORING: 'tutoring',
  DRIVING_SCHOOL: 'driving_school',
  LANGUAGE_SCHOOL: 'language_school',
  
  // Entertainment & Events
  EVENT_VENUE: 'event_venue',
  WEDDING_PLANNER: 'wedding_planner',
  PHOTOGRAPHER: 'photographer',
  DJ: 'dj',
  BAND: 'band',
  PARTY_RENTAL: 'party_rental',
  
  // Technology
  SOFTWARE: 'software',
  WEB_DESIGN: 'web_design',
  IT_SUPPORT: 'it_support',
  APP_DEVELOPMENT: 'app_development',
  DIGITAL_MARKETING: 'digital_marketing',
  
  // Automotive
  AUTO_REPAIR: 'auto_repair',
  CAR_WASH: 'car_wash',
  AUTO_PARTS: 'auto_parts',
  TIRE_SHOP: 'tire_shop',
  
  // Pet Services
  VETERINARY: 'veterinary',
  PET_GROOMING: 'pet_grooming',
  PET_BOARDING: 'pet_boarding',
  PET_STORE: 'pet_store',
  
  // Manufacturing & B2B
  MANUFACTURER: 'manufacturer',
  WHOLESALER: 'wholesaler',
  DISTRIBUTOR: 'distributor',
  SUPPLIER: 'supplier',
  
  // Employment
  EMPLOYER: 'employer',
  RECRUITMENT: 'recruitment',
  TEMP_AGENCY: 'temp_agency',
  
  // Government & Public
  GOVERNMENT: 'government',
  NONPROFIT: 'nonprofit',
  UTILITY: 'utility',
  
  // Other
  OTHER: 'other',
  CUSTOM: 'custom'
};

class InteractionManager {
  constructor() {
    this.currentBusiness = null;
    this.currentInteraction = null;
  }

  /**
   * Initialize with business data
   */
  init(business) {
    this.currentBusiness = business;
    return this;
  }

  /**
   * Get primary interaction type for a business
   */
  getPrimaryInteraction(business) {
    return business.primary_interaction_type || InteractionType.ORDER;
  }

  /**
   * Get all supported interactions for a business
   */
  getSupportedInteractions(business) {
    return business.supported_interactions || [InteractionType.ORDER];
  }

  /**
   * Detect interaction type from context
   */
  detectInteractionType(business, context = {}) {
    // If explicitly specified
    if (context.interactionType) {
      return context.interactionType;
    }

    // Analyze context clues
    if (context.appointmentDate || context.timeSlot) {
      return InteractionType.BOOKING;
    }
    if (context.rentalPeriod || context.returnDate) {
      return InteractionType.RENTAL;
    }
    if (context.quoteRequest || context.projectScope) {
      return InteractionType.QUOTE;
    }
    if (context.subscriptionPlan || context.billingCycle) {
      return InteractionType.SUBSCRIPTION;
    }
    if (context.jobPosition || context.resume) {
      return InteractionType.APPLICATION;
    }
    if (context.eventId || context.attendeeCount) {
      return InteractionType.REGISTRATION;
    }
    if (context.urgencyLevel || context.serviceLocation) {
      return InteractionType.SERVICE;
    }

    // Default to primary interaction
    return this.getPrimaryInteraction(business);
  }

  /**
   * Get UI configuration for interaction type
   */
  getUIConfig(business, interactionType) {
    const configs = {
      [InteractionType.ORDER]: {
        component: 'OrderInterface',
        primaryAction: 'Add to Cart',
        secondaryAction: 'Buy Now',
        requiresDate: false,
        requiresTimeSlot: false,
        showQuantity: true,
        showDeliveryOptions: true,
        catalogView: 'grid',
        fields: ['quantity', 'notes', 'deliveryMethod', 'deliveryAddress']
      },
      
      [InteractionType.BOOKING]: {
        component: 'BookingInterface',
        primaryAction: 'Book Now',
        secondaryAction: 'Check Availability',
        requiresDate: true,
        requiresTimeSlot: true,
        showQuantity: false,
        showDeliveryOptions: false,
        catalogView: 'list',
        calendarView: true,
        fields: ['date', 'time', 'duration', 'staffMember', 'notes']
      },
      
      [InteractionType.RENTAL]: {
        component: 'RentalInterface',
        primaryAction: 'Rent Now',
        secondaryAction: 'Check Availability',
        requiresDate: true,
        requiresTimeSlot: false,
        showQuantity: false,
        showDeliveryOptions: false,
        catalogView: 'cards',
        dateRangePicker: true,
        fields: ['startDate', 'endDate', 'pickupLocation', 'insurance']
      },
      
      [InteractionType.SERVICE]: {
        component: 'ServiceInterface',
        primaryAction: 'Request Service',
        secondaryAction: 'Get Quote',
        requiresDate: true,
        requiresTimeSlot: true,
        showQuantity: false,
        showDeliveryOptions: false,
        urgencySelector: true,
        locationPicker: true,
        fields: ['serviceType', 'location', 'urgency', 'description', 'photos']
      },
      
      [InteractionType.QUOTE]: {
        component: 'QuoteInterface',
        primaryAction: 'Request Quote',
        secondaryAction: 'View Examples',
        requiresDate: false,
        requiresTimeSlot: false,
        showQuantity: false,
        showDeliveryOptions: false,
        multiStepForm: true,
        fileUpload: true,
        fields: ['projectScope', 'budget', 'timeline', 'requirements', 'attachments']
      },
      
      [InteractionType.SUBSCRIPTION]: {
        component: 'SubscriptionInterface',
        primaryAction: 'Subscribe',
        secondaryAction: 'Start Free Trial',
        requiresDate: false,
        requiresTimeSlot: false,
        showQuantity: false,
        showDeliveryOptions: false,
        planSelector: true,
        billingCycleSelector: true,
        fields: ['plan', 'billingCycle', 'startDate', 'paymentMethod']
      },
      
      [InteractionType.APPLICATION]: {
        component: 'ApplicationInterface',
        primaryAction: 'Apply Now',
        secondaryAction: 'Save Draft',
        requiresDate: false,
        requiresTimeSlot: false,
        showQuantity: false,
        showDeliveryOptions: false,
        multiStepForm: true,
        documentUpload: true,
        fields: ['position', 'resume', 'coverLetter', 'references', 'portfolio']
      },
      
      [InteractionType.REGISTRATION]: {
        component: 'RegistrationInterface',
        primaryAction: 'Register',
        secondaryAction: 'Join Waitlist',
        requiresDate: false,
        requiresTimeSlot: false,
        showQuantity: true, // Number of attendees
        showDeliveryOptions: false,
        attendeeForm: true,
        fields: ['eventId', 'attendees', 'dietaryRequirements', 'specialNeeds']
      },
      
      [InteractionType.CONSULTATION]: {
        component: 'ConsultationInterface',
        primaryAction: 'Book Consultation',
        secondaryAction: 'Free Consultation',
        requiresDate: true,
        requiresTimeSlot: true,
        showQuantity: false,
        showDeliveryOptions: false,
        consultationType: true,
        fields: ['topic', 'preferredDate', 'consultationType', 'description']
      }
    };

    return configs[interactionType] || configs[InteractionType.ORDER];
  }

  /**
   * Get status flow for interaction type
   */
  getStatusFlow(interactionType) {
    const flows = {
      [InteractionType.ORDER]: [
        'pending', 'confirmed', 'preparing', 'ready', 'delivered', 'completed'
      ],
      [InteractionType.BOOKING]: [
        'requested', 'confirmed', 'reminded', 'checked_in', 'completed'
      ],
      [InteractionType.RENTAL]: [
        'reserved', 'confirmed', 'picked_up', 'active', 'returned'
      ],
      [InteractionType.SERVICE]: [
        'requested', 'assigned', 'en_route', 'in_progress', 'completed'
      ],
      [InteractionType.QUOTE]: [
        'requested', 'drafting', 'sent', 'negotiating', 'accepted', 'rejected'
      ],
      [InteractionType.SUBSCRIPTION]: [
        'trial', 'active', 'paused', 'cancelled', 'expired'
      ],
      [InteractionType.APPLICATION]: [
        'draft', 'submitted', 'under_review', 'interview', 'offer', 'hired', 'rejected'
      ],
      [InteractionType.REGISTRATION]: [
        'registered', 'waitlisted', 'confirmed', 'attended', 'no_show'
      ],
      [InteractionType.CONSULTATION]: [
        'requested', 'scheduled', 'confirmed', 'in_progress', 'completed'
      ]
    };

    return flows[interactionType] || flows[InteractionType.ORDER];
  }

  /**
   * Get display labels for interaction type
   */
  getLabels(interactionType) {
    const labels = {
      [InteractionType.ORDER]: {
        title: 'Order',
        action: 'Order',
        items: 'Products',
        history: 'Order History',
        details: 'Order Details',
        confirm: 'Place Order'
      },
      [InteractionType.BOOKING]: {
        title: 'Booking',
        action: 'Book',
        items: 'Services',
        history: 'Booking History',
        details: 'Booking Details',
        confirm: 'Confirm Booking'
      },
      [InteractionType.RENTAL]: {
        title: 'Rental',
        action: 'Rent',
        items: 'Available Items',
        history: 'Rental History',
        details: 'Rental Details',
        confirm: 'Confirm Rental'
      },
      [InteractionType.SERVICE]: {
        title: 'Service Request',
        action: 'Request',
        items: 'Services',
        history: 'Service History',
        details: 'Request Details',
        confirm: 'Submit Request'
      },
      [InteractionType.QUOTE]: {
        title: 'Quote Request',
        action: 'Request Quote',
        items: 'Services',
        history: 'Quote History',
        details: 'Quote Details',
        confirm: 'Request Quote'
      },
      [InteractionType.SUBSCRIPTION]: {
        title: 'Subscription',
        action: 'Subscribe',
        items: 'Plans',
        history: 'Subscription History',
        details: 'Plan Details',
        confirm: 'Start Subscription'
      },
      [InteractionType.APPLICATION]: {
        title: 'Application',
        action: 'Apply',
        items: 'Positions',
        history: 'Applications',
        details: 'Application Details',
        confirm: 'Submit Application'
      },
      [InteractionType.REGISTRATION]: {
        title: 'Registration',
        action: 'Register',
        items: 'Events',
        history: 'Registrations',
        details: 'Registration Details',
        confirm: 'Complete Registration'
      },
      [InteractionType.CONSULTATION]: {
        title: 'Consultation',
        action: 'Book Consultation',
        items: 'Consultation Types',
        history: 'Consultations',
        details: 'Consultation Details',
        confirm: 'Book Consultation'
      }
    };

    return labels[interactionType] || labels[InteractionType.ORDER];
  }

  /**
   * Create interaction object
   */
  createInteraction(type, business, data) {
    const referenceNumber = this.generateReferenceNumber(type);
    
    return {
      id: this.generateUUID(),
      referenceNumber,
      interactionType: type,
      businessId: business.id,
      businessName: business.business_name,
      status: 'pending',
      createdAt: new Date().toISOString(),
      ...data
    };
  }

  /**
   * Generate reference number
   */
  generateReferenceNumber(type) {
    const prefixes = {
      [InteractionType.ORDER]: 'ORD',
      [InteractionType.BOOKING]: 'BKG',
      [InteractionType.RENTAL]: 'RNT',
      [InteractionType.SERVICE]: 'SRV',
      [InteractionType.QUOTE]: 'QTE',
      [InteractionType.SUBSCRIPTION]: 'SUB',
      [InteractionType.APPLICATION]: 'APP',
      [InteractionType.REGISTRATION]: 'REG',
      [InteractionType.CONSULTATION]: 'CNS'
    };

    const prefix = prefixes[type] || 'INT';
    const random = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    return `${prefix}${random}`;
  }

  /**
   * Generate UUID
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Validate interaction data
   */
  validateInteraction(type, data) {
    const requiredFields = this.getRequiredFields(type);
    const errors = [];

    requiredFields.forEach(field => {
      if (!data[field]) {
        errors.push(`${field} is required`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get required fields for interaction type
   */
  getRequiredFields(type) {
    const fields = {
      [InteractionType.ORDER]: ['items', 'deliveryMethod'],
      [InteractionType.BOOKING]: ['serviceId', 'date', 'time'],
      [InteractionType.RENTAL]: ['itemId', 'startDate', 'endDate'],
      [InteractionType.SERVICE]: ['serviceType', 'location'],
      [InteractionType.QUOTE]: ['projectScope', 'timeline'],
      [InteractionType.SUBSCRIPTION]: ['planId', 'billingCycle'],
      [InteractionType.APPLICATION]: ['positionId', 'resume'],
      [InteractionType.REGISTRATION]: ['eventId', 'attendeeCount'],
      [InteractionType.CONSULTATION]: ['topic', 'preferredDate']
    };

    return fields[type] || [];
  }

  /**
   * Format interaction for display
   */
  formatInteraction(interaction) {
    const type = interaction.interactionType;
    const labels = this.getLabels(type);
    
    return {
      ...interaction,
      displayType: labels.title,
      displayStatus: this.formatStatus(interaction.status),
      displayDate: this.formatDate(interaction.createdAt),
      displayAmount: this.formatCurrency(interaction.totalAmount)
    };
  }

  /**
   * Format status for display
   */
  formatStatus(status) {
    return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
  }

  /**
   * Format date for display
   */
  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount || 0);
  }
}

// Export singleton instance
export default new InteractionManager();