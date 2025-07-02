"""
Tax suggestions view with caching and Claude API integration
"""
import json
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from taxes.models import TaxRateCache, TaxApiUsage
from taxes.services.claude_service import ClaudeComplianceService
import anthropic

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_tax_suggestions(request):
    """
    Get tax suggestions with caching and retry logic
    """
    try:
        # Extract request data
        business_info = request.data.get('businessInfo', {})
        country = business_info.get('country', '')
        state_province = business_info.get('stateProvince', '')
        city = business_info.get('city', '')
        business_type = business_info.get('businessType', 'retail')
        
        # Validate required fields
        if not all([country, state_province, city]):
            return Response({
                'error': 'Missing required location fields'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check cache first
        cache_hit = TaxRateCache.objects.filter(
            country=country,
            state_province=state_province,
            city=city,
            business_type=business_type,
            expires_at__gt=timezone.now()
        ).first()
        
        if cache_hit:
            logger.info(f"Cache hit for {city}, {state_province}, {country}")
            # Update hit count
            cache_hit.hit_count += 1
            cache_hit.save()
            
            # Return cached data
            return Response({
                'suggestedRates': {
                    'stateSalesTaxRate': float(cache_hit.sales_tax_rate),
                    'localSalesTaxRate': float(cache_hit.local_sales_tax_rate) if hasattr(cache_hit, 'local_sales_tax_rate') else 0,
                    'totalSalesTaxRate': float(cache_hit.total_sales_tax_rate) if hasattr(cache_hit, 'total_sales_tax_rate') else float(cache_hit.sales_tax_rate),
                    'corporateIncomeTaxRate': float(cache_hit.corporate_income_tax_rate) if hasattr(cache_hit, 'corporate_income_tax_rate') else 5,
                    'hasProgressiveTax': cache_hit.has_progressive_tax if hasattr(cache_hit, 'has_progressive_tax') else False,
                    'personalIncomeTaxBrackets': cache_hit.personal_income_tax_brackets if hasattr(cache_hit, 'personal_income_tax_brackets') else [],
                    'flatPersonalIncomeTaxRate': float(cache_hit.income_tax_rate),
                    'healthInsuranceRate': float(cache_hit.health_insurance_rate) if hasattr(cache_hit, 'health_insurance_rate') else 0,
                    'healthInsuranceEmployerRate': float(cache_hit.health_insurance_employer_rate) if hasattr(cache_hit, 'health_insurance_employer_rate') else 0,
                    'socialSecurityRate': float(cache_hit.social_security_rate) if hasattr(cache_hit, 'social_security_rate') else 6.2,
                    'socialSecurityEmployerRate': float(cache_hit.social_security_employer_rate) if hasattr(cache_hit, 'social_security_employer_rate') else 6.2,
                    'federalPayrollTaxRate': float(cache_hit.payroll_tax_rate),
                    'statePayrollTaxRate': float(cache_hit.state_payroll_tax_rate) if hasattr(cache_hit, 'state_payroll_tax_rate') else 0,
                    'stateTaxWebsite': cache_hit.filing_website,
                    'stateTaxAddress': cache_hit.filing_address,
                    'localTaxWebsite': cache_hit.local_tax_website if hasattr(cache_hit, 'local_tax_website') else '',
                    'localTaxAddress': cache_hit.local_tax_address if hasattr(cache_hit, 'local_tax_address') else '',
                    'federalTaxWebsite': 'https://www.irs.gov',
                    'filingDeadlines': json.loads(cache_hit.filing_deadlines) if cache_hit.filing_deadlines else {}
                },
                'confidenceScore': cache_hit.confidence_score,
                'notes': 'Retrieved from cache',
                'source': 'cache'
            })
        
        # No cache hit - call Claude API with retry logic
        logger.info(f"Cache miss for {city}, {state_province}, {country} - calling Claude API")
        
        # Track API usage
        usage_record = TaxApiUsage.objects.create(
            tenant=request.user.tenant,
            api_type='suggestions',
            credits_used=1
        )
        
        # Initialize Claude client
        client = anthropic.Anthropic()
        
        # Prepare the prompt
        prompt = f"""You are a tax expert providing CURRENT 2024 tax rates for businesses.

Business Information:
- Type: {business_type}
- Location: {city}, {state_province}, {country}

Return ONLY valid JSON with the following structure (no other text):
{{
  "stateSalesTaxRate": 4.85,
  "localSalesTaxRate": 1.35,
  "totalSalesTaxRate": 6.2,
  "corporateIncomeTaxRate": 5.0,
  "hasProgressiveTax": false,
  "personalIncomeTaxBrackets": [],
  "flatPersonalIncomeTaxRate": 4.85,
  "healthInsuranceRate": 0,
  "healthInsuranceEmployerRate": 0,
  "socialSecurityRate": 6.2,
  "socialSecurityEmployerRate": 6.2,
  "federalPayrollTaxRate": 7.65,
  "statePayrollTaxRate": 0,
  "stateTaxWebsite": "https://tax.utah.gov",
  "stateTaxAddress": "210 N 1950 W, Salt Lake City, UT 84134",
  "localTaxWebsite": "",
  "localTaxAddress": "",
  "federalTaxWebsite": "https://www.irs.gov",
  "filingDeadlines": {{
    "salesTax": "Last day of the month following the reporting period",
    "incomeTax": "April 15",
    "payrollTax": "Quarterly",
    "corporateTax": "15th day of 4th month after year end"
  }},
  "confidenceScore": 95,
  "notes": "Utah has a flat state income tax rate"
}}"""

        # Try up to 3 times to get valid JSON
        tax_data = None
        last_error = None
        
        for attempt in range(1, 4):
            try:
                logger.info(f"Claude API attempt {attempt}/3")
                
                # Make the API call
                message = client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=1000,
                    temperature=0,
                    system="You are a tax expert. Return ONLY valid JSON, no other text.",
                    messages=[
                        {
                            "role": "user",
                            "content": prompt if attempt == 1 else f"Your previous response was not valid JSON. {prompt}"
                        }
                    ]
                )
                
                response_text = message.content[0].text
                logger.info(f"Claude response length: {len(response_text)}")
                
                # Try to extract and parse JSON
                import re
                json_match = re.search(r'\{[\s\S]*\}', response_text)
                if json_match:
                    json_str = json_match.group(0)
                    tax_data = json.loads(json_str)
                    
                    # Validate we got real data
                    if tax_data.get('stateSalesTaxRate', 0) > 0 or tax_data.get('totalSalesTaxRate', 0) > 0:
                        logger.info("Successfully parsed valid tax data from Claude")
                        break
                    else:
                        raise ValueError("All tax rates are zero")
                else:
                    raise ValueError("No JSON found in response")
                    
            except Exception as e:
                last_error = str(e)
                logger.error(f"Attempt {attempt} failed: {last_error}")
                if attempt < 3:
                    continue
        
        # If we got valid data, save to cache
        if tax_data and tax_data.get('totalSalesTaxRate', 0) > 0:
            # Save to cache
            cache_entry = TaxRateCache.objects.create(
                country=country,
                state_province=state_province,
                city=city,
                business_type=business_type,
                sales_tax_rate=Decimal(str(tax_data.get('totalSalesTaxRate', 0))),
                income_tax_rate=Decimal(str(tax_data.get('flatPersonalIncomeTaxRate', 0))),
                payroll_tax_rate=Decimal(str(tax_data.get('federalPayrollTaxRate', 0))),
                filing_website=tax_data.get('stateTaxWebsite', ''),
                filing_address=tax_data.get('stateTaxAddress', ''),
                filing_deadlines=json.dumps(tax_data.get('filingDeadlines', {})),
                confidence_score=tax_data.get('confidenceScore', 80),
                source='claude_api',
                expires_at=timezone.now() + timedelta(days=90)  # Cache for 90 days
            )
            logger.info(f"Saved tax data to cache for {city}, {state_province}")
            
            return Response({
                'suggestedRates': tax_data,
                'confidenceScore': tax_data.get('confidenceScore', 80),
                'notes': tax_data.get('notes', ''),
                'source': 'claude_api'
            })
        else:
            # Return fallback data
            logger.warning(f"Failed to get valid tax data after 3 attempts. Last error: {last_error}")
            return Response({
                'suggestedRates': {
                    'stateSalesTaxRate': 0,
                    'localSalesTaxRate': 0,
                    'totalSalesTaxRate': 0,
                    'corporateIncomeTaxRate': 0,
                    'hasProgressiveTax': False,
                    'personalIncomeTaxBrackets': [],
                    'flatPersonalIncomeTaxRate': 0,
                    'healthInsuranceRate': 0,
                    'healthInsuranceEmployerRate': 0,
                    'socialSecurityRate': 0,
                    'socialSecurityEmployerRate': 0,
                    'federalPayrollTaxRate': 0,
                    'statePayrollTaxRate': 0,
                    'stateTaxWebsite': '',
                    'stateTaxAddress': '',
                    'localTaxWebsite': '',
                    'localTaxAddress': '',
                    'federalTaxWebsite': 'https://www.irs.gov',
                    'filingDeadlines': {}
                },
                'confidenceScore': 0,
                'notes': 'Unable to retrieve tax information. Please enter manually.',
                'source': 'fallback'
            })
            
    except Exception as e:
        logger.error(f"Error in get_tax_suggestions: {str(e)}")
        return Response({
            'error': 'Internal server error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)