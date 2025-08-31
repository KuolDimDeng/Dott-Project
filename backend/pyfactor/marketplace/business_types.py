"""
Comprehensive Business Type Configuration System
Defines all business types and their interaction patterns
"""

from enum import Enum
from typing import Dict, List, Any

class InteractionType(Enum):
    """All possible business-consumer interaction types"""
    ORDER = "order"           # Products (retail, restaurant)
    BOOKING = "booking"       # Time slots (appointments, reservations)
    RENTAL = "rental"         # Temporary use (cars, equipment)
    SERVICE = "service"       # On-demand/scheduled work
    QUOTE = "quote"          # Estimates/proposals
    SUBSCRIPTION = "subscription"  # Recurring services
    APPLICATION = "application"    # Jobs, memberships
    REGISTRATION = "registration"  # Events, classes
    CONSULTATION = "consultation"  # Professional advice
    VIEWING = "viewing"       # Property viewings, showrooms
    LISTING = "listing"       # Property/item listings for sale/rent
    INQUIRY = "inquiry"       # General inquiries, interest expressions

class BusinessCategory(Enum):
    """Main business categories"""
    # Food & Beverage
    RESTAURANT = "restaurant"
    CAFE = "cafe"
    BAR = "bar"
    BAKERY = "bakery"
    FOOD_TRUCK = "food_truck"
    CATERING = "catering"
    GROCERY = "grocery"
    
    # Retail
    CLOTHING = "clothing"
    ELECTRONICS = "electronics"
    FURNITURE = "furniture"
    BOOKSTORE = "bookstore"
    PHARMACY = "pharmacy"
    JEWELRY = "jewelry"
    SPORTING_GOODS = "sporting_goods"
    SHOWROOM = "showroom"
    ART_GALLERY = "art_gallery"
    DEALERSHIP = "dealership"
    
    # Accommodation
    HOTEL = "hotel"
    MOTEL = "motel"
    HOSTEL = "hostel"
    VACATION_RENTAL = "vacation_rental"
    BED_BREAKFAST = "bed_breakfast"
    PROPERTY_MANAGEMENT = "property_management"
    
    # Health & Wellness
    CLINIC = "clinic"
    HOSPITAL = "hospital"
    DENTIST = "dentist"
    PHARMACY_CLINIC = "pharmacy_clinic"
    THERAPIST = "therapist"
    CHIROPRACTOR = "chiropractor"
    
    # Beauty & Personal Care
    SALON = "salon"
    BARBERSHOP = "barbershop"
    SPA = "spa"
    NAIL_SALON = "nail_salon"
    MASSAGE = "massage"
    TATTOO = "tattoo"
    
    # Fitness & Sports
    GYM = "gym"
    YOGA_STUDIO = "yoga_studio"
    MARTIAL_ARTS = "martial_arts"
    SPORTS_CLUB = "sports_club"
    PERSONAL_TRAINER = "personal_trainer"
    
    # Professional Services
    LAWYER = "lawyer"
    ACCOUNTANT = "accountant"
    CONSULTANT = "consultant"
    REAL_ESTATE = "real_estate"
    INSURANCE = "insurance"
    FINANCIAL_ADVISOR = "financial_advisor"
    
    # Home Services
    PLUMBER = "plumber"
    ELECTRICIAN = "electrician"
    CARPENTER = "carpenter"
    PAINTER = "painter"
    LANDSCAPER = "landscaper"
    CLEANING = "cleaning"
    PEST_CONTROL = "pest_control"
    HANDYMAN = "handyman"
    
    # Transportation
    TAXI = "taxi"
    RIDE_SHARE = "ride_share"
    CAR_RENTAL = "car_rental"
    BIKE_RENTAL = "bike_rental"
    MOVING = "moving"
    DELIVERY = "delivery"
    COURIER = "courier"
    
    # Education
    SCHOOL = "school"
    UNIVERSITY = "university"
    TRAINING_CENTER = "training_center"
    TUTORING = "tutoring"
    DRIVING_SCHOOL = "driving_school"
    LANGUAGE_SCHOOL = "language_school"
    
    # Entertainment & Events
    EVENT_VENUE = "event_venue"
    WEDDING_PLANNER = "wedding_planner"
    PHOTOGRAPHER = "photographer"
    DJ = "dj"
    BAND = "band"
    PARTY_RENTAL = "party_rental"
    
    # Technology
    SOFTWARE = "software"
    WEB_DESIGN = "web_design"
    IT_SUPPORT = "it_support"
    APP_DEVELOPMENT = "app_development"
    DIGITAL_MARKETING = "digital_marketing"
    
    # Automotive
    AUTO_REPAIR = "auto_repair"
    CAR_WASH = "car_wash"
    AUTO_PARTS = "auto_parts"
    TIRE_SHOP = "tire_shop"
    
    # Pet Services
    VETERINARY = "veterinary"
    PET_GROOMING = "pet_grooming"
    PET_BOARDING = "pet_boarding"
    PET_STORE = "pet_store"
    
    # Manufacturing & B2B
    MANUFACTURER = "manufacturer"
    WHOLESALER = "wholesaler"
    DISTRIBUTOR = "distributor"
    SUPPLIER = "supplier"
    
    # Employment
    EMPLOYER = "employer"
    RECRUITMENT = "recruitment"
    TEMP_AGENCY = "temp_agency"
    
    # Government & Public
    GOVERNMENT = "government"
    NONPROFIT = "nonprofit"
    UTILITY = "utility"
    
    # Other
    OTHER = "other"
    CUSTOM = "custom"


