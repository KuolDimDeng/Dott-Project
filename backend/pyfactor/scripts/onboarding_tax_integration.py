"""
Example of how to integrate tax rate population into onboarding completion

This would be added to your onboarding completion endpoint/view
"""

from taxes.tasks import populate_tax_rates_for_country

def complete_onboarding(request):
    """
    Example onboarding completion handler
    Add this logic to your actual onboarding completion endpoint
    """
    
    # Your existing onboarding completion logic here...
    # user = request.user
    # user.onboarding_completed = True
    # user.save()
    
    # Get user's business country
    business_country = request.user.country  # or however you store it
    business_country_name = request.user.get_country_display()
    
    # Trigger background task to populate tax rates
    # This runs asynchronously and won't block the user
    populate_tax_rates_for_country.delay(
        country_code=business_country,
        country_name=business_country_name,
        tenant_id=request.user.tenant_id  # optional
    )
    
    # Return success - user goes to dashboard immediately
    # Tax rates will be populated in the background
    return JsonResponse({
        'success': True,
        'message': 'Onboarding completed successfully'
    })


# For existing users - run this as a management command
def populate_tax_rates_for_existing_users():
    """
    Management command to populate tax rates for all existing users
    Run once to backfill data
    """
    from django.contrib.auth import get_user_model
    from collections import defaultdict
    
    User = get_user_model()
    
    # Get unique countries from all users
    country_counts = defaultdict(int)
    countries_to_process = set()
    
    for user in User.objects.filter(onboarding_completed=True):
        if hasattr(user, 'country') and user.country:
            country_counts[user.country] += 1
            countries_to_process.add((user.country, user.get_country_display()))
    
    print(f"Found {len(countries_to_process)} unique countries to process")
    
    # Queue tax rate lookups for each unique country
    for country_code, country_name in countries_to_process:
        print(f"Queueing tax rate lookup for {country_name} "
              f"({country_counts[country_code]} users)")
        populate_tax_rates_for_country.delay(country_code, country_name)
    
    print("\nAll tax rate lookups queued. They will process in the background.")