"""
Example of how to integrate tax rate population into user onboarding

Add this to your onboarding completion view/endpoint
"""

from taxes.tasks import populate_tax_rates_for_country
import logging

logger = logging.getLogger(__name__)


def trigger_tax_rate_lookup(user):
    """
    Call this function when a user completes onboarding
    It will trigger a background task to fetch their country's tax rate
    """
    
    # Get user's business country
    if not hasattr(user, 'country') or not user.country:
        logger.warning(f"[Tax Rate Hook] User {user.email} has no country set")
        return
    
    country_code = user.country
    country_name = user.get_country_display() if hasattr(user, 'get_country_display') else str(country_code)
    
    logger.info(f"[Tax Rate Hook] Triggering tax rate lookup for {user.email} - Country: {country_name} ({country_code})")
    
    # Trigger background task
    try:
        populate_tax_rates_for_country.delay(
            country_code=str(country_code),
            country_name=country_name,
            tenant_id=getattr(user, 'tenant_id', None)
        )
        logger.info(f"[Tax Rate Hook] Successfully queued tax rate lookup for {country_name}")
    except Exception as e:
        logger.error(f"[Tax Rate Hook] Failed to queue tax rate lookup: {str(e)}")


# Example usage in your onboarding view:
"""
from scripts.onboarding_tax_hook import trigger_tax_rate_lookup

class CompleteOnboardingView(APIView):
    def post(self, request):
        # Your existing onboarding logic...
        user = request.user
        user.onboarding_completed = True
        user.save()
        
        # Trigger tax rate lookup in background
        trigger_tax_rate_lookup(user)
        
        return Response({'success': True})
"""