# Comprehensive business type configuration
BUSINESS_TYPE_CONFIG: Dict[str, Dict[str, Any]] = {
    # ============ FOOD & BEVERAGE ============
    BusinessCategory.RESTAURANT.value: {
        "display_name": "Restaurant",
        "primary_interaction": InteractionType.ORDER,
        "supported_interactions": [InteractionType.ORDER, InteractionType.BOOKING, InteractionType.CATERING],
        "features": {
            "menu_management": True,
            "table_reservations": True,
            "delivery": True,
            "pickup": True,
            "dine_in": True,
        },
        "ui_config": {
            "primary_action": "Order Food",
            "secondary_action": "Reserve Table",
            "catalog_type": "menu",
            "time_slots": False,
            "instant_booking": False,
        },
        "status_flow": ["pending", "confirmed", "preparing", "ready", "delivered", "completed"],
    },
    
    BusinessCategory.CAFE.value: {
        "display_name": "Cafe",
        "primary_interaction": InteractionType.ORDER,
        "supported_interactions": [InteractionType.ORDER],
        "features": {
            "menu_management": True,
            "delivery": True,
            "pickup": True,
        },
        "ui_config": {
            "primary_action": "Order",
            "catalog_type": "menu",
        },
        "status_flow": ["pending", "confirmed", "preparing", "ready", "completed"],
    },
    
    BusinessCategory.CATERING.value: {
        "display_name": "Catering Service",
        "primary_interaction": InteractionType.QUOTE,
        "supported_interactions": [InteractionType.QUOTE, InteractionType.ORDER],
        "features": {
            "custom_quotes": True,
            "event_booking": True,
            "advance_booking": True,
        },
        "ui_config": {
            "primary_action": "Request Quote",
            "secondary_action": "Book Event",
            "requires_date": True,
            "requires_guest_count": True,
        },
        "status_flow": ["requested", "quoted", "accepted", "preparing", "delivered", "completed"],
    },
    
    # ============ RETAIL ============
    BusinessCategory.CLOTHING.value: {
        "display_name": "Clothing Store",
        "primary_interaction": InteractionType.ORDER,
        "supported_interactions": [InteractionType.ORDER],
        "features": {
            "inventory_management": True,
            "size_variants": True,
            "color_variants": True,
            "delivery": True,
            "pickup": True,
            "returns": True,
        },
        "ui_config": {
            "primary_action": "Shop Now",
            "catalog_type": "products",
            "filters": ["size", "color", "brand", "price"],
        },
        "status_flow": ["pending", "confirmed", "processing", "shipped", "delivered", "completed"],
    },
    
    BusinessCategory.PHARMACY.value: {
        "display_name": "Pharmacy",
        "primary_interaction": InteractionType.ORDER,
        "supported_interactions": [InteractionType.ORDER, InteractionType.CONSULTATION],
        "features": {
            "prescription_required": True,
            "delivery": True,
            "pickup": True,
            "consultation": True,
        },
        "ui_config": {
            "primary_action": "Order Medicine",
            "secondary_action": "Consult Pharmacist",
            "requires_prescription": True,
        },
        "status_flow": ["pending", "verified", "preparing", "ready", "delivered", "completed"],
    },
    
    # ============ ACCOMMODATION ============
    BusinessCategory.HOTEL.value: {
        "display_name": "Hotel",
        "primary_interaction": InteractionType.BOOKING,
        "supported_interactions": [InteractionType.BOOKING, InteractionType.ORDER],
        "features": {
            "room_inventory": True,
            "calendar_booking": True,
            "room_service": True,
            "amenities": True,
            "check_in_out": True,
        },
        "ui_config": {
            "primary_action": "Book Room",
            "secondary_action": "Order Room Service",
            "catalog_type": "rooms",
            "requires_dates": True,
            "requires_guests": True,
        },
        "status_flow": ["requested", "confirmed", "check_in_due", "checked_in", "checked_out", "completed"],
    },
    
    BusinessCategory.VACATION_RENTAL.value: {
        "display_name": "Vacation Rental",
        "primary_interaction": InteractionType.RENTAL,
        "supported_interactions": [InteractionType.RENTAL, InteractionType.VIEWING],
        "features": {
            "property_management": True,
            "calendar_booking": True,
            "cleaning_fee": True,
            "security_deposit": True,
            "virtual_tours": True,
        },
        "ui_config": {
            "primary_action": "Book Property",
            "secondary_action": "Virtual Tour",
            "catalog_type": "properties",
            "requires_dates": True,
            "minimum_nights": True,
            "gallery_view": True,
        },
        "status_flow": ["requested", "approved", "paid", "check_in", "active", "check_out", "completed"],
    },
    
    BusinessCategory.PROPERTY_MANAGEMENT.value: {
        "display_name": "Property Management",
        "primary_interaction": InteractionType.LISTING,
        "supported_interactions": [
            InteractionType.LISTING,      # Managed properties
            InteractionType.VIEWING,      # Property tours
            InteractionType.APPLICATION,  # Tenant applications
            InteractionType.SERVICE,      # Maintenance requests
            InteractionType.RENTAL        # Lease management
        ],
        "features": {
            "tenant_portal": True,
            "maintenance_requests": True,
            "rent_collection": True,
            "lease_management": True,
            "property_inspections": True,
            "tenant_screening": True,
            "financial_reporting": True,
        },
        "ui_config": {
            "primary_action": "View Available Properties",
            "secondary_action": "Apply Now",
            "catalog_type": "properties",
            "tenant_login": True,
            "owner_portal": True,
        },
        "status_flow": {
            "rental": ["available", "application_pending", "leased", "move_in", "occupied", "notice_given", "move_out"],
            "maintenance": ["reported", "assigned", "in_progress", "completed", "invoiced"],
        },
    },
    
    # ============ HEALTH & WELLNESS ============
    BusinessCategory.CLINIC.value: {
        "display_name": "Medical Clinic",
        "primary_interaction": InteractionType.BOOKING,
        "supported_interactions": [InteractionType.BOOKING, InteractionType.CONSULTATION],
        "features": {
            "appointment_booking": True,
            "doctor_selection": True,
            "medical_records": True,
            "telemedicine": True,
            "insurance": True,
        },
        "ui_config": {
            "primary_action": "Book Appointment",
            "secondary_action": "Telemedicine Consult",
            "catalog_type": "doctors",
            "time_slots": True,
            "duration_based": True,
        },
        "status_flow": ["requested", "confirmed", "reminded", "checked_in", "in_consultation", "completed"],
    },
    
    BusinessCategory.DENTIST.value: {
        "display_name": "Dental Clinic",
        "primary_interaction": InteractionType.BOOKING,
        "supported_interactions": [InteractionType.BOOKING],
        "features": {
            "appointment_booking": True,
            "procedure_types": True,
            "insurance": True,
            "reminders": True,
        },
        "ui_config": {
            "primary_action": "Book Appointment",
            "catalog_type": "services",
            "time_slots": True,
            "duration_based": True,
        },
        "status_flow": ["scheduled", "confirmed", "reminded", "arrived", "in_treatment", "completed"],
    },
    
    # ============ BEAUTY & PERSONAL CARE ============
    BusinessCategory.SALON.value: {
        "display_name": "Beauty Salon",
        "primary_interaction": InteractionType.BOOKING,
        "supported_interactions": [InteractionType.BOOKING, InteractionType.ORDER],
        "features": {
            "stylist_selection": True,
            "service_menu": True,
            "product_sales": True,
            "loyalty_program": True,
        },
        "ui_config": {
            "primary_action": "Book Appointment",
            "secondary_action": "Shop Products",
            "catalog_type": "services",
            "staff_selection": True,
            "time_slots": True,
        },
        "status_flow": ["booked", "confirmed", "reminded", "arrived", "in_service", "completed"],
    },
    
    BusinessCategory.SPA.value: {
        "display_name": "Spa & Wellness",
        "primary_interaction": InteractionType.BOOKING,
        "supported_interactions": [InteractionType.BOOKING, InteractionType.SUBSCRIPTION],
        "features": {
            "treatment_menu": True,
            "therapist_selection": True,
            "package_deals": True,
            "membership": True,
        },
        "ui_config": {
            "primary_action": "Book Treatment",
            "secondary_action": "Buy Membership",
            "catalog_type": "treatments",
            "duration_based": True,
        },
        "status_flow": ["booked", "confirmed", "arrived", "in_treatment", "completed"],
    },
    
    # ============ FITNESS & SPORTS ============
    BusinessCategory.GYM.value: {
        "display_name": "Gym/Fitness Center",
        "primary_interaction": InteractionType.SUBSCRIPTION,
        "supported_interactions": [InteractionType.SUBSCRIPTION, InteractionType.BOOKING],
        "features": {
            "membership_plans": True,
            "class_booking": True,
            "personal_training": True,
            "equipment_booking": True,
        },
        "ui_config": {
            "primary_action": "Join Now",
            "secondary_action": "Book Class",
            "catalog_type": "memberships",
            "recurring_billing": True,
        },
        "status_flow": ["trial", "active", "paused", "cancelled", "expired"],
    },
    
    BusinessCategory.PERSONAL_TRAINER.value: {
        "display_name": "Personal Trainer",
        "primary_interaction": InteractionType.BOOKING,
        "supported_interactions": [InteractionType.BOOKING, InteractionType.SUBSCRIPTION],
        "features": {
            "session_booking": True,
            "package_deals": True,
            "progress_tracking": True,
            "meal_plans": True,
        },
        "ui_config": {
            "primary_action": "Book Session",
            "secondary_action": "Buy Package",
            "time_slots": True,
            "location_flexible": True,
        },
        "status_flow": ["scheduled", "confirmed", "in_session", "completed"],
    },
    
    # ============ REAL ESTATE & PROPERTY ============
    BusinessCategory.REAL_ESTATE.value: {
        "display_name": "Real Estate Agency",
        "primary_interaction": InteractionType.LISTING,
        "supported_interactions": [
            InteractionType.LISTING,     # Property listings
            InteractionType.VIEWING,     # Schedule viewings
            InteractionType.INQUIRY,     # Property inquiries
            InteractionType.APPLICATION, # Rental applications
            InteractionType.CONSULTATION # Buying/selling consultation
        ],
        "features": {
            "property_listings": True,
            "virtual_tours": True,
            "viewing_scheduler": True,
            "open_house": True,
            "price_negotiation": True,
            "document_management": True,
            "mortgage_calculator": True,
            "neighborhood_info": True,
            "commission_tracking": True,
            "mls_integration": True,
        },
        "ui_config": {
            "primary_action": "View Properties",
            "secondary_action": "Schedule Viewing",
            "catalog_type": "properties",
            "map_view": True,
            "filters": ["price", "bedrooms", "bathrooms", "location", "property_type", "sqft"],
            "gallery_view": True,
            "detail_view": "comprehensive",
            "comparison_tool": True,
        },
        "property_types": [
            "house", "apartment", "condo", "townhouse", "land", 
            "commercial", "industrial", "office", "retail"
        ],
        "listing_types": ["sale", "rent", "lease", "auction"],
        "status_flow": {
            "listing": ["draft", "active", "under_contract", "pending", "sold", "rented", "expired"],
            "viewing": ["requested", "scheduled", "confirmed", "completed", "cancelled", "no_show"],
            "inquiry": ["new", "contacted", "qualified", "showing", "offer", "closed", "lost"],
            "application": ["received", "screening", "approved", "rejected", "withdrawn"],
        },
    },
    
    # ============ PROFESSIONAL SERVICES ============
    BusinessCategory.LAWYER.value: {
        "display_name": "Law Firm",
        "primary_interaction": InteractionType.CONSULTATION,
        "supported_interactions": [InteractionType.CONSULTATION, InteractionType.QUOTE],
        "features": {
            "consultation_booking": True,
            "case_management": True,
            "document_upload": True,
            "retainer_fees": True,
        },
        "ui_config": {
            "primary_action": "Book Consultation",
            "secondary_action": "Request Quote",
            "requires_description": True,
            "confidential": True,
        },
        "status_flow": ["inquiry", "consultation_scheduled", "consulted", "retained", "in_progress", "completed"],
    },
    
    BusinessCategory.ACCOUNTANT.value: {
        "display_name": "Accounting Firm",
        "primary_interaction": InteractionType.SERVICE,
        "supported_interactions": [InteractionType.SERVICE, InteractionType.SUBSCRIPTION],
        "features": {
            "tax_filing": True,
            "bookkeeping": True,
            "payroll": True,
            "monthly_service": True,
        },
        "ui_config": {
            "primary_action": "Get Started",
            "secondary_action": "Subscribe Monthly",
            "catalog_type": "services",
        },
        "status_flow": ["requested", "documents_needed", "in_progress", "review", "completed"],
    },
    
    # ============ HOME SERVICES ============
    BusinessCategory.PLUMBER.value: {
        "display_name": "Plumbing Service",
        "primary_interaction": InteractionType.SERVICE,
        "supported_interactions": [InteractionType.SERVICE, InteractionType.QUOTE],
        "features": {
            "emergency_service": True,
            "scheduled_service": True,
            "quote_system": True,
            "parts_inventory": True,
        },
        "ui_config": {
            "primary_action": "Request Service",
            "secondary_action": "Get Quote",
            "urgency_levels": ["emergency", "urgent", "scheduled"],
            "photo_upload": True,
        },
        "status_flow": ["requested", "assigned", "en_route", "arrived", "in_progress", "completed"],
    },
    
    BusinessCategory.CLEANING.value: {
        "display_name": "Cleaning Service",
        "primary_interaction": InteractionType.SERVICE,
        "supported_interactions": [InteractionType.SERVICE, InteractionType.SUBSCRIPTION],
        "features": {
            "one_time_service": True,
            "recurring_service": True,
            "team_size": True,
            "supplies_included": True,
        },
        "ui_config": {
            "primary_action": "Book Cleaning",
            "secondary_action": "Subscribe Weekly",
            "property_size": True,
            "frequency_options": True,
        },
        "status_flow": ["scheduled", "confirmed", "en_route", "cleaning", "completed"],
    },
    
    # ============ TRANSPORTATION ============
    BusinessCategory.TAXI.value: {
        "display_name": "Taxi Service",
        "primary_interaction": InteractionType.SERVICE,
        "supported_interactions": [InteractionType.SERVICE],
        "features": {
            "instant_booking": True,
            "advance_booking": True,
            "fare_estimate": True,
            "driver_tracking": True,
        },
        "ui_config": {
            "primary_action": "Book Ride",
            "location_picker": True,
            "real_time_tracking": True,
            "fare_calculator": True,
        },
        "status_flow": ["requested", "assigned", "arriving", "picked_up", "in_transit", "dropped_off"],
    },
    
    BusinessCategory.CAR_RENTAL.value: {
        "display_name": "Car Rental",
        "primary_interaction": InteractionType.RENTAL,
        "supported_interactions": [InteractionType.RENTAL],
        "features": {
            "vehicle_selection": True,
            "insurance_options": True,
            "pickup_location": True,
            "mileage_tracking": True,
        },
        "ui_config": {
            "primary_action": "Rent Vehicle",
            "catalog_type": "vehicles",
            "requires_dates": True,
            "requires_license": True,
        },
        "status_flow": ["reserved", "confirmed", "picked_up", "active", "due", "returned"],
    },
    
    BusinessCategory.DELIVERY.value: {
        "display_name": "Delivery Service",
        "primary_interaction": InteractionType.SERVICE,
        "supported_interactions": [InteractionType.SERVICE],
        "features": {
            "package_tracking": True,
            "instant_quote": True,
            "scheduled_pickup": True,
            "proof_of_delivery": True,
        },
        "ui_config": {
            "primary_action": "Send Package",
            "location_picker": True,
            "package_size": True,
            "urgency_levels": True,
        },
        "status_flow": ["booked", "picked_up", "in_transit", "out_for_delivery", "delivered"],
    },
    
    # ============ EDUCATION ============
    BusinessCategory.SCHOOL.value: {
        "display_name": "School/College",
        "primary_interaction": InteractionType.APPLICATION,
        "supported_interactions": [InteractionType.APPLICATION, InteractionType.REGISTRATION],
        "features": {
            "admission_process": True,
            "course_registration": True,
            "fee_payment": True,
            "academic_calendar": True,
        },
        "ui_config": {
            "primary_action": "Apply Now",
            "secondary_action": "Register Courses",
            "document_upload": True,
            "multi_step_form": True,
        },
        "status_flow": ["applied", "under_review", "interview", "accepted", "enrolled"],
    },
    
    BusinessCategory.TUTORING.value: {
        "display_name": "Tutoring Service",
        "primary_interaction": InteractionType.BOOKING,
        "supported_interactions": [InteractionType.BOOKING, InteractionType.SUBSCRIPTION],
        "features": {
            "subject_selection": True,
            "tutor_profiles": True,
            "online_sessions": True,
            "progress_tracking": True,
        },
        "ui_config": {
            "primary_action": "Book Session",
            "secondary_action": "Buy Package",
            "catalog_type": "tutors",
            "level_selection": True,
        },
        "status_flow": ["scheduled", "confirmed", "in_session", "completed"],
    },
    
    # ============ ENTERTAINMENT & EVENTS ============
    BusinessCategory.EVENT_VENUE.value: {
        "display_name": "Event Venue",
        "primary_interaction": InteractionType.BOOKING,
        "supported_interactions": [InteractionType.BOOKING, InteractionType.QUOTE],
        "features": {
            "venue_tours": True,
            "catering_options": True,
            "equipment_rental": True,
            "event_planning": True,
        },
        "ui_config": {
            "primary_action": "Check Availability",
            "secondary_action": "Request Quote",
            "requires_date": True,
            "guest_count": True,
        },
        "status_flow": ["inquiry", "tour_scheduled", "quoted", "booked", "event_day", "completed"],
    },
    
    BusinessCategory.PHOTOGRAPHER.value: {
        "display_name": "Photography Service",
        "primary_interaction": InteractionType.BOOKING,
        "supported_interactions": [InteractionType.BOOKING, InteractionType.QUOTE],
        "features": {
            "portfolio_showcase": True,
            "package_selection": True,
            "location_flexible": True,
            "digital_delivery": True,
        },
        "ui_config": {
            "primary_action": "Book Session",
            "secondary_action": "View Portfolio",
            "event_type": True,
            "duration_based": True,
        },
        "status_flow": ["booked", "confirmed", "shooting", "editing", "delivered"],
    },
    
    # ============ TECHNOLOGY ============
    BusinessCategory.SOFTWARE.value: {
        "display_name": "Software Company",
        "primary_interaction": InteractionType.SUBSCRIPTION,
        "supported_interactions": [InteractionType.SUBSCRIPTION, InteractionType.QUOTE],
        "features": {
            "saas_plans": True,
            "free_trial": True,
            "api_access": True,
            "usage_based": True,
        },
        "ui_config": {
            "primary_action": "Start Free Trial",
            "secondary_action": "Contact Sales",
            "plan_comparison": True,
            "feature_list": True,
        },
        "status_flow": ["trial", "active", "past_due", "cancelled", "expired"],
    },
    
    BusinessCategory.WEB_DESIGN.value: {
        "display_name": "Web Design Agency",
        "primary_interaction": InteractionType.QUOTE,
        "supported_interactions": [InteractionType.QUOTE, InteractionType.SERVICE],
        "features": {
            "portfolio_showcase": True,
            "project_scope": True,
            "milestone_payments": True,
            "revisions": True,
        },
        "ui_config": {
            "primary_action": "Get Quote",
            "secondary_action": "View Portfolio",
            "project_brief": True,
            "budget_range": True,
        },
        "status_flow": ["inquiry", "discovery", "proposal", "approved", "in_progress", "review", "completed"],
    },
    
    # ============ AUTOMOTIVE ============
    BusinessCategory.AUTO_REPAIR.value: {
        "display_name": "Auto Repair Shop",
        "primary_interaction": InteractionType.SERVICE,
        "supported_interactions": [InteractionType.SERVICE, InteractionType.QUOTE],
        "features": {
            "diagnostic_service": True,
            "appointment_booking": True,
            "parts_ordering": True,
            "warranty": True,
        },
        "ui_config": {
            "primary_action": "Book Service",
            "secondary_action": "Get Estimate",
            "vehicle_info": True,
            "issue_description": True,
        },
        "status_flow": ["scheduled", "dropped_off", "diagnosing", "approved", "repairing", "ready", "picked_up"],
    },
    
    # ============ PET SERVICES ============
    BusinessCategory.VETERINARY.value: {
        "display_name": "Veterinary Clinic",
        "primary_interaction": InteractionType.BOOKING,
        "supported_interactions": [InteractionType.BOOKING, InteractionType.ORDER],
        "features": {
            "appointment_booking": True,
            "pet_records": True,
            "prescription_meds": True,
            "emergency_service": True,
        },
        "ui_config": {
            "primary_action": "Book Appointment",
            "secondary_action": "Order Medication",
            "pet_info": True,
            "urgency_levels": True,
        },
        "status_flow": ["scheduled", "checked_in", "examining", "treatment", "completed"],
    },
    
    # ============ EMPLOYMENT ============
    BusinessCategory.EMPLOYER.value: {
        "display_name": "Employer/Company",
        "primary_interaction": InteractionType.APPLICATION,
        "supported_interactions": [InteractionType.APPLICATION],
        "features": {
            "job_postings": True,
            "application_tracking": True,
            "interview_scheduling": True,
            "onboarding": True,
        },
        "ui_config": {
            "primary_action": "View Jobs",
            "secondary_action": "Apply Now",
            "resume_upload": True,
            "cover_letter": True,
        },
        "status_flow": ["applied", "screening", "interview", "assessment", "offer", "hired", "rejected"],
    },
    
    # ============ SHOWROOMS & GALLERIES ============
    BusinessCategory.FURNITURE.value: {
        "display_name": "Furniture Store",
        "primary_interaction": InteractionType.ORDER,
        "supported_interactions": [
            InteractionType.ORDER,
            InteractionType.VIEWING,  # Showroom viewing
            InteractionType.QUOTE,    # Custom furniture quotes
            InteractionType.RENTAL,    # Furniture rental
        ],
        "features": {
            "showroom_display": True,
            "catalog_management": True,
            "custom_orders": True,
            "delivery_service": True,
            "assembly_service": True,
            "financing_options": True,
            "3d_visualization": True,
            "room_planner": True,
        },
        "ui_config": {
            "primary_action": "Shop Now",
            "secondary_action": "Visit Showroom",
            "catalog_type": "furniture",
            "filters": ["category", "material", "color", "price", "dimensions"],
            "ar_preview": True,  # Augmented reality preview
            "room_view": True,
        },
        "status_flow": {
            "order": ["cart", "ordered", "processing", "shipped", "delivered", "assembled"],
            "viewing": ["scheduled", "confirmed", "visited", "follow_up"],
        },
    },
    
    BusinessCategory.SHOWROOM.value: {
        "display_name": "Showroom",
        "primary_interaction": InteractionType.VIEWING,
        "supported_interactions": [
            InteractionType.VIEWING,
            InteractionType.ORDER,
            InteractionType.QUOTE,
            InteractionType.INQUIRY,
        ],
        "features": {
            "appointment_booking": True,
            "private_viewing": True,
            "vip_access": True,
            "catalog_management": True,
            "price_on_request": True,
            "trade_pricing": True,
        },
        "ui_config": {
            "primary_action": "Schedule Viewing",
            "secondary_action": "Browse Collection",
            "catalog_type": "showcase",
            "exclusive_items": True,
            "appointment_required": True,
        },
        "status_flow": {
            "viewing": ["requested", "scheduled", "confirmed", "completed", "follow_up"],
            "order": ["inquiry", "negotiation", "agreed", "processing", "delivered"],
        },
    },
    
    BusinessCategory.ART_GALLERY.value: {
        "display_name": "Art Gallery",
        "primary_interaction": InteractionType.VIEWING,
        "supported_interactions": [
            InteractionType.VIEWING,    # Gallery visits
            InteractionType.ORDER,      # Art purchases
            InteractionType.INQUIRY,    # Art inquiries
            InteractionType.RENTAL,     # Art rental/leasing
            InteractionType.CONSULTATION, # Art advisory
        ],
        "features": {
            "exhibition_management": True,
            "artist_profiles": True,
            "artwork_catalog": True,
            "private_viewing": True,
            "auction_system": True,
            "certificate_authenticity": True,
            "shipping_insurance": True,
            "art_advisory": True,
            "virtual_gallery": True,
        },
        "ui_config": {
            "primary_action": "View Gallery",
            "secondary_action": "Schedule Visit",
            "catalog_type": "artwork",
            "filters": ["artist", "medium", "style", "period", "price", "size"],
            "high_res_images": True,
            "360_view": True,
            "provenance": True,
        },
        "status_flow": {
            "viewing": ["scheduled", "visited", "interested", "considering"],
            "order": ["inquiry", "reserved", "sold", "shipped", "delivered", "installed"],
        },
    },
    
    BusinessCategory.DEALERSHIP.value: {
        "display_name": "Vehicle Dealership",
        "primary_interaction": InteractionType.VIEWING,
        "supported_interactions": [
            InteractionType.VIEWING,    # Test drives
            InteractionType.ORDER,      # Vehicle purchase
            InteractionType.QUOTE,      # Price quotes
            InteractionType.SERVICE,    # Maintenance service
            InteractionType.RENTAL,     # Loaner vehicles
            InteractionType.APPLICATION, # Financing applications
        ],
        "features": {
            "inventory_management": True,
            "test_drive_scheduling": True,
            "financing_calculator": True,
            "trade_in_valuation": True,
            "service_scheduling": True,
            "vehicle_history": True,
            "comparison_tool": True,
            "insurance_quotes": True,
            "extended_warranty": True,
        },
        "ui_config": {
            "primary_action": "View Inventory",
            "secondary_action": "Schedule Test Drive",
            "catalog_type": "vehicles",
            "filters": ["make", "model", "year", "price", "mileage", "color", "fuel_type"],
            "360_exterior": True,
            "interior_tour": True,
            "spec_sheet": True,
        },
        "status_flow": {
            "viewing": ["scheduled", "test_drive", "negotiating", "decided"],
            "order": ["reserved", "financing", "approved", "processing", "ready", "delivered"],
            "service": ["scheduled", "checked_in", "servicing", "completed", "picked_up"],
        },
    },
    
    BusinessCategory.PROPERTY_MANAGEMENT.value: {
        "display_name": "Property Management",
        "primary_interaction": InteractionType.APPLICATION,
        "supported_interactions": [
            InteractionType.APPLICATION, # Rental applications
            InteractionType.VIEWING,     # Property tours
            InteractionType.SERVICE,     # Maintenance requests
            InteractionType.SUBSCRIPTION, # Rent payments
            InteractionType.INQUIRY,     # General inquiries
        ],
        "features": {
            "tenant_portal": True,
            "maintenance_requests": True,
            "rent_collection": True,
            "lease_management": True,
            "property_listings": True,
            "inspection_scheduling": True,
            "document_storage": True,
            "payment_history": True,
            "utility_management": True,
        },
        "ui_config": {
            "primary_action": "View Properties",
            "secondary_action": "Apply Now",
            "catalog_type": "rentals",
            "filters": ["price", "bedrooms", "location", "amenities", "pet_friendly"],
            "tenant_portal": True,
            "online_applications": True,
        },
        "status_flow": {
            "application": ["submitted", "screening", "approved", "lease_signed", "move_in"],
            "viewing": ["scheduled", "toured", "interested", "applied"],
            "service": ["submitted", "assigned", "in_progress", "resolved"],
        },
    },
    
    # ============ OTHER ============
    BusinessCategory.OTHER.value: {
        "display_name": "Other Business",
        "primary_interaction": InteractionType.ORDER,
        "supported_interactions": [InteractionType.ORDER, InteractionType.BOOKING, InteractionType.SERVICE],
        "features": {
            "custom_configuration": True,
        },
        "ui_config": {
            "primary_action": "Contact Us",
            "customizable": True,
        },
        "status_flow": ["pending", "confirmed", "in_progress", "completed"],
    },
}


