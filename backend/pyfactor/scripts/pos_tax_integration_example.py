"""
Example of how POS would fetch and use the AI-populated tax rates
This would be added to your POS initialization
"""

# In your POS component or API endpoint:

def get_estimated_tax_rate(country_code, region_code=None):
    """
    Fetch the AI-estimated tax rate for a given location
    Returns rate as decimal (0.15 = 15%)
    """
    from taxes.models import GlobalSalesTaxRate
    
    try:
        # Try to find the most specific rate first
        if region_code:
            rate = GlobalSalesTaxRate.objects.filter(
                country=country_code,
                region_code=region_code,
                is_current=True
            ).first()
            if rate:
                return {
                    'rate': float(rate.rate),
                    'type': rate.tax_type,
                    'confidence': float(rate.ai_confidence_score) if rate.ai_confidence_score else 0,
                    'notes': rate.ai_source_notes,
                    'is_estimate': True
                }
        
        # Fall back to country-level rate
        rate = GlobalSalesTaxRate.objects.filter(
            country=country_code,
            region_code='',
            is_current=True
        ).first()
        
        if rate:
            return {
                'rate': float(rate.rate),
                'type': rate.tax_type,
                'confidence': float(rate.ai_confidence_score) if rate.ai_confidence_score else 0,
                'notes': rate.ai_source_notes,
                'is_estimate': True
            }
    
    except Exception as e:
        print(f"Error fetching tax rate: {e}")
    
    # Default to 0% if no rate found
    return {
        'rate': 0.0,
        'type': 'unknown',
        'confidence': 0,
        'notes': 'No tax rate found - please set manually',
        'is_estimate': True
    }


# In your POS initialization API endpoint:
def pos_init(request):
    """
    Initialize POS with user's business location tax rate
    """
    user = request.user
    business_country = user.country or 'US'  # Default to US
    business_state = getattr(user, 'state', None)
    
    # Get estimated tax rate
    tax_info = get_estimated_tax_rate(business_country, business_state)
    
    return JsonResponse({
        'business': {
            'name': user.business_name,
            'country': business_country,
            'state': business_state,
        },
        'tax': {
            'estimated_rate': tax_info['rate'] * 100,  # Convert to percentage
            'tax_type': tax_info['type'],
            'is_estimate': True,
            'disclaimer': 'This is an AI-estimated tax rate. Please verify with local regulations.',
            'confidence': tax_info['confidence'],
            'notes': tax_info['notes']
        },
        'settings': {
            'allow_tax_override': True,  # User can always change the rate
            'show_tax_disclaimer': True,
        }
    })


# Frontend POS component would use it like:
"""
// In POSSystemInline.js
useEffect(() => {
    const initializePOS = async () => {
        const response = await fetch('/api/pos/init');
        const data = await response.json();
        
        // Set the estimated tax rate
        if (data.tax && data.tax.estimated_rate !== undefined) {
            setTaxRate(data.tax.estimated_rate);
            
            // Show a toast notification about the estimate
            if (data.tax.is_estimate) {
                toast.info(
                    `Tax rate set to ${data.tax.estimated_rate}% based on ${data.business.country}. ` +
                    `This is an estimate - please verify.`,
                    { duration: 5000 }
                );
            }
        }
    };
    
    initializePOS();
}, []);
"""