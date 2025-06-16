#!/usr/bin/env python3
"""
Script: Version0010_add_payment_verification_endpoints.py
Purpose: Add payment verification endpoints to prevent users from accessing dashboard without payment
Created: 2025-06-16
"""

import os
import sys

# Add the project root to the Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, project_root)

def create_payment_pending_view():
    """Create view to mark payment as pending for paid tiers"""
    
    view_content = '''from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from onboarding.models import OnboardingProgress
from custom_auth.models import Tenant
import logging

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def payment_pending_view(request):
    """
    Mark payment as pending for paid tier users.
    This prevents them from accessing the dashboard until payment is complete.
    """
    try:
        user = request.user
        logger.info(f"[PaymentPending] Processing for user: {user.email}")
        
        # Get the selected plan
        selected_plan = request.data.get('selected_plan', 'free')
        billing_cycle = request.data.get('billing_cycle', 'monthly')
        
        # Only process for paid tiers
        if selected_plan == 'free':
            return Response({
                'status': 'skipped',
                'message': 'No payment required for free tier'
            })
        
        # Get or create onboarding progress
        tenant_id = getattr(user, 'tenant_id', None)
        if not tenant_id and hasattr(user, 'tenant'):
            tenant_id = user.tenant.id if user.tenant else None
            
        if not tenant_id:
            # Try to find tenant by owner_id
            try:
                tenant = Tenant.objects.filter(owner_id=str(user.id)).first()
                if tenant:
                    tenant_id = tenant.id
            except Exception as e:
                logger.error(f"[PaymentPending] Error finding tenant: {str(e)}")
        
        onboarding_progress, created = OnboardingProgress.objects.get_or_create(
            user=user,
            defaults={
                'tenant_id': tenant_id,
                'current_step': 'payment',
                'onboarding_status': 'payment',
                'selected_plan': selected_plan,
                'subscription_plan': selected_plan,
                'billing_cycle': billing_cycle
            }
        )
        
        # Update to payment pending status
        onboarding_progress.current_step = 'payment'
        onboarding_progress.onboarding_status = 'payment'
        onboarding_progress.payment_completed = False
        onboarding_progress.selected_plan = selected_plan
        onboarding_progress.subscription_plan = selected_plan
        onboarding_progress.billing_cycle = billing_cycle
        onboarding_progress.updated_at = timezone.now()
        
        # Mark payment step as the last active step
        onboarding_progress.last_active_step = 'payment'
        
        # Save changes
        onboarding_progress.save()
        
        logger.info(f"[PaymentPending] Marked payment pending for user {user.email}, plan: {selected_plan}")
        
        return Response({
            'status': 'success',
            'message': 'Payment marked as pending',
            'data': {
                'user_id': str(user.id),
                'selected_plan': selected_plan,
                'billing_cycle': billing_cycle,
                'current_step': 'payment',
                'payment_completed': False
            }
        })
        
    except Exception as e:
        logger.error(f"[PaymentPending] Error: {str(e)}")
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_payment_view(request):
    """
    Complete onboarding after payment verification for paid tiers.
    This is called after successful Stripe payment.
    """
    try:
        user = request.user
        logger.info(f"[CompletePayment] Processing for user: {user.email}")
        
        # Get payment details
        payment_intent_id = request.data.get('payment_intent_id')
        subscription_id = request.data.get('subscription_id')
        tenant_id = request.data.get('tenant_id')
        
        if not payment_intent_id and not subscription_id:
            return Response({
                'status': 'error',
                'message': 'Payment verification required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get onboarding progress
        try:
            onboarding_progress = OnboardingProgress.objects.get(user=user)
        except OnboardingProgress.DoesNotExist:
            return Response({
                'status': 'error',
                'message': 'Onboarding progress not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Update payment status
        onboarding_progress.payment_completed = True
        onboarding_progress.payment_id = payment_intent_id
        onboarding_progress.payment_method = 'stripe'
        onboarding_progress.payment_timestamp = timezone.now()
        onboarding_progress.subscription_status = 'active'
        
        # Mark onboarding as complete
        onboarding_progress.current_step = 'complete'
        onboarding_progress.onboarding_status = 'complete'
        onboarding_progress.completed_at = timezone.now()
        onboarding_progress.setup_completed = True
        onboarding_progress.setup_timestamp = timezone.now()
        
        # Ensure tenant_id is set
        if tenant_id:
            onboarding_progress.tenant_id = tenant_id
        
        # Save all changes
        onboarding_progress.save()
        
        # Update user's onboarding status
        if hasattr(user, 'needs_onboarding'):
            user.needs_onboarding = False
            user.save(update_fields=['needs_onboarding'])
        
        logger.info(f"[CompletePayment] Payment verified and onboarding completed for user {user.email}")
        
        return Response({
            'status': 'success',
            'message': 'Payment verified and onboarding completed',
            'data': {
                'user_id': str(user.id),
                'tenant_id': str(onboarding_progress.tenant_id) if onboarding_progress.tenant_id else None,
                'subscription_plan': onboarding_progress.subscription_plan,
                'payment_completed': True,
                'onboarding_completed': True
            }
        })
        
    except Exception as e:
        logger.error(f"[CompletePayment] Error: {str(e)}")
        return Response({
            'status': 'error',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
'''
    
    view_path = os.path.join(project_root, 'onboarding', 'api', 'payment_views.py')
    os.makedirs(os.path.dirname(view_path), exist_ok=True)
    
    with open(view_path, 'w') as f:
        f.write(view_content)
    
    print(f"Created payment views at: {view_path}")
    return view_path