def get_business_config(business_type: str) -> Dict[str, Any]:
    """Get configuration for a business type"""
    return BUSINESS_TYPE_CONFIG.get(
        business_type, 
        BUSINESS_TYPE_CONFIG[BusinessCategory.OTHER.value]
    )


def get_interaction_fields(interaction_type: InteractionType) -> List[str]:
    """Get required fields for an interaction type"""
    fields_map = {
        InteractionType.ORDER: [
            "items", "quantity", "delivery_method", "delivery_address", "payment_method"
        ],
        InteractionType.BOOKING: [
            "service_id", "date", "time", "duration", "staff_id", "notes"
        ],
        InteractionType.RENTAL: [
            "item_id", "start_date", "end_date", "pickup_location", "return_location"
        ],
        InteractionType.SERVICE: [
            "service_type", "location", "scheduled_time", "urgency", "description"
        ],
        InteractionType.QUOTE: [
            "service_description", "budget_range", "timeline", "requirements"
        ],
        InteractionType.SUBSCRIPTION: [
            "plan_id", "billing_cycle", "start_date", "payment_method"
        ],
        InteractionType.APPLICATION: [
            "position_id", "resume", "cover_letter", "references"
        ],
        InteractionType.REGISTRATION: [
            "event_id", "attendee_count", "dietary_requirements", "special_needs"
        ],
        InteractionType.CONSULTATION: [
            "topic", "preferred_date", "duration", "consultation_type"
        ],
    }
    return fields_map.get(interaction_type, [])


