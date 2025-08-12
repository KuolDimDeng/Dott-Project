#!/usr/bin/env python3
"""
Populate filing information for GlobalSalesTaxRate records in batches of 10.
This adds tax authority details, filing frequencies, online portal info, and filing instructions.
"""
import os
import sys
import django
import time
import json
from datetime import datetime
from decimal import Decimal

# Django setup
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import transaction as db_transaction
from taxes.models import GlobalSalesTaxRate
from anthropic import Anthropic
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Claude client
CLAUDE_API_KEY = os.environ.get('CLAUDE_API_KEY')
if not CLAUDE_API_KEY:
    logger.error("CLAUDE_API_KEY not found in environment variables")
    sys.exit(1)

client = Anthropic(api_key=CLAUDE_API_KEY)

def get_filing_info_for_country(country_name, country_code, tax_type, rate):
    """Get filing information for a specific country using Claude API."""
    prompt = f"""For {country_name} ({country_code}) with {tax_type} at {rate*100:.2f}%, provide tax filing information in JSON format:

{{
    "tax_authority_name": "Official name of tax authority",
    "filing_frequency": "monthly/quarterly/annual/bi_monthly",
    "filing_day_of_month": day_number_or_null,
    "online_filing_available": true/false,
    "online_portal_name": "Name of online system or empty string",
    "online_portal_url": "URL or empty string",
    "main_form_name": "Main tax form name or empty string",
    "filing_instructions": "Brief instructions for manual filing (2-3 sentences)",
    "manual_filing_fee": suggested_USD_fee_for_manual_service,
    "online_filing_fee": suggested_USD_fee_for_online_service
}}

Consider developing country status when suggesting fees. Be accurate and factual."""

    try:
        response = client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=500,
            temperature=0,
            messages=[{"role": "user", "content": prompt}]
        )
        
        # Extract JSON from response
        content = response.content[0].text
        # Find JSON in response
        import re
        json_match = re.search(r'\{[\s\S]*\}', content)
        if json_match:
            return json.loads(json_match.group())
        else:
            logger.error(f"No JSON found in response for {country_name}")
            return None
            
    except Exception as e:
        logger.error(f"Error getting filing info for {country_name}: {e}")
        return None

