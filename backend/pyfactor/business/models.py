from django.db import models
from django.conf import settings
from django.utils import timezone
from hr.models import Employee

import uuid
from django_countries.fields import CountryField

BUSINESS_TYPES = [
    ('ACCOUNTING_BOOKKEEPING', 'Accounting and Bookkeeping'),
    ('ADMIN_OFFICE_SERVICES', 'Administration and Office Services'),
    ('ADVENTURE_TOURISM', 'Adventure Tourism and Tour Guides'),
    ('ADVERTISING_MARKETING', 'Advertising and Marketing'),
    ('AGRIBUSINESS_CONSULTING', 'Agribusiness and Agricultural Consulting'),
    ('AGRICULTURAL_MACHINERY', 'Agricultural Machinery'),
    ('AGRICULTURE_FARMING', 'Agriculture and Farming'),
    ('HVAC_SERVICES', 'Air Conditioning and HVAC Services'),
    ('AI_ML_DATA_SCIENCE', 'AI, Machine Learning, and Data Science Services'),
    ('ANIMAL_PET_SERVICES', 'Animal and Pet Services'),
    ('APPAREL_CLOTHING', 'Apparel and Clothing'),
    ('ARCHITECTURE_DESIGN', 'Architecture and Design'),
    ('ARTS_CRAFTS', 'Arts and Crafts'),
    ('AUTOMOTIVE_LEASING_REPAIR', 'Automotive, Leasing, and Repair'),
    ('CHILDCARE_SERVICES', 'Babysitting and Childcare Services'),
    ('BANKING_FINANCE', 'Banking and Finance'),
    ('BEAUTY_SERVICES', 'Barbershops, Hair Salons, and Beauty Services'),
    ('FOOD_BEVERAGE_SERVICES', 'Beverage and Food Services'),
    ('BIOTECH_PHARMA', 'Biotechnology and Pharmaceuticals'),
    ('BLOCKCHAIN_CRYPTO', 'Blockchain, Cryptocurrencies, and Exchanges'),
    ('MEDIA_STREAMING', 'Broadcasting, Media, and Video Streaming'),
    ('BUSINESS_CONSULTING', 'Business Consulting and Advisory Services'),
    ('CATERING_FOOD_TRUCKS', 'Catering and Food Trucks'),
    ('CLEANING_SERVICES', 'Cleaning Services'),
    ('CLOUD_IT_SERVICES', 'Cloud Computing and IT Services'),
    ('CONSTRUCTION_CONTRACTING', 'Construction and Contracting'),
    ('CRAFT_BEVERAGES', 'Craft Beverages (Breweries, Distilleries)'),
    ('CREATIVE_SERVICES', 'Creative Services (Design, Graphic Design)'),
    ('CULTURAL_HERITAGE', 'Cultural Heritage and Preservation'),
    ('CYBERSECURITY', 'Cybersecurity and Risk Management'),
    ('DATA_ANALYSIS_BI', 'Data Analysis and Business Intelligence'),
    ('DAIRY_LIVESTOCK', 'Dairy and Livestock Farming'),
    ('DIGITAL_MARKETING', 'Digital Marketing and Online Services'),
    ('DJ_ENTERTAINMENT', 'DJ, Music, and Entertainment Services'),
    ('LOGISTICS', 'Distribution, Freight Forwarding, and Logistics'),
    ('DRONE_SERVICES', 'Drone and Aerial Services'),
    ('ECOMMERCE_RETAIL', 'E-commerce and Retail'),
    ('EDUCATION_TUTORING', 'Education and Tutoring'),
    ('ELECTRONICS_IT', 'Electronics and IT Equipment'),
    ('ENERGY_SUSTAINABILITY', 'Energy Auditing and Sustainability Consulting'),
    ('ENGINEERING_SERVICES', 'Engineering and Technical Services'),
    ('EVENT_PLANNING', 'Event Planning, Rentals, and Technology'),
    ('EXPORT_IMPORT', 'Export and Import Trade'),
    ('FASHION_APPAREL', 'Fashion and Apparel'),
    ('FILM_TV_PRODUCTION', 'Film, Television, and Media Production'),
    ('FINANCIAL_PLANNING', 'Financial Planning and Investment Services'),
    ('FISHING_AQUACULTURE', 'Fishing and Aquaculture'),
    ('FITNESS_TRAINING', 'Fitness and Personal Training'),
    ('FLORISTRY_GARDENING', 'Floristry and Gardening'),
    ('FORESTRY', 'Forestry and Natural Resource Management'),
    ('FRANCHISING_LICENSING', 'Franchising and Licensing'),
    ('FREELANCE_GIG_ECONOMY', 'Freelance Platforms and Gig Economy'),
    ('FUNDRAISING_NONPROFIT', 'Fundraising and Non-Profit Services'),
    ('FURNITURE_HOME_DECOR', 'Furniture and Home Decor'),
    ('GREEN_BUILDING', 'Green Building, Renewable Energy, and Solar'),
    ('HEALTHCARE_MEDICAL', 'Healthcare and Medical Services'),
    ('HOME_IMPROVEMENT', 'Home Improvement and Renovation'),
    ('HOSPITALITY', 'Hospitality, Hotels, and Vacation Rentals'),
    ('HR_RECRUITMENT', 'Human Resources and Recruitment'),
    ('RENEWABLE_ENERGY', 'Hydroelectric and Wind Energy'),
    ('INDUSTRIAL_MANUFACTURING', 'Industrial Services and Manufacturing'),
    ('INSURANCE_RISK', 'Insurance and Risk Management'),
    ('INTERIOR_DESIGN', 'Interior Design and Architecture'),
    ('INTERNATIONAL_TRADE', 'International Trade and Export'),
    ('IT_CONSULTING', 'IT Consulting and Services'),
    ('JEWELRY_WATCHMAKING', 'Jewelry and Watchmaking'),
    ('JOURNALISM_REPORTING', 'Journalism and Reporting'),
    ('LANDSCAPING', 'Landscaping and Lawn Care'),
    ('LEGAL_SERVICES', 'Law and Legal Services'),
    ('LEISURE_SPORTS', 'Leisure, Recreation, and Sports'),
    ('SUPPLY_CHAIN', 'Logistics and Supply Chain Management'),
    ('MANUFACTURING_PRODUCTION', 'Manufacturing and Production'),
    ('MEDIA_ENTERTAINMENT', 'Media and Entertainment'),
    ('MEDICAL_EQUIPMENT', 'Medical Equipment and Devices'),
    ('MICROFINANCE', 'Microfinance and Small Business Lending'),
    ('MINING_EXTRACTION', 'Mining and Resource Extraction'),
    ('MOBILE_TELECOM', 'Mobile Services and Telecommunications'),
    ('MUSIC_PRODUCTION', 'Music Production and DJ Services'),
    ('NATURAL_RESOURCES', 'Natural Resource Extraction and Mining'),
    ('NONPROFIT_CHARITY', 'Non-Profit and Charitable Organizations'),
    ('OIL_GAS', 'Oil, Gas, and Petroleum Refining'),
    ('ON_DEMAND_SERVICES', 'On-Demand and Gig Economy (Uber, Lyft)'),
    ('PACKAGING_DISTRIBUTION', 'Packaging and Distribution Services'),
    ('PERSONAL_SERVICES', 'Personal Services (Babysitting, Caregiving)'),
    ('ENERGY_SERVICES', 'Petroleum, Gas, and Energy Services'),
    ('PHOTOGRAPHY_VIDEOGRAPHY', 'Photography and Videography'),
    ('PRINTING_PUBLISHING', 'Printing, Publishing, and Copy Services'),
    ('SECURITY_SERVICES', 'Private Investigation and Security Services'),
    ('PROPERTY_DEVELOPMENT', 'Property Development and Management'),
    ('PR_COMMUNICATIONS', 'Public Relations and Communications'),
    ('PUBLIC_SECTOR', 'Public Sector and Government Services'),
    ('PUBLIC_TRANSPORTATION', 'Public Transportation and Taxi Services'),
    ('REAL_ESTATE', 'Real Estate and Property Management'),
    ('RENEWABLE_TECH', 'Renewable Energy and Green Tech'),
    ('RESEARCH_DEVELOPMENT', 'Research and Development (R&D)'),
    ('RESTAURANTS_CAFES', 'Restaurants, Cafes, and Food Services'),
    ('RETAIL_CONSUMER_GOODS', 'Retail and Consumer Goods'),
    ('SECURITY_ALARM', 'Security and Alarm Services'),
    ('SHIPPING_MARITIME', 'Shipping, Maritime, and Port Services'),
    ('SOFTWARE_DEVELOPMENT', 'Software Development and IT Services'),
    ('SOLAR_ENERGY', 'Solar Energy and Installation'),
    ('SPORTS_COACHING', 'Sports Coaching and Training'),
    ('STREET_VENDORS', 'Street Vendors and Micro-Enterprises'),
    ('SUSTAINABILITY_CONSULTING', 'Sustainability Consulting and Green Energy'),
    ('TELECOMMUNICATIONS', 'Telecommunications and Mobile Services'),
    ('TEXTILE_MANUFACTURING', 'Textile Manufacturing and Apparel'),
    ('TOURISM_TRAVEL', 'Tourism, Travel Agencies, and Adventure Travel'),
    ('TRANSPORTATION_FREIGHT', 'Transportation, Trucking, and Freight'),
    ('UTILITIES', 'Utilities and Public Services'),
    ('VEHICLE_RENTAL', 'Vehicle Rental and Leasing'),
    ('VETERINARY_SERVICES', 'Veterinary and Pet Services'),
    ('VIRTUAL_ASSISTANT', 'Virtual Assistant and Administrative Services'),
    ('WASTE_MANAGEMENT', 'Waste Management and Recycling'),
    ('WEB_DEVELOPMENT', 'Web Development and Design Services'),
    ('WELLNESS_SPA', 'Wellness and Spa Services'),
    ('WHOLESALE_DISTRIBUTION', 'Wholesale and Distribution'),
    ('WRITING_EDITING', 'Writing, Editing, and Content Creation'),
    ('YOUTH_SERVICES', 'Youth Services and Education'),
    ('ZOOLOGICAL_SERVICES', 'Zoological Services, Botanical Gardens, and Consultancy'),
]