def get_status_transitions(interaction_type: InteractionType) -> Dict[str, List[str]]:
    """Get valid status transitions for an interaction type"""
    transitions = {
        InteractionType.ORDER: {
            "pending": ["confirmed", "cancelled"],
            "confirmed": ["preparing", "cancelled"],
            "preparing": ["ready"],
            "ready": ["delivered", "picked_up"],
            "delivered": ["completed"],
            "picked_up": ["completed"],
            "cancelled": [],
            "completed": [],
        },
        InteractionType.BOOKING: {
            "requested": ["confirmed", "rejected"],
            "confirmed": ["reminded", "cancelled"],
            "reminded": ["checked_in", "no_show"],
            "checked_in": ["in_progress"],
            "in_progress": ["completed"],
            "cancelled": [],
            "no_show": [],
            "completed": [],
        },
        # Add more as needed...
    }
    return transitions.get(interaction_type, {})


def validate_business_type(business_type: str) -> bool:
    """Validate if a business type exists"""
    return business_type in BUSINESS_TYPE_CONFIG


def get_ui_component(business_type: str, interaction_type: InteractionType) -> str:
    """Get the UI component to use for a business type and interaction"""
    component_map = {
        (InteractionType.ORDER, "products"): "ProductCatalog",
        (InteractionType.ORDER, "menu"): "MenuCatalog",
        (InteractionType.BOOKING, "services"): "ServiceBooking",
        (InteractionType.BOOKING, "rooms"): "RoomBooking",
        (InteractionType.RENTAL, "vehicles"): "VehicleRental",
        (InteractionType.SERVICE, None): "ServiceRequest",
        (InteractionType.QUOTE, None): "QuoteRequest",
        (InteractionType.SUBSCRIPTION, None): "SubscriptionPlans",
        (InteractionType.APPLICATION, None): "ApplicationForm",
        (InteractionType.REGISTRATION, None): "EventRegistration",
        (InteractionType.CONSULTATION, None): "ConsultationBooking",
    }
    
    config = get_business_config(business_type)
    catalog_type = config.get("ui_config", {}).get("catalog_type")
    
    return component_map.get((interaction_type, catalog_type)) or "GenericInteraction"