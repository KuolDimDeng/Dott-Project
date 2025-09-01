#!/usr/bin/env python3
"""
Business Population Strategy for African Marketplace
Populate 100 Kenyan businesses and 50 South Sudanese businesses as placeholders

Usage:
    python manage.py shell
    exec(open('scripts/populate_african_businesses.py').read())
"""

import os
import sys
import django
from decimal import Decimal
import random

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from business.models import PlaceholderBusiness

# Business categories for Africa
BUSINESS_CATEGORIES = [
    'Food & Dining', 'Retail & Shopping', 'Health & Medical', 'Transport & Logistics',
    'Beauty & Personal Care', 'Construction & Hardware', 'Technology & Electronics',
    'Education & Training', 'Financial Services', 'Agriculture & Farming',
    'Automotive Services', 'Entertainment', 'Real Estate', 'Professional Services',
    'Hospitality & Tourism', 'Fashion & Clothing', 'Home & Garden', 'Sports & Fitness',
    'Photography & Events', 'Legal Services'
]

# Kenyan business data (100 businesses across different cities)
KENYAN_BUSINESSES = [
    # Nairobi (40 businesses)
    {'name': 'Mama Lucy Restaurant', 'phone': '+254701234567', 'city': 'Nairobi', 'category': 'Food & Dining', 'address': 'Kenyatta Avenue, Nairobi CBD'},
    {'name': 'Nyama Choma Palace', 'phone': '+254702345678', 'city': 'Nairobi', 'category': 'Food & Dining', 'address': 'Westlands, Nairobi'},
    {'name': 'Kibanda Electronics', 'phone': '+254703456789', 'city': 'Nairobi', 'category': 'Technology & Electronics', 'address': 'River Road, Nairobi'},
    {'name': 'Shujaa Hardware Store', 'phone': '+254704567890', 'city': 'Nairobi', 'category': 'Construction & Hardware', 'address': 'Industrial Area, Nairobi'},
    {'name': 'Nakumatt Mini Supermarket', 'phone': '+254705678901', 'city': 'Nairobi', 'category': 'Retail & Shopping', 'address': 'Umoja Estate, Nairobi'},
    {'name': 'Afya Medical Clinic', 'phone': '+254706789012', 'city': 'Nairobi', 'category': 'Health & Medical', 'address': 'Kasarani, Nairobi'},
    {'name': 'Safari Transport Services', 'phone': '+254707890123', 'city': 'Nairobi', 'category': 'Transport & Logistics', 'address': 'Eastleigh, Nairobi'},
    {'name': 'Uzuri Beauty Salon', 'phone': '+254708901234', 'city': 'Nairobi', 'category': 'Beauty & Personal Care', 'address': 'Karen, Nairobi'},
    {'name': 'Kilele Bakery', 'phone': '+254709012345', 'city': 'Nairobi', 'category': 'Food & Dining', 'address': 'Kilimani, Nairobi'},
    {'name': 'Mboga Fresh Market', 'phone': '+254710123456', 'city': 'Nairobi', 'category': 'Agriculture & Farming', 'address': 'Kawangware, Nairobi'},
    {'name': 'Poa Internet Cafe', 'phone': '+254711234567', 'city': 'Nairobi', 'category': 'Technology & Electronics', 'address': 'CBD, Nairobi'},
    {'name': 'Matatu Wash Services', 'phone': '+254712345678', 'city': 'Nairobi', 'category': 'Automotive Services', 'address': 'Githurai, Nairobi'},
    {'name': 'Shule Academy', 'phone': '+254713456789', 'city': 'Nairobi', 'category': 'Education & Training', 'address': 'Roysambu, Nairobi'},
    {'name': 'Harambee Financial Services', 'phone': '+254714567890', 'city': 'Nairobi', 'category': 'Financial Services', 'address': 'Downtown, Nairobi'},
    {'name': 'Simba Gym', 'phone': '+254715678901', 'city': 'Nairobi', 'category': 'Sports & Fitness', 'address': 'Westlands, Nairobi'},
    {'name': 'Afrika Photos Studio', 'phone': '+254716789012', 'city': 'Nairobi', 'category': 'Photography & Events', 'address': 'South B, Nairobi'},
    {'name': 'Zawadi Fashion House', 'phone': '+254717890123', 'city': 'Nairobi', 'category': 'Fashion & Clothing', 'address': 'Ngong Road, Nairobi'},
    {'name': 'Mjengo Construction', 'phone': '+254718901234', 'city': 'Nairobi', 'category': 'Construction & Hardware', 'address': 'Pipeline, Nairobi'},
    {'name': 'Duka la Mitumba', 'phone': '+254719012345', 'city': 'Nairobi', 'category': 'Fashion & Clothing', 'address': 'Gikomba Market, Nairobi'},
    {'name': 'Mama Ngina Catering', 'phone': '+254720123456', 'city': 'Nairobi', 'category': 'Food & Dining', 'address': 'Buruburu, Nairobi'},
    {'name': 'Jibu Water Services', 'phone': '+254721234567', 'city': 'Nairobi', 'category': 'Retail & Shopping', 'address': 'Kayole, Nairobi'},
    {'name': 'Bandari Transport Co', 'phone': '+254722345678', 'city': 'Nairobi', 'category': 'Transport & Logistics', 'address': 'Haile Selassie Ave, Nairobi'},
    {'name': 'Nyota Entertainment', 'phone': '+254723456789', 'city': 'Nairobi', 'category': 'Entertainment', 'address': 'Lavington, Nairobi'},
    {'name': 'Hospitali ya Kijiji', 'phone': '+254724567890', 'city': 'Nairobi', 'category': 'Health & Medical', 'address': 'Mathare, Nairobi'},
    {'name': 'Biashara Real Estate', 'phone': '+254725678901', 'city': 'Nairobi', 'category': 'Real Estate', 'address': 'Upperhill, Nairobi'},
    {'name': 'Wakili Legal Services', 'phone': '+254726789012', 'city': 'Nairobi', 'category': 'Legal Services', 'address': 'Law Courts, Nairobi'},
    {'name': 'Bustani Garden Center', 'phone': '+254727890123', 'city': 'Nairobi', 'category': 'Home & Garden', 'address': 'Langata, Nairobi'},
    {'name': 'Mtoto Daycare Center', 'phone': '+254728901234', 'city': 'Nairobi', 'category': 'Education & Training', 'address': 'Donholm, Nairobi'},
    {'name': 'Kuku Chicken Farm', 'phone': '+254729012345', 'city': 'Nairobi', 'category': 'Agriculture & Farming', 'address': 'Ruiru, Nairobi'},
    {'name': 'Nyota Hotel & Lodge', 'phone': '+254730123456', 'city': 'Nairobi', 'category': 'Hospitality & Tourism', 'address': 'Milimani, Nairobi'},
    {'name': 'Ndoto Mobile Repair', 'phone': '+254731234567', 'city': 'Nairobi', 'category': 'Technology & Electronics', 'address': 'Tom Mboya Street, Nairobi'},
    {'name': 'Mama Pima Tailoring', 'phone': '+254732345678', 'city': 'Nairobi', 'category': 'Fashion & Clothing', 'address': 'Kariobangi, Nairobi'},
    {'name': 'Boda Boda Repair Shop', 'phone': '+254733456789', 'city': 'Nairobi', 'category': 'Automotive Services', 'address': 'Kibera, Nairobi'},
    {'name': 'Mchele Store', 'phone': '+254734567890', 'city': 'Nairobi', 'category': 'Retail & Shopping', 'address': 'Majengo, Nairobi'},
    {'name': 'Daktari Mfupi Clinic', 'phone': '+254735678901', 'city': 'Nairobi', 'category': 'Health & Medical', 'address': 'Huruma, Nairobi'},
    {'name': 'Jengo la Michezo', 'phone': '+254736789012', 'city': 'Nairobi', 'category': 'Sports & Fitness', 'address': 'Pangani, Nairobi'},
    {'name': 'Safari Tours Kenya', 'phone': '+254737890123', 'city': 'Nairobi', 'category': 'Hospitality & Tourism', 'address': 'Yaya Center, Nairobi'},
    {'name': 'Chapati Corner', 'phone': '+254738901234', 'city': 'Nairobi', 'category': 'Food & Dining', 'address': 'Zimmerman, Nairobi'},
    {'name': 'Uwazi Computer Training', 'phone': '+254739012345', 'city': 'Nairobi', 'category': 'Education & Training', 'address': 'Thika Road, Nairobi'},
    {'name': 'Mwanga Electrical Shop', 'phone': '+254740123456', 'city': 'Nairobi', 'category': 'Technology & Electronics', 'address': 'Muthurwa Market, Nairobi'},
    
    # Mombasa (20 businesses)
    {'name': 'Pwani Seafood Restaurant', 'phone': '+254741234567', 'city': 'Mombasa', 'category': 'Food & Dining', 'address': 'Old Town, Mombasa'},
    {'name': 'Bahari Beach Resort', 'phone': '+254742345678', 'city': 'Mombasa', 'category': 'Hospitality & Tourism', 'address': 'North Coast, Mombasa'},
    {'name': 'Mombasa Port Services', 'phone': '+254743456789', 'city': 'Mombasa', 'category': 'Transport & Logistics', 'address': 'Kilindini, Mombasa'},
    {'name': 'Coconut Electronics', 'phone': '+254744567890', 'city': 'Mombasa', 'category': 'Technology & Electronics', 'address': 'Nyali, Mombasa'},
    {'name': 'Swahili Cultural Center', 'phone': '+254745678901', 'city': 'Mombasa', 'category': 'Entertainment', 'address': 'Fort Jesus Area, Mombasa'},
    {'name': 'Diani Safari Tours', 'phone': '+254746789012', 'city': 'Mombasa', 'category': 'Hospitality & Tourism', 'address': 'Diani Beach, Mombasa'},
    {'name': 'Makuti Hardware', 'phone': '+254747890123', 'city': 'Mombasa', 'category': 'Construction & Hardware', 'address': 'Tudor, Mombasa'},
    {'name': 'Pwani Medical Clinic', 'phone': '+254748901234', 'city': 'Mombasa', 'category': 'Health & Medical', 'address': 'Bamburi, Mombasa'},
    {'name': 'Spice Market Duka', 'phone': '+254749012345', 'city': 'Mombasa', 'category': 'Retail & Shopping', 'address': 'Majengo, Mombasa'},
    {'name': 'Ocean View Restaurant', 'phone': '+254750123456', 'city': 'Mombasa', 'category': 'Food & Dining', 'address': 'Likoni, Mombasa'},
    {'name': 'Tanga Transport', 'phone': '+254751234567', 'city': 'Mombasa', 'category': 'Transport & Logistics', 'address': 'Changamwe, Mombasa'},
    {'name': 'Karibu Beauty Salon', 'phone': '+254752345678', 'city': 'Mombasa', 'category': 'Beauty & Personal Care', 'address': 'Msambweni, Mombasa'},
    {'name': 'Kilifi Coconut Farm', 'phone': '+254753456789', 'city': 'Mombasa', 'category': 'Agriculture & Farming', 'address': 'Kilifi, Mombasa'},
    {'name': 'Amani Financial Services', 'phone': '+254754567890', 'city': 'Mombasa', 'category': 'Financial Services', 'address': 'Mombasa Island, Mombasa'},
    {'name': 'Mikono Crafts Shop', 'phone': '+254755678901', 'city': 'Mombasa', 'category': 'Fashion & Clothing', 'address': 'Akamba Handicrafts, Mombasa'},
    {'name': 'Makuti Thatching Services', 'phone': '+254756789012', 'city': 'Mombasa', 'category': 'Construction & Hardware', 'address': 'Malindi Road, Mombasa'},
    {'name': 'Jahazi Water Sports', 'phone': '+254757890123', 'city': 'Mombasa', 'category': 'Sports & Fitness', 'address': 'Watamu, Mombasa'},
    {'name': 'Pwani Auto Repair', 'phone': '+254758901234', 'city': 'Mombasa', 'category': 'Automotive Services', 'address': 'Mikindani, Mombasa'},
    {'name': 'Taarab Music Studio', 'phone': '+254759012345', 'city': 'Mombasa', 'category': 'Entertainment', 'address': 'Ganjoni, Mombasa'},
    {'name': 'Coconut Grove Hotel', 'phone': '+254760123456', 'city': 'Mombasa', 'category': 'Hospitality & Tourism', 'address': 'Shanzu, Mombasa'},
    
    # Kisumu (15 businesses)
    {'name': 'Victoria Fish Market', 'phone': '+254761234567', 'city': 'Kisumu', 'category': 'Food & Dining', 'address': 'Dunga Beach, Kisumu'},
    {'name': 'Nyanza Transport Hub', 'phone': '+254762345678', 'city': 'Kisumu', 'category': 'Transport & Logistics', 'address': 'Kisumu Bus Park, Kisumu'},
    {'name': 'Lakeside Medical Center', 'phone': '+254763456789', 'city': 'Kisumu', 'category': 'Health & Medical', 'address': 'Milimani, Kisumu'},
    {'name': 'Soko Mjinga Market', 'phone': '+254764567890', 'city': 'Kisumu', 'category': 'Retail & Shopping', 'address': 'Kibuye Market, Kisumu'},
    {'name': 'Ondiek Electronics', 'phone': '+254765678901', 'city': 'Kisumu', 'category': 'Technology & Electronics', 'address': 'Oginga Odinga Street, Kisumu'},
    {'name': 'Jaramogi Education Center', 'phone': '+254766789012', 'city': 'Kisumu', 'category': 'Education & Training', 'address': 'Kondele, Kisumu'},
    {'name': 'Asembo Construction', 'phone': '+254767890123', 'city': 'Kisumu', 'category': 'Construction & Hardware', 'address': 'Tom Mboya Estate, Kisumu'},
    {'name': 'Raha Beauty Parlour', 'phone': '+254768901234', 'city': 'Kisumu', 'category': 'Beauty & Personal Care', 'address': 'Nyalenda, Kisumu'},
    {'name': 'Fish Inn Restaurant', 'phone': '+254769012345', 'city': 'Kisumu', 'category': 'Food & Dining', 'address': 'Mamboleo, Kisumu'},
    {'name': 'Sugar Belt Farm Supply', 'phone': '+254770123456', 'city': 'Kisumu', 'category': 'Agriculture & Farming', 'address': 'Chemelil, Kisumu'},
    {'name': 'Hippo Tours Kisumu', 'phone': '+254771234567', 'city': 'Kisumu', 'category': 'Hospitality & Tourism', 'address': 'Impala Sanctuary, Kisumu'},
    {'name': 'Lwanda Auto Spares', 'phone': '+254772345678', 'city': 'Kisumu', 'category': 'Automotive Services', 'address': 'Oile Market, Kisumu'},
    {'name': 'Benga Music Studio', 'phone': '+254773456789', 'city': 'Kisumu', 'category': 'Entertainment', 'address': 'Poly View, Kisumu'},
    {'name': 'Kakamega Gold Mining', 'phone': '+254774567890', 'city': 'Kisumu', 'category': 'Professional Services', 'address': 'Kisumu Industrial Area, Kisumu'},
    {'name': 'Jamhuri Sports Complex', 'phone': '+254775678901', 'city': 'Kisumu', 'category': 'Sports & Fitness', 'address': 'Jomo Kenyatta Highway, Kisumu'},
    
    # Nakuru (15 businesses)
    {'name': 'Flamingo Restaurant', 'phone': '+254776789012', 'city': 'Nakuru', 'category': 'Food & Dining', 'address': 'Lake Nakuru Area, Nakuru'},
    {'name': 'Rift Valley Transport', 'phone': '+254777890123', 'city': 'Nakuru', 'category': 'Transport & Logistics', 'address': 'Nakuru Town, Nakuru'},
    {'name': 'Menengai Hardware', 'phone': '+254778901234', 'city': 'Nakuru', 'category': 'Construction & Hardware', 'address': 'Free Area, Nakuru'},
    {'name': 'Rhino Medical Services', 'phone': '+254779012345', 'city': 'Nakuru', 'category': 'Health & Medical', 'address': 'Section 58, Nakuru'},
    {'name': 'Maasai Craft Shop', 'phone': '+254780123456', 'city': 'Nakuru', 'category': 'Fashion & Clothing', 'address': 'Nakuru Municipality, Nakuru'},
    {'name': 'Highland Electronics', 'phone': '+254781234567', 'city': 'Nakuru', 'category': 'Technology & Electronics', 'address': 'Kenyatta Avenue, Nakuru'},
    {'name': 'Wheat Field Bakery', 'phone': '+254782345678', 'city': 'Nakuru', 'category': 'Food & Dining', 'address': 'Lanet, Nakuru'},
    {'name': 'Pyrethrum Farmers Coop', 'phone': '+254783456789', 'city': 'Nakuru', 'category': 'Agriculture & Farming', 'address': 'Molo, Nakuru'},
    {'name': 'Crater Lake Tours', 'phone': '+254784567890', 'city': 'Nakuru', 'category': 'Hospitality & Tourism', 'address': 'Hell\'s Gate Area, Nakuru'},
    {'name': 'Karibu Beauty Studio', 'phone': '+254785678901', 'city': 'Nakuru', 'category': 'Beauty & Personal Care', 'address': 'Westside, Nakuru'},
    {'name': 'Equator Training Institute', 'phone': '+254786789012', 'city': 'Nakuru', 'category': 'Education & Training', 'address': 'London, Nakuru'},
    {'name': 'Safari Rally Garage', 'phone': '+254787890123', 'city': 'Nakuru', 'category': 'Automotive Services', 'address': 'Gilgil Road, Nakuru'},
    {'name': 'Tugen Hills Real Estate', 'phone': '+254788901234', 'city': 'Nakuru', 'category': 'Real Estate', 'address': 'Milimani, Nakuru'},
    {'name': 'Baringo Financial Bank', 'phone': '+254789012345', 'city': 'Nakuru', 'category': 'Financial Services', 'address': 'Club Road, Nakuru'},
    {'name': 'Rift Valley Gym', 'phone': '+254790123456', 'city': 'Nakuru', 'category': 'Sports & Fitness', 'address': 'Pipeline, Nakuru'},
    
    # Eldoret (10 businesses)
    {'name': 'Champions Restaurant', 'phone': '+254791234567', 'city': 'Eldoret', 'category': 'Food & Dining', 'address': 'Uganda Road, Eldoret'},
    {'name': 'Kipchoge Athletics Training', 'phone': '+254792345678', 'city': 'Eldoret', 'category': 'Sports & Fitness', 'address': 'Kapsabet Road, Eldoret'},
    {'name': 'Maize Board Store', 'phone': '+254793456789', 'city': 'Eldoret', 'category': 'Agriculture & Farming', 'address': 'Langas, Eldoret'},
    {'name': 'Kerio Valley Transport', 'phone': '+254794567890', 'city': 'Eldoret', 'category': 'Transport & Logistics', 'address': 'Eldoret Bus Park, Eldoret'},
    {'name': 'Moi University Bookshop', 'phone': '+254795678901', 'city': 'Eldoret', 'category': 'Education & Training', 'address': 'University Area, Eldoret'},
    {'name': 'Nandi Hills Hardware', 'phone': '+254796789012', 'city': 'Eldoret', 'category': 'Construction & Hardware', 'address': 'Barngetuny Plaza, Eldoret'},
    {'name': 'Iten Medical Clinic', 'phone': '+254797890123', 'city': 'Eldoret', 'category': 'Health & Medical', 'address': 'Iten Road, Eldoret'},
    {'name': 'Highland Electronics Hub', 'phone': '+254798901234', 'city': 'Eldoret', 'category': 'Technology & Electronics', 'address': 'Zion Mall, Eldoret'},
    {'name': 'Kalenjin Cultural Center', 'phone': '+254799012345', 'city': 'Eldoret', 'category': 'Entertainment', 'address': 'Pioneer, Eldoret'},
    {'name': 'Sugoi Auto Services', 'phone': '+254700987654', 'city': 'Eldoret', 'category': 'Automotive Services', 'address': 'West Indies, Eldoret'},
]