class Business(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_businesses', null=True)
    business_num = models.CharField(max_length=6, unique=True, editable=False)
    business_name = models.CharField(max_length=200)
    business_type = models.CharField(max_length=50, choices=BUSINESS_TYPES)
    street = models.CharField(max_length=200, blank=True)
    city = models.CharField(max_length=200, blank=True)
    state = models.CharField(max_length=200, blank=True)
    postcode = models.CharField(max_length=20, blank=True)
    country = CountryField(default='US')
    address = models.TextField()  # Add this field
    email = models.EmailField()  # Add this field
    phone_number = models.CharField(max_length=20, blank=True)
    database_name = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True)
    members = models.ManyToManyField(settings.AUTH_USER_MODEL, through='BusinessMember', related_name='businesses')
    
    legal_structure = models.CharField(
        max_length=50,
        choices=[
            ('SOLE_PROPRIETORSHIP', 'Sole Proprietorship'),
            ('GENERAL_PARTNERSHIP', 'General Partnership (GP)'),
            ('LIMITED_PARTNERSHIP', 'Limited Partnership (LP)'),
            ('LLC', 'Limited Liability Company (LLC)'),
            ('CORPORATION', 'Corporation (Inc., Corp.)'),
            ('NON_PROFIT', 'Non-Profit Organization (NPO)'),
            ('JOINT_VENTURE', 'Joint Venture (JV)'),
            ('HOLDING_COMPANY', 'Holding Company'),
            ('BRANCH_OFFICE', 'Branch Office'),
            ('REPRESENTATIVE_OFFICE', 'Representative Office'),
        ],
        default='SOLE_PROPRIETORSHIP'
    )
    
    date_founded = models.DateField(
        null=True,
        blank=True,
        help_text="The date when the business was founded"
    )

    def save(self, *args, **kwargs):
        if not self.owner_id and hasattr(self, '_owner_id'):
            self.owner_id = self._owner_id
        super().save(*args, **kwargs)


    def __str__(self):
        return self.business_name if self.business_name else f"Business {self.pk if self.pk else 'unsaved'}"