def update_onboarding_urls():
    """Update onboarding URLs to include payment endpoints"""
    
    urls_path = os.path.join(project_root, 'onboarding', 'urls.py')
    
    # Read existing content
    with open(urls_path, 'r') as f:
        content = f.read()
    
    # Check if payment views are already imported
    if 'payment_views' not in content:
        # Add import after the existing imports
        import_line = "from .api.payment_views import payment_pending_view, complete_payment_view"
        
        # Find a good place to add the import (after other view imports)
        insert_pos = content.find('from .api.views.webhook_views import stripe_webhook')
        if insert_pos != -1:
            end_of_line = content.find('\n', insert_pos)
            content = content[:end_of_line+1] + import_line + '\n' + content[end_of_line+1:]
        
        # Add URL patterns before the closing bracket
        new_patterns = '''    
    # Payment verification endpoints
    path('payment-pending/', payment_pending_view, name='payment-pending'),
    path('complete-payment/', complete_payment_view, name='complete-payment'),'''
        
        # Find the closing bracket of urlpatterns
        closing_bracket = content.rfind(']')
        if closing_bracket != -1:
            # Insert before the closing bracket
            content = content[:closing_bracket] + new_patterns + '\n' + content[closing_bracket:]
    
    # Write updated content
    with open(urls_path, 'w') as f:
        f.write(content)
    
    print(f"Updated URLs at: {urls_path}")


def update_complete_onboarding_view():
    """Update the complete onboarding view to check payment status for paid tiers"""
    
    # First find the actual CompleteOnboardingView
    views_path = os.path.join(project_root, 'onboarding', 'views', 'views.py')
    
    # Read the file
    with open(views_path, 'r') as f:
        content = f.read()
    
    # Check if payment verification is already added
    if 'payment_verified' not in content:
        # Find the CompleteOnboardingView class
        class_start = content.find('class CompleteOnboardingView')
        if class_start != -1:
            # Find the post method within this class
            post_method_start = content.find('def post(', class_start)
            if post_method_start != -1:
                # Find where we mark onboarding complete
                mark_complete = content.find('mark_step_complete', post_method_start)
                if mark_complete == -1:
                    # Try finding another completion pattern
                    mark_complete = content.find('onboarding_status = "complete"', post_method_start)
                
                if mark_complete != -1:
                    # Find the line start for proper indentation
                    line_start = content.rfind('\n', 0, mark_complete) + 1
                    indent = len(content[line_start:mark_complete]) - len(content[line_start:mark_complete].lstrip())
                    indent_str = ' ' * indent
                    
                    # Insert payment check before marking complete
                    payment_check = f'''
{indent_str}# Check if payment is required and completed for paid tiers
{indent_str}selected_plan = request.data.get('selected_plan', 'free')
{indent_str}payment_verified = request.data.get('payment_verified', False)
{indent_str}
{indent_str}# For paid tiers, only complete if payment is verified
{indent_str}if selected_plan != 'free' and not payment_verified:
{indent_str}    logger.info(f"[CompleteOnboarding] Payment required for {{selected_plan}} plan")
{indent_str}    return Response({{
{indent_str}        'status': 'payment_required',
{indent_str}        'message': 'Payment verification required for paid tier',
{indent_str}        'data': {{
{indent_str}            'selected_plan': selected_plan,
{indent_str}            'current_step': 'payment'
{indent_str}        }}
{indent_str}    }}, status=status.HTTP_402_PAYMENT_REQUIRED)
{indent_str}
'''
                    # Insert the payment check
                    content = content[:line_start] + payment_check + content[line_start:]
    
    # Write updated content
    with open(views_path, 'w') as f:
        f.write(content)
    
    print(f"Updated CompleteOnboardingView at: {views_path}")


def main():
    """Main function to execute all updates"""
    print("Adding payment verification endpoints...")
    
    try:
        # Create payment views
        create_payment_pending_view()
        
        # Update URLs
        update_onboarding_urls()
        
        # Update complete onboarding view
        update_complete_onboarding_view()
        
        print("\n✅ Successfully added payment verification endpoints!")
        print("\nNext steps:")
        print("1. Run migrations if needed: python manage.py migrate")
        print("2. Restart the Django development server")
        print("3. Test the payment flow with paid tiers")
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()