# South Sudanese business data (50 businesses across different cities)
SOUTH_SUDANESE_BUSINESSES = [
    # Juba (25 businesses)
    {'name': 'Nile Restaurant', 'phone': '+211912345678', 'city': 'Juba', 'category': 'Food & Dining', 'address': 'Juba Bridge Area, Juba'},
    {'name': 'South Sudan Transport Co', 'phone': '+211913456789', 'city': 'Juba', 'category': 'Transport & Logistics', 'address': 'Konyo Konyo Market, Juba'},
    {'name': 'Unity Medical Center', 'phone': '+211914567890', 'city': 'Juba', 'category': 'Health & Medical', 'address': 'Munuki, Juba'},
    {'name': 'Equatoria Electronics', 'phone': '+211915678901', 'city': 'Juba', 'category': 'Technology & Electronics', 'address': 'Custom Market, Juba'},
    {'name': 'Bahr el Ghazal Store', 'phone': '+211916789012', 'city': 'Juba', 'category': 'Retail & Shopping', 'address': 'Konyokonyo, Juba'},
    {'name': 'White Nile Hotel', 'phone': '+211917890123', 'city': 'Juba', 'category': 'Hospitality & Tourism', 'address': 'Thooria, Juba'},
    {'name': 'Juba Construction Works', 'phone': '+211918901234', 'city': 'Juba', 'category': 'Construction & Hardware', 'address': 'Gudele, Juba'},
    {'name': 'Salaam Beauty Center', 'phone': '+211919012345', 'city': 'Juba', 'category': 'Beauty & Personal Care', 'address': 'Hai Cinema, Juba'},
    {'name': 'Freedom Bakery', 'phone': '+211920123456', 'city': 'Juba', 'category': 'Food & Dining', 'address': 'Malakia, Juba'},
    {'name': 'Independence Training Center', 'phone': '+211921234567', 'city': 'Juba', 'category': 'Education & Training', 'address': 'Hai Referendum, Juba'},
    {'name': 'Sudd Agriculture Services', 'phone': '+211922345678', 'city': 'Juba', 'category': 'Agriculture & Farming', 'address': 'Rejaf, Juba'},
    {'name': 'Nile Auto Repair', 'phone': '+211923456789', 'city': 'Juba', 'category': 'Automotive Services', 'address': 'Hai Mauna, Juba'},
    {'name': 'Bentiu Financial Services', 'phone': '+211924567890', 'city': 'Juba', 'category': 'Financial Services', 'address': 'Juba One, Juba'},
    {'name': 'Dinka Cultural House', 'phone': '+211925678901', 'city': 'Juba', 'category': 'Entertainment', 'address': 'Hai Thooria, Juba'},
    {'name': 'Equatorial Pharmacy', 'phone': '+211926789012', 'city': 'Juba', 'category': 'Health & Medical', 'address': 'Amarat, Juba'},
    {'name': 'Malakal Sports Complex', 'phone': '+211927890123', 'city': 'Juba', 'category': 'Sports & Fitness', 'address': 'Hai Jebel, Juba'},
    {'name': 'Unity Fashion House', 'phone': '+211928901234', 'city': 'Juba', 'category': 'Fashion & Clothing', 'address': 'Nimra Talata, Juba'},
    {'name': 'River Transport Services', 'phone': '+211929012345', 'city': 'Juba', 'category': 'Transport & Logistics', 'address': 'Port Area, Juba'},
    {'name': 'Safari Lodge Juba', 'phone': '+211930123456', 'city': 'Juba', 'category': 'Hospitality & Tourism', 'address': 'Rock City, Juba'},
    {'name': 'Nuer Cattle Ranch', 'phone': '+211931234567', 'city': 'Juba', 'category': 'Agriculture & Farming', 'address': 'Luri, Juba'},
    {'name': 'Juba Mobile Repair', 'phone': '+211932345678', 'city': 'Juba', 'category': 'Technology & Electronics', 'address': 'Souq al Arabi, Juba'},
    {'name': 'Aweil Real Estate', 'phone': '+211933456789', 'city': 'Juba', 'category': 'Real Estate', 'address': 'Hai Juba na Bari, Juba'},
    {'name': 'South Sudan Legal Aid', 'phone': '+211934567890', 'city': 'Juba', 'category': 'Legal Services', 'address': 'Government Area, Juba'},
    {'name': 'Wau Garden Center', 'phone': '+211935678901', 'city': 'Juba', 'category': 'Home & Garden', 'address': 'Lologo, Juba'},
    {'name': 'Yambio Coffee House', 'phone': '+211936789012', 'city': 'Juba', 'category': 'Food & Dining', 'address': 'Atlabara, Juba'},
    
    # Malakal (10 businesses)
    {'name': 'Upper Nile Restaurant', 'phone': '+211937890123', 'city': 'Malakal', 'category': 'Food & Dining', 'address': 'Malakal Town Center, Malakal'},
    {'name': 'Shilluk Cultural Center', 'phone': '+211938901234', 'city': 'Malakal', 'category': 'Entertainment', 'address': 'Fashoda, Malakal'},
    {'name': 'Malakal General Hospital', 'phone': '+211939012345', 'city': 'Malakal', 'category': 'Health & Medical', 'address': 'Hospital Road, Malakal'},
    {'name': 'River Port Transport', 'phone': '+211940123456', 'city': 'Malakal', 'category': 'Transport & Logistics', 'address': 'Port Area, Malakal'},
    {'name': 'Sobat Electronics', 'phone': '+211941234567', 'city': 'Malakal', 'category': 'Technology & Electronics', 'address': 'Market Street, Malakal'},
    {'name': 'Nile Hardware Store', 'phone': '+211942345678', 'city': 'Malakal', 'category': 'Construction & Hardware', 'address': 'Industrial Area, Malakal'},
    {'name': 'Fisherman\'s Market', 'phone': '+211943456789', 'city': 'Malakal', 'category': 'Retail & Shopping', 'address': 'Fish Market, Malakal'},
    {'name': 'Kodok Beauty Salon', 'phone': '+211944567890', 'city': 'Malakal', 'category': 'Beauty & Personal Care', 'address': 'Residential Area, Malakal'},
    {'name': 'Upper Nile Agriculture', 'phone': '+211945678901', 'city': 'Malakal', 'category': 'Agriculture & Farming', 'address': 'Farming District, Malakal'},
    {'name': 'Malakal Training Institute', 'phone': '+211946789012', 'city': 'Malakal', 'category': 'Education & Training', 'address': 'Education Quarter, Malakal'},
    
    # Wau (8 businesses)
    {'name': 'Bahr el Ghazal Restaurant', 'phone': '+211947890123', 'city': 'Wau', 'category': 'Food & Dining', 'address': 'Wau Market Area, Wau'},
    {'name': 'Wau Medical Clinic', 'phone': '+211948901234', 'city': 'Wau', 'category': 'Health & Medical', 'address': 'Hospital Road, Wau'},
    {'name': 'Western Transport Hub', 'phone': '+211949012345', 'city': 'Wau', 'category': 'Transport & Logistics', 'address': 'Bus Station, Wau'},
    {'name': 'Fertit Electronics Shop', 'phone': '+211950123456', 'city': 'Wau', 'category': 'Technology & Electronics', 'address': 'Commercial Area, Wau'},
    {'name': 'Jur River Lodge', 'phone': '+211951234567', 'city': 'Wau', 'category': 'Hospitality & Tourism', 'address': 'Riverfront, Wau'},
    {'name': 'Wau Construction Co', 'phone': '+211952345678', 'city': 'Wau', 'category': 'Construction & Hardware', 'address': 'Building Supplies Area, Wau'},
    {'name': 'Balanda Bakery', 'phone': '+211953456789', 'city': 'Wau', 'category': 'Food & Dining', 'address': 'Town Center, Wau'},
    {'name': 'Western Automotive', 'phone': '+211954567890', 'city': 'Wau', 'category': 'Automotive Services', 'address': 'Garage District, Wau'},
    
    # Yei (4 businesses)
    {'name': 'Equatorial Restaurant', 'phone': '+211955678901', 'city': 'Yei', 'category': 'Food & Dining', 'address': 'Yei Market, Yei'},
    {'name': 'Yei Health Center', 'phone': '+211956789012', 'city': 'Yei', 'category': 'Health & Medical', 'address': 'Medical Quarter, Yei'},
    {'name': 'Border Electronics', 'phone': '+211957890123', 'city': 'Yei', 'category': 'Technology & Electronics', 'address': 'Commercial Street, Yei'},
    {'name': 'Kakwa Transport Services', 'phone': '+211958901234', 'city': 'Yei', 'category': 'Transport & Logistics', 'address': 'Transport Terminal, Yei'},
    
    # Bentiu (3 businesses)
    {'name': 'Unity State Restaurant', 'phone': '+211959012345', 'city': 'Bentiu', 'category': 'Food & Dining', 'address': 'Bentiu Town, Bentiu'},
    {'name': 'Oil City Electronics', 'phone': '+211960123456', 'city': 'Bentiu', 'category': 'Technology & Electronics', 'address': 'Market Area, Bentiu'},
    {'name': 'Bentiu Medical Services', 'phone': '+211961234567', 'city': 'Bentiu', 'category': 'Health & Medical', 'address': 'Health Center, Bentiu'},
]

