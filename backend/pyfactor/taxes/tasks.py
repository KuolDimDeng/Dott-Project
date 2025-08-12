# taxes/tasks.py
from celery import shared_task
from django.utils import timezone
from decimal import Decimal
import anthropic
import json
import logging

logger = logging.getLogger(__name__)


@shared_task
def populate_tax_rates_for_country(country_code, country_name, tenant_id=None):
    """
    Background task to populate tax rates for a specific country using Claude AI
    This runs after user completes onboarding
    """
    from .models import GlobalSalesTaxRate
    
    logger.info(f"[Tax Rate Population] === START === Country: {country_name} ({country_code})")
    
    try:
        # Check if we already have a rate
        existing_rate = GlobalSalesTaxRate.objects.filter(
            country=country_code,
            region_code='',
            locality='',
            is_current=True
        ).first()
        
        if existing_rate and existing_rate.rate > 0:
            logger.info(f"[Tax Rate Population] Rate already exists: {existing_rate.rate_percentage}")
            return {
                'success': True,
                'country': country_name,
                'rate': float(existing_rate.rate),
                'tax_type': existing_rate.tax_type,
                'already_existed': True
            }
        
        # Initialize Claude client
        from django.conf import settings
        api_key = getattr(settings, 'CLAUDE_TAX_API_KEY', None) or getattr(settings, 'CLAUDE_API_KEY', None)
        
        if not api_key:
            logger.error("[Tax Rate Population] No Claude API key configured")
            raise ValueError("Claude API key not configured")
            
        client = anthropic.Anthropic(api_key=api_key)
        
        # Ask Claude for tax information
        prompt = f"""Please provide the current standard sales tax rate (or VAT/GST rate) for {country_name} ({country_code}).
        
        Respond ONLY with a JSON object in this exact format:
        {{
            "country_code": "{country_code}",
            "country_name": "{country_name}",
            "tax_type": "vat|gst|sales_tax|consumption_tax",
            "standard_rate": 0.XX,
            "confidence": 0.X,
            "source_year": 2025,
            "notes": "brief note about the rate including any regional variations"
        }}"""
        
        logger.info(f"[Tax Rate Population] Sending request to Claude AI...")
        
        response = client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=200,
            temperature=0,
            messages=[{"role": "user", "content": prompt}]
        )
        
        # Parse response
        content = response.content[0].text.strip()
        logger.info(f"[Tax Rate Population] Claude response: {content[:200]}...")
        
        start_idx = content.find('{')
        end_idx = content.rfind('}') + 1
        
        if start_idx != -1 and end_idx > start_idx:
            json_str = content[start_idx:end_idx]
            tax_data = json.loads(json_str)
            
            logger.info(f"[Tax Rate Population] Parsed data: {tax_data}")
            
            # Save to database
            rate_obj, created = GlobalSalesTaxRate.objects.update_or_create(
                country=tax_data['country_code'],
                region_code='',
                locality='',
                tax_type=tax_data['tax_type'],
                defaults={
                    'country_name': tax_data['country_name'],
                    'rate': Decimal(str(tax_data['standard_rate'])),
                    'ai_populated': True,
                    'ai_confidence_score': Decimal(str(tax_data.get('confidence', 0.8))),
                    'ai_source_notes': tax_data['notes'],
                    'ai_last_verified': timezone.now(),
                    'effective_date': timezone.now().date(),
                    'is_current': True,
                }
            )
            
            logger.info(f"[Tax Rate Population] === SUCCESS === "
                       f"{'Created' if created else 'Updated'} tax rate for {country_name}: "
                       f"{tax_data['tax_type']} {tax_data['standard_rate']*100}%")
            
            return {
                'success': True,
                'country': country_name,
                'rate': tax_data['standard_rate'],
                'tax_type': tax_data['tax_type'],
                'created': created
            }
        else:
            raise ValueError("Could not parse Claude response as JSON")
            
    except Exception as e:
        logger.error(f"[Tax Rate Population] === ERROR === {country_name}: {str(e)}")
        
        # Set a default 0% rate with a note that it needs verification
        GlobalSalesTaxRate.objects.update_or_create(
            country=country_code,
            region_code='',
            locality='',
            tax_type='sales_tax',
            defaults={
                'country_name': country_name,
                'rate': Decimal('0'),
                'ai_populated': True,
                'ai_confidence_score': Decimal('0'),
                'ai_source_notes': f'Failed to fetch rate: {str(e)} - manual verification required',
                'ai_last_verified': timezone.now(),
                'effective_date': timezone.now().date(),
                'is_current': True,
            }
        )
        
        return {
            'success': False,
            'country': country_name,
            'error': str(e)
        }


@shared_task
def update_all_tax_rates():
    """
    Periodic task to update all tax rates in the database
    Can be run monthly to ensure rates are current
    """
    from .models import GlobalSalesTaxRate
    
    rates = GlobalSalesTaxRate.objects.filter(
        is_current=True,
        ai_populated=True
    )
    
    results = []
    for rate in rates:
        result = populate_tax_rates_for_country.delay(
            rate.country.code,
            rate.country_name
        )
        results.append(result)
    
    return f"Queued {len(results)} tax rate updates"