class Subscription(models.Model):

    SUBSCRIPTION_TYPES = (
        ('free', 'Free Plan'),
        ('professional', 'Professional Plan'),

    )
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='subscriptions')
    subscription_type = models.CharField(max_length=20, choices=SUBSCRIPTION_TYPES)
    start_date = models.DateField()
    is_active = models.BooleanField(default=True)
    end_date = models.DateField(null=True, blank=True)
    billing_cycle = models.CharField(max_length=20, choices=[('monthly', 'Monthly'), ('annual', 'Annual')], default='Monthly')


    def __str__(self):
        return f"Subscription {self.pk if self.pk else 'unsaved'}"

class Billing(models.Model):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='billings')
    subscription = models.ForeignKey(Subscription, on_delete=models.SET_NULL, null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField(default=timezone.now)
    is_paid = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.business.business_name} - {self.amount} - {self.date}"
    
class BusinessMember(models.Model):
    ROLE_CHOICES = [
        ('OWNER', 'Business Owner'),
        ('ADMIN', 'Administrator'),
        ('EMPLOYEE', 'Employee'),
        ('ACCOUNTANT', 'Accountant'),
        ('HR_ADMIN', 'HR Administrator'),
        ('MANAGER', 'Manager'),
        ('VIEWER', 'Viewer'),
        # Add more roles as needed
    ]

    business = models.ForeignKey('Business', on_delete=models.CASCADE, related_name='business_memberships')    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='business_memberships')
    employee = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True, related_name='business_memberships')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('business', 'user')

    def __str__(self):
        return f"{self.user.email} - {self.business.business_name} - {self.get_role_display()}"