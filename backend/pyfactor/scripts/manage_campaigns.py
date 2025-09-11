#!/usr/bin/env python3
"""
Campaign Management Script
Utility for managing advertising campaigns and featured business status
"""
import os
import sys
import django
from datetime import date

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from advertising.models import AdvertisingCampaign
from marketplace.models import BusinessListing
from business.models import PlaceholderBusiness

def list_active_campaigns():
    """List all currently active campaigns"""
    print("\n=== ACTIVE CAMPAIGNS ===")
    today = date.today()
    
    campaigns = AdvertisingCampaign.objects.filter(
        status='active',
        start_date__lte=today,
        end_date__gte=today
    ).select_related('business')
    
    if not campaigns:
        print("No active campaigns found.")
        return
    
    for campaign in campaigns:
        print(f"📊 {campaign.name}")
        print(f"   Type: {campaign.get_type_display()}")
        print(f"   Business: {campaign.business.business_name if campaign.business else 'No business'}")
        print(f"   Duration: {campaign.start_date} to {campaign.end_date}")
        print(f"   Budget: FREE (No cost advertising)")
        print(f"   Performance: {campaign.impressions} views, {campaign.clicks} clicks")
        print()

def list_featured_businesses():
    """List all currently featured businesses"""
    print("\n=== FEATURED BUSINESSES ===")
    today = date.today()
    
    # From active campaigns
    featured_campaigns = AdvertisingCampaign.objects.filter(
        type='featured',
        status='active',
        start_date__lte=today,
        end_date__gte=today
    ).select_related('business')
    
    # From business listings
    featured_listings = BusinessListing.objects.filter(
        is_featured=True,
        featured_until__gte=today,
        is_visible_in_marketplace=True
    ).select_related('business')
    
    print("From Active Campaigns:")
    if featured_campaigns:
        for campaign in featured_campaigns:
            if campaign.business:
                print(f"⭐ {campaign.business.business_name} ({campaign.business.city})")
                print(f"   Campaign: {campaign.name} (ends {campaign.end_date})")
    else:
        print("   None found")
    
    print("\nFrom Business Listings:")
    if featured_listings:
        for listing in featured_listings:
            if listing.business:
                print(f"⭐ {listing.business.business_name} ({listing.business.city})")
                print(f"   Featured until: {listing.featured_until}")
    else:
        print("   None found")

def expire_campaigns():
    """Mark expired campaigns as completed"""
    print("\n=== EXPIRING CAMPAIGNS ===")
    today = date.today()
    
    expired_campaigns = AdvertisingCampaign.objects.filter(
        status='active',
        end_date__lt=today
    )
    
    if not expired_campaigns:
        print("No campaigns to expire.")
        return
    
    for campaign in expired_campaigns:
        print(f"🏁 Expiring: {campaign.name}")
        campaign.complete()
    
    print(f"Expired {expired_campaigns.count()} campaigns.")

def activate_campaign(campaign_id):
    """Manually activate a campaign"""
    try:
        campaign = AdvertisingCampaign.objects.get(id=campaign_id)
        if campaign.status == 'active':
            print(f"Campaign '{campaign.name}' is already active.")
            return
        
        print(f"🚀 Activating campaign: {campaign.name}")
        campaign.activate()
        print("✅ Campaign activated successfully!")
        
        # Check if featured business was updated
        if campaign.type == 'featured' and campaign.business:
            try:
                listing = BusinessListing.objects.get(business=campaign.business)
                print(f"📈 Business '{campaign.business.business_name}' is now featured until {listing.featured_until}")
            except BusinessListing.DoesNotExist:
                print("⚠️  Business listing not found")
                
    except AdvertisingCampaign.DoesNotExist:
        print(f"Campaign with ID {campaign_id} not found.")

def main():
    if len(sys.argv) < 2:
        print("Campaign Management Script")
        print("Usage:")
        print("  python manage_campaigns.py list         - List active campaigns")
        print("  python manage_campaigns.py featured     - List featured businesses") 
        print("  python manage_campaigns.py expire       - Expire old campaigns")
        print("  python manage_campaigns.py activate <id> - Activate campaign by ID")
        return
    
    command = sys.argv[1].lower()
    
    if command == 'list':
        list_active_campaigns()
    elif command == 'featured':
        list_featured_businesses()
    elif command == 'expire':
        expire_campaigns()
    elif command == 'activate' and len(sys.argv) > 2:
        activate_campaign(sys.argv[2])
    else:
        print("Invalid command. Use 'list', 'featured', 'expire', or 'activate <id>'")

if __name__ == '__main__':
    main()