def update_filing_information(batch_size=10, limit=None):
    """Update filing information for countries in batches."""
    
    # Get countries that need filing information
    countries_to_update = GlobalSalesTaxRate.objects.filter(
        is_current=True,
        tax_authority_name__isnull=True  # Only update if not already populated
    ).order_by('country_name')
    
    if limit:
        countries_to_update = countries_to_update[:limit]
    
    total_count = countries_to_update.count()
    logger.info(f"Found {total_count} countries to update")
    
    if total_count == 0:
        logger.info("No countries need filing information update")
        return
    
    # Progress tracking
    success_count = 0
    error_count = 0
    batch_count = 0
    
    # Save progress to file
    progress_file = 'filing_info_progress.json'
    
    # Process in batches
    for i in range(0, total_count, batch_size):
        batch = countries_to_update[i:i+batch_size]
        batch_count += 1
        
        logger.info(f"\n{'='*50}")
        logger.info(f"Processing batch {batch_count} ({i+1}-{min(i+batch_size, total_count)} of {total_count})")
        logger.info(f"{'='*50}")
        
        for tax_rate in batch:
            logger.info(f"\nProcessing {tax_rate.country_name} ({tax_rate.country})...")
            
            # Get filing info from Claude
            filing_info = get_filing_info_for_country(
                tax_rate.country_name,
                tax_rate.country,
                tax_rate.tax_type,
                tax_rate.rate
            )
            
            if filing_info:
                try:
                    with db_transaction.atomic():
                        # Update the record
                        tax_rate.tax_authority_name = filing_info.get('tax_authority_name', '')
                        tax_rate.filing_frequency = filing_info.get('filing_frequency', '')
                        tax_rate.filing_day_of_month = filing_info.get('filing_day_of_month')
                        tax_rate.online_filing_available = filing_info.get('online_filing_available', False)
                        tax_rate.online_portal_name = filing_info.get('online_portal_name', '')
                        tax_rate.online_portal_url = filing_info.get('online_portal_url', '')
                        tax_rate.main_form_name = filing_info.get('main_form_name', '')
                        tax_rate.filing_instructions = filing_info.get('filing_instructions', '')
                        tax_rate.manual_filing_fee = Decimal(str(filing_info.get('manual_filing_fee', 35.00)))
                        tax_rate.online_filing_fee = Decimal(str(filing_info.get('online_filing_fee', 65.00)))
                        
                        tax_rate.save()
                        success_count += 1
                        logger.info(f"✅ Successfully updated {tax_rate.country_name}")
                        
                except Exception as e:
                    error_count += 1
                    logger.error(f"❌ Error saving {tax_rate.country_name}: {e}")
            else:
                error_count += 1
                logger.error(f"❌ No filing info received for {tax_rate.country_name}")
        
        # Save progress
        progress = {
            'last_updated': datetime.now().isoformat(),
            'total_countries': total_count,
            'processed': i + len(batch),
            'success_count': success_count,
            'error_count': error_count,
            'batch_count': batch_count
        }
        
        with open(progress_file, 'w') as f:
            json.dump(progress, f, indent=2)
        
        # Rate limiting - wait between batches
        if i + batch_size < total_count:
            wait_time = 2  # seconds
            logger.info(f"\nWaiting {wait_time} seconds before next batch...")
            time.sleep(wait_time)
    
    # Final summary
    logger.info(f"\n{'='*50}")
    logger.info(f"FILING INFORMATION UPDATE COMPLETE")
    logger.info(f"{'='*50}")
    logger.info(f"Total countries: {total_count}")
    logger.info(f"Successfully updated: {success_count}")
    logger.info(f"Errors: {error_count}")
    logger.info(f"Success rate: {(success_count/total_count)*100:.1f}%")
    
    # Save final progress
    progress['completed'] = True
    with open(progress_file, 'w') as f:
        json.dump(progress, f, indent=2)

def show_sample_updates(limit=5):
    """Show sample of updated countries with filing information."""
    logger.info("\nSample of countries with filing information:")
    logger.info("="*80)
    
    samples = GlobalSalesTaxRate.objects.filter(
        is_current=True,
        tax_authority_name__isnull=False
    ).order_by('-updated_at')[:limit]
    
    for rate in samples:
        logger.info(f"\n{rate.country_name} ({rate.country}):")
        logger.info(f"  Tax Authority: {rate.tax_authority_name}")
        logger.info(f"  Filing Frequency: {rate.filing_frequency}")
        logger.info(f"  Filing Day: {rate.filing_day_of_month or 'N/A'}")
        logger.info(f"  Online Filing: {'Yes' if rate.online_filing_available else 'No'}")
        if rate.online_portal_name:
            logger.info(f"  Portal: {rate.online_portal_name}")
        if rate.online_portal_url:
            logger.info(f"  URL: {rate.online_portal_url}")
        logger.info(f"  Main Form: {rate.main_form_name or 'N/A'}")
        logger.info(f"  Fees: Manual ${rate.manual_filing_fee}, Online ${rate.online_filing_fee}")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Populate filing information for tax rates')
    parser.add_argument('--batch-size', type=int, default=10, help='Number of countries per batch')
    parser.add_argument('--limit', type=int, help='Limit total countries to process')
    parser.add_argument('--show-samples', action='store_true', help='Show sample updates only')
    
    args = parser.parse_args()
    
    if args.show_samples:
        show_sample_updates()
    else:
        logger.info(f"Starting filing information population with batch size {args.batch_size}")
        update_filing_information(batch_size=args.batch_size, limit=args.limit)