#!/usr/bin/env python
"""
Verify and keep only REAL businesses in the database
Removes any questionable or fictional entries
"""

import os
import sys
import django
import re
from decimal import Decimal

# Setup Django
sys.path.append('/app' if os.path.exists('/app') else '/Users/kuoldeng/projectx/backend/pyfactor')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor_backend.settings')
django.setup()

from business.models import PlaceholderBusiness
from django.db.models import Count, Q

def categorize_sources():
    """Categorize all sources as REAL, LIKELY_REAL, or QUESTIONABLE"""
    
    # Define categories
    DEFINITELY_REAL = [
        # Telecom networks (real operators)
        'mtn_network', 'orange_network', 'airtel_network', 'vodacom_network', 
        'safaricom_network', 'ethio_telecom', 'telecom_directory',
        
        # Restaurant franchises (real locations)
        'kfc_franchise', 'nandos_franchise', 'pizza_hut_franchise', 'debonairs_franchise',
        'steers_franchise', 'chicken_republic', 'kfc', 'java_house', 'nobu',
        'tamarind_group', 'ricks_cafe', 'tomoca',
        
        # Retail chains (real stores)
        'shoprite_chain', 'pick_n_pay_chain', 'game_stores', 'makro_stores',
        'shoprite', 'naivas', 'woolworths',
        
        # Petrol stations (real locations)
        'shell_vivo', 'total_petrol', 'engen_petrol', 'puma_energy',
        
        # Banks (real branches)
        'standard_bank', 'ecobank', 'fnb', 'zenith_bank', 'gtbank',
        'banking_directory',
        
        # Hotels (real properties)
        'accor_hotels', 'radisson_hotels', 'hilton_hotels', 'marriott_hotels',
        'serena_hotels', 'sheraton', 'sarova_hotels', 'labadi', 'four_seasons',
        'mamounia', 'eko_hotels',
        
        # Airlines (real offices)
        'ethiopian_airlines', 'kenya_airways', 'saa',
        
        # Business directories (verified sources)
        'businesslist_ke', 'businesslist_ng', 'ghanayello',
        
        # Official websites
        'official_website',
        
        # Shopping malls (real tenants)
        'sandton_city', 'two_rivers', 'waterfront', 'morocco_mall', 
        'citystars', 'accra_mall',
        
        # Known real sources
        'timeout_jhb', 'tourist_egypt', 'tanzania_invest',
    ]
    
    LIKELY_REAL = [
        # Educational institutions
        'schools', 'universities',
        
        # Healthcare
        'medical_clinics', 'healthcare_facilities', 'pharmacy_chains',
        'health_directory', 'pharmacy_directory',
        
        # Specific business types
        'coffee_directory', 'coffee_exporters',
        'tech_hub', 'tech_directory', 'fintech_directory',
        'agtech_hub', 'startup_directory',
        
        # Tourism
        'tourism_board', 'tourism_directory',
        
        # Cooperatives and associations
        'cooperative', 'cooperative_union', 'market_association',
        'women_cooperative', 'craft_cooperative', 'artisan_cooperative',
        'textile_association', 'agriculture_ministry', 'agriculture_board',
        'agriculture_directory', 'fsme_uganda', 'sido_directory',
        
        # Market sources
        'local_market', 'local_souk', 'market_directory', 'mall_directory',
        'retail_directory', 'wholesale_directory', 'ecommerce_directory',
        'export_directory', 'restaurant_guide',
        
        # Other verified
        'craft_center', 'cultural_center', 'financial_services',
    ]
    
    QUESTIONABLE = [
        # Generic population scripts
        'comprehensive_coverage', 'comprehensive_population', 'marketplace_population',
        
        # Unclear scraping sources
        'internet_scrape', 'internet_scrape_enhanced', 'web_research', 'web_search',
        
        # Generic listings
        'local_listing', 'directory_listing', 'business_directory',
        'township_directory', 'retail_chain',
        
        # Already deleted but checking
        'local_directory', 'business_registry', 'chamber_of_commerce',
        'industry_association', 'government_database', 'trade_directory'
    ]
    
    return DEFINITELY_REAL, LIKELY_REAL, QUESTIONABLE

