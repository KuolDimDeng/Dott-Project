from django.shortcuts import render

# Create your views here.
#/Users/kuoldeng/projectx/backend/pyfactor/integrations/views.py
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required

from business.forms import BusinessRegistrationForm
from .models import Integration, WooCommerceIntegration
from .services.woocommerce import fetch_and_store_orders


@login_required
def setup_woocommerce(request):
    
    if request.method == 'POST':
        site_url = request.POST.get('site_url')
        consumer_key = request.POST.get('consumer_key')
        consumer_secret = request.POST.get('consumer_secret')

        integration = WooCommerceIntegration.objects.create(
            user_profile=request.user.profile,
            site_url=site_url,
            consumer_key=consumer_key,
            consumer_secret=consumer_secret
        )

        # Fetch initial data
        fetch_and_store_orders(integration.id)

        return redirect('dashboard')  # or wherever you want to redirect after setup

    return render(request, 'integrations/setup_woocommerce.html')

def business_registration(request):
    if request.method == 'POST':
        form = BusinessRegistrationForm(request.POST)
        if form.is_valid():
            business = form.save(commit=False)
            business.user = request.user
            business.save()

            # Check if the business type is e-commerce
            if business.business_type == 'ecommerce':
                # Redirect to e-commerce platform selection
                return redirect('ecommerce_platform_selection')
            
            return redirect('dashboard')  # or wherever you want to redirect after successful registration
    else:
        form = BusinessRegistrationForm()

    return render(request, 'business/registration.html', {'form': form})

def ecommerce_platform_selection(request):
    if request.method == 'POST':
        platform = request.POST.get('platform')
        if platform:
            Integration.objects.create(
                user_profile=request.user.profile,
                platform=platform,
                is_active=False  # Set to True when the integration is fully set up
            )
            return redirect('dashboard')  # or to a setup page for the chosen platform
    
    platforms = Integration.PLATFORM_CHOICES
    return render(request, 'business/ecommerce_platform_selection.html', {'platforms': platforms})