def populate_businesses():
    """Populate database with African businesses"""
    
    print("🚀 Starting African Business Population Strategy")
    print("=" * 60)
    
    # Clear existing placeholder businesses
    existing_count = PlaceholderBusiness.objects.all().count()
    if existing_count > 0:
        print(f"⚠️  Found {existing_count} existing placeholder businesses")
        choice = input("Do you want to clear existing businesses? (y/N): ").lower()
        if choice == 'y':
            PlaceholderBusiness.objects.all().delete()
            print("✅ Cleared existing businesses")
    
    created_count = 0
    
    # Populate Kenyan businesses
    print(f"\n📍 Populating {len(KENYAN_BUSINESSES)} Kenyan businesses...")
    for business_data in KENYAN_BUSINESSES:
        # Generate random coordinates within Kenya
        latitude = Decimal(str(random.uniform(-4.5, 4.5)))  # Kenya latitude range
        longitude = Decimal(str(random.uniform(33.0, 42.0)))  # Kenya longitude range
        
        business, created = PlaceholderBusiness.objects.get_or_create(
            phone=business_data['phone'],
            defaults={
                'name': business_data['name'],
                'address': business_data['address'],
                'category': business_data['category'],
                'country': 'KE',
                'city': business_data['city'],
                'latitude': latitude,
                'longitude': longitude,
                'source': 'marketplace_population',
                'max_contact_limit': 3
            }
        )
        
        if created:
            created_count += 1
            print(f"  ✅ Created: {business.name} - {business.city}")
        else:
            print(f"  ⚠️  Exists: {business.name} - {business.city}")
    
    # Populate South Sudanese businesses
    print(f"\n📍 Populating {len(SOUTH_SUDANESE_BUSINESSES)} South Sudanese businesses...")
    for business_data in SOUTH_SUDANESE_BUSINESSES:
        # Generate random coordinates within South Sudan
        latitude = Decimal(str(random.uniform(3.0, 12.0)))  # South Sudan latitude range
        longitude = Decimal(str(random.uniform(23.0, 36.0)))  # South Sudan longitude range
        
        business, created = PlaceholderBusiness.objects.get_or_create(
            phone=business_data['phone'],
            defaults={
                'name': business_data['name'],
                'address': business_data['address'],
                'category': business_data['category'],
                'country': 'SS',
                'city': business_data['city'],
                'latitude': latitude,
                'longitude': longitude,
                'source': 'marketplace_population',
                'max_contact_limit': 3
            }
        )
        
        if created:
            created_count += 1
            print(f"  ✅ Created: {business.name} - {business.city}")
        else:
            print(f"  ⚠️  Exists: {business.name} - {business.city}")
    
    print("\n" + "=" * 60)
    print(f"✨ Population Complete!")
    print(f"📊 Statistics:")
    print(f"   • New businesses created: {created_count}")
    print(f"   • Kenyan businesses: {PlaceholderBusiness.objects.filter(country='KE').count()}")
    print(f"   • South Sudanese businesses: {PlaceholderBusiness.objects.filter(country='SS').count()}")
    print(f"   • Total businesses: {PlaceholderBusiness.objects.all().count()}")
    
    print(f"\n📱 SMS Configuration Required:")
    print(f"   • Africa's Talking API credentials")
    print(f"   • SMS templates configured")
    print(f"   • Contact limits: 3 messages per placeholder")
    
    print(f"\n🎯 Next Steps:")
    print(f"   1. Configure Africa's Talking API in production")
    print(f"   2. Test SMS delivery with real phone numbers")
    print(f"   3. Monitor contact attempt logs")
    print(f"   4. Update frontend to display businesses by location")
    
    return created_count

if __name__ == "__main__":
    populate_businesses()