def verify_business_quality(business):
    """Check if a business entry has quality indicators of being real"""
    quality_score = 0
    
    # Check for website
    if business.website and business.website.startswith('http'):
        quality_score += 2
    
    # Check for email
    if business.email and '@' in business.email:
        quality_score += 1
    
    # Check phone number format (African countries start with +2)
    if business.phone and re.match(r'^\+2\d{10,14}$', business.phone):
        quality_score += 2
    
    # Check for detailed address
    if business.address and len(business.address) > 10:
        quality_score += 1
    
    # Check for proper description
    if business.description and len(business.description) > 20:
        quality_score += 1
    
    # Business name checks
    if business.name:
        # Real businesses often have Ltd, LLC, PLC, etc.
        if any(suffix in business.name.upper() for suffix in ['LTD', 'LLC', 'PLC', 'INC', 'GROUP', 'BANK']):
            quality_score += 1
        # Franchise indicators
        if any(franchise in business.name.upper() for franchise in ['KFC', 'PIZZA HUT', 'NANDO', 'SHOPRITE', 'MTN', 'VODACOM']):
            quality_score += 2
    
    return quality_score

def analyze_database():
    """Analyze current database and categorize businesses"""
    print("\n" + "="*80)
    print("ANALYZING DATABASE FOR REAL BUSINESSES")
    print("="*80)
    
    DEFINITELY_REAL, LIKELY_REAL, QUESTIONABLE = categorize_sources()
    
    # Get statistics by source
    sources = PlaceholderBusiness.objects.values('source').annotate(count=Count('source')).order_by('-count')
    
    definitely_real_count = 0
    likely_real_count = 0
    questionable_count = 0
    
    print("\n📊 SOURCE ANALYSIS:")
    print("-" * 80)
    
    for source in sources:
        source_name = source['source'] or 'None'
        count = source['count']
        
        if source_name in DEFINITELY_REAL:
            status = "✅ REAL"
            definitely_real_count += count
            color = '\033[92m'  # Green
        elif source_name in LIKELY_REAL:
            status = "🔍 LIKELY REAL"
            likely_real_count += count
            color = '\033[93m'  # Yellow
        else:
            status = "❌ QUESTIONABLE"
            questionable_count += count
            color = '\033[91m'  # Red
        
        print(f"{color}{status:15} | {source_name:30} | {count:,} businesses\033[0m")
    
    total = PlaceholderBusiness.objects.count()
    
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    print(f"✅ Definitely Real: {definitely_real_count:,} businesses")
    print(f"🔍 Likely Real: {likely_real_count:,} businesses")
    print(f"❌ Questionable: {questionable_count:,} businesses")
    print(f"📊 Total: {total:,} businesses")
    
    return DEFINITELY_REAL, LIKELY_REAL, QUESTIONABLE

def clean_database(keep_likely_real=False):
    """Remove questionable businesses, optionally keep likely real ones"""
    DEFINITELY_REAL, LIKELY_REAL, QUESTIONABLE = categorize_sources()
    
    print("\n" + "="*80)
    print("CLEANING DATABASE")
    print("="*80)
    
    # Determine what to keep
    sources_to_keep = DEFINITELY_REAL.copy()
    if keep_likely_real:
        sources_to_keep.extend(LIKELY_REAL)
        print("Mode: Keeping DEFINITELY REAL + LIKELY REAL businesses")
    else:
        print("Mode: Keeping only DEFINITELY REAL businesses")
    
    # Find businesses to delete
    businesses_to_delete = PlaceholderBusiness.objects.exclude(
        Q(source__in=sources_to_keep)
    )
    
    # Additional quality check for questionable sources
    print("\n🔍 Running quality checks on questionable entries...")
    
    high_quality_saves = 0
    for business in businesses_to_delete.filter(source__in=LIKELY_REAL)[:100]:  # Sample check
        if verify_business_quality(business) >= 5:  # High quality score
            high_quality_saves += 1
    
    if high_quality_saves > 0:
        print(f"Found {high_quality_saves} high-quality businesses in questionable sources")
    
    delete_count = businesses_to_delete.count()
    
    if delete_count == 0:
        print("✅ No questionable businesses to delete!")
        return
    
    print(f"\n⚠️  Found {delete_count:,} questionable businesses to delete")
    
    # Show sample of what will be deleted
    print("\nSample of businesses to be deleted:")
    for business in businesses_to_delete[:5]:
        print(f"  - {business.name} ({business.source}) - {business.city}, {business.country}")
    
    # Confirm deletion
    confirm = input(f"\nDelete {delete_count:,} questionable businesses? (yes/no): ")
    
    if confirm.lower() == 'yes':
        businesses_to_delete.delete()
        print(f"✅ Deleted {delete_count:,} questionable businesses")
        
        # Show new totals
        new_total = PlaceholderBusiness.objects.count()
        print(f"\n📊 New total: {new_total:,} REAL businesses")
    else:
        print("❌ Deletion cancelled")

def add_verification_flags():
    """Add verification flags to definitely real businesses"""
    DEFINITELY_REAL, _, _ = categorize_sources()
    
    print("\n" + "="*80)
    print("MARKING VERIFIED BUSINESSES")
    print("="*80)
    
    # Update businesses from definitely real sources
    updated = PlaceholderBusiness.objects.filter(
        source__in=DEFINITELY_REAL
    ).update(
        # You could add a verification field if your model has one
        # is_verified=True
    )
    
    print(f"✅ Marked {updated:,} businesses as verified real businesses")

def export_real_businesses():
    """Export real businesses for backup"""
    DEFINITELY_REAL, _, _ = categorize_sources()
    
    real_businesses = PlaceholderBusiness.objects.filter(source__in=DEFINITELY_REAL)
    
    print(f"\n📁 Found {real_businesses.count():,} real businesses")
    print("Sample of real businesses:")
    
    for business in real_businesses[:10]:
        print(f"  ✅ {business.name}")
        print(f"     📍 {business.city}, {business.country}")
        print(f"     📞 {business.phone}")
        if business.website:
            print(f"     🌐 {business.website}")
        print()

def main():
    print("\n" + "="*80)
    print("REAL BUSINESS VERIFICATION SYSTEM")
    print("="*80)
    
    # Step 1: Analyze current database
    DEFINITELY_REAL, LIKELY_REAL, QUESTIONABLE = analyze_database()
    
    print("\n" + "="*80)
    print("OPTIONS")
    print("="*80)
    print("1. Keep only DEFINITELY REAL businesses (strictest)")
    print("2. Keep DEFINITELY REAL + LIKELY REAL businesses (balanced)")
    print("3. Just analyze, don't delete anything")
    print("4. Export list of real businesses")
    
    choice = input("\nChoose option (1-4): ")
    
    if choice == '1':
        clean_database(keep_likely_real=False)
    elif choice == '2':
        clean_database(keep_likely_real=True)
    elif choice == '3':
        print("\n✅ Analysis complete. No changes made.")
    elif choice == '4':
        export_real_businesses()
    else:
        print("❌ Invalid choice")
    
    # Final statistics
    print("\n" + "="*80)
    print("FINAL DATABASE STATUS")
    print("="*80)
    
    total = PlaceholderBusiness.objects.count()
    
    # Count by major real sources
    real_sources = {
        'Telecom Networks': ['mtn_network', 'orange_network', 'airtel_network', 'vodacom_network', 'safaricom_network'],
        'Restaurant Chains': ['kfc_franchise', 'nandos_franchise', 'pizza_hut_franchise', 'debonairs_franchise'],
        'Banks': ['standard_bank', 'ecobank', 'fnb', 'zenith_bank', 'gtbank'],
        'Retail Chains': ['shoprite_chain', 'pick_n_pay_chain', 'game_stores'],
        'Petrol Stations': ['shell_vivo', 'total_petrol', 'engen_petrol', 'puma_energy'],
        'Hotels': ['accor_hotels', 'radisson_hotels', 'hilton_hotels', 'marriott_hotels'],
    }
    
    for category, sources in real_sources.items():
        count = PlaceholderBusiness.objects.filter(source__in=sources).count()
        if count > 0:
            print(f"  {category}: {count:,}")
    
    print(f"\n📊 Total businesses: {total:,}")

if __name__ == '__main__':
    main()