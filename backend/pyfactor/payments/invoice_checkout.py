"""
Invoice checkout with Stripe Connect and platform fees
"""
import stripe
import logging
from decimal import Decimal
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from sales.models import Invoice
from users.models import Business, UserProfile

logger = logging.getLogger(__name__)

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

@api_view(['POST'])
@csrf_exempt  # Public endpoint for customer payments
def create_invoice_checkout(request):
    """
    Create Stripe Checkout session for invoice payment with platform fees
    """
    try:
        # Get request data
        data = request.data
        invoice_id = data.get('invoice_id')
        success_url = data.get('success_url', f'{settings.FRONTEND_URL}/pay/success')
        cancel_url = data.get('cancel_url', f'{settings.FRONTEND_URL}/pay/cancelled')
        
        if not invoice_id:
            return Response(
                {'error': 'Invoice ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get invoice
        try:
            invoice = Invoice.objects.select_related('customer').get(id=invoice_id)
        except Invoice.DoesNotExist:
            return Response(
                {'error': 'Invoice not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get the business that owns this invoice through tenant relationship
        # Note: Invoice has tenant_id, we need to find the business associated with that tenant
        from custom_auth.models import Tenant
        try:
            tenant = Tenant.objects.get(id=invoice.tenant_id)
            business = Business.objects.get(owner_id=tenant.owner_id)
        except (Tenant.DoesNotExist, Business.DoesNotExist):
            return Response(
                {'error': 'Business not found for this invoice'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if business has Stripe Connect account set up
        if not business.stripe_account_id or not business.stripe_charges_enabled:
            return Response(
                {
                    'error': 'Payment processing not available',
                    'message': 'The business has not completed payment setup'
                }, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Calculate platform fee (2.5% + $0.30)
        invoice_amount = int(float(invoice.total_amount) * 100)  # Convert to cents
        platform_fee_percent = Decimal('0.025')  # 2.5%
        platform_fee_fixed = 30  # $0.30 in cents
        
        platform_fee_amount = int(float(invoice.total_amount) * float(platform_fee_percent) * 100) + platform_fee_fixed
        
        # Ensure platform fee doesn't exceed 90% of the payment (Stripe requirement)
        max_platform_fee = int(invoice_amount * 0.9)
        platform_fee_amount = min(platform_fee_amount, max_platform_fee)
        
        logger.info(f"Creating checkout for invoice {invoice_id}: amount=${invoice.total_amount}, platform_fee=${platform_fee_amount/100}")
        
        # Create Stripe Checkout Session with platform fee
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': f'Invoice #{invoice.invoice_num}',
                        'description': f'Payment for invoice from {business.name}',
                    },
                    'unit_amount': invoice_amount,
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=success_url + f'?invoice_id={invoice_id}&session_id={{CHECKOUT_SESSION_ID}}',
            cancel_url=cancel_url + f'?invoice_id={invoice_id}',
            customer_email=invoice.customer.email if invoice.customer else None,
            payment_intent_data={
                'application_fee_amount': platform_fee_amount,
                'transfer_data': {
                    'destination': business.stripe_account_id,
                },
                'metadata': {
                    'invoice_id': str(invoice_id),
                    'business_id': str(business.id),
                    'tenant_id': str(invoice.tenant_id),
                    'platform_fee_amount': str(platform_fee_amount),
                    'source': 'dott_invoice_payment'
                }
            },
            metadata={
                'invoice_id': str(invoice_id),
                'business_id': str(business.id),
                'tenant_id': str(invoice.tenant_id),
                'platform_fee_amount': str(platform_fee_amount),
                'source': 'dott_invoice_payment'
            },
            expires_at=int((invoice.created_at.timestamp() + 86400 * 30))  # 30 days from invoice creation
        )
        
        logger.info(f"Created Stripe checkout session {checkout_session.id} for invoice {invoice_id}")
        
        return Response({
            'url': checkout_session.url,
            'session_id': checkout_session.id,
            'invoice_amount': float(invoice.total_amount),
            'platform_fee': round(platform_fee_amount / 100, 2)
        }, status=status.HTTP_201_CREATED)
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating checkout session: {str(e)}")
        return Response(
            {'error': 'Payment processing error', 'details': str(e)}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Unexpected error creating checkout session: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_invoice_payment_link(request):
    """
    Create a shareable payment link for an invoice (for business users)
    """
    try:
        # Get request data
        data = request.data
        invoice_id = data.get('invoice_id')
        
        if not invoice_id:
            return Response(
                {'error': 'Invoice ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get user's business
        user_profile = UserProfile.objects.get(user=request.user)
        business = user_profile.business
        
        if not business:
            return Response(
                {'error': 'No business associated with user'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get invoice and verify it belongs to the user's business
        try:
            invoice = Invoice.objects.get(id=invoice_id, tenant_id=user_profile.tenant_id)
        except Invoice.DoesNotExist:
            return Response(
                {'error': 'Invoice not found or access denied'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Create payment link
        payment_link_url = f"{settings.FRONTEND_URL}/pay/{invoice_id}"
        
        return Response({
            'payment_url': payment_link_url,
            'invoice_number': invoice.invoice_num,
            'amount': float(invoice.total_amount),
            'customer_email': invoice.customer.email if invoice.customer else None
        }, status=status.HTTP_200_OK)
        
    except UserProfile.DoesNotExist:
        return Response(
            {'error': 'User profile not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Unexpected error creating payment link: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
def get_invoice_details(request, invoice_id):
    """
    Get invoice details for payment page (public endpoint)
    """
    try:
        # Get invoice
        try:
            invoice = Invoice.objects.select_related('customer').get(id=invoice_id)
        except Invoice.DoesNotExist:
            return Response(
                {'error': 'Invoice not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get business info through tenant
        from custom_auth.models import Tenant
        try:
            tenant = Tenant.objects.get(id=invoice.tenant_id)
            business = Business.objects.get(owner_id=tenant.owner_id)
        except (Tenant.DoesNotExist, Business.DoesNotExist):
            return Response(
                {'error': 'Business not found for this invoice'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if payment is available
        payment_available = bool(business.stripe_account_id and business.stripe_charges_enabled)
        
        return Response({
            'invoice_number': invoice.invoice_num,
            'amount': float(invoice.total_amount),
            'currency': 'USD',
            'status': invoice.status,
            'due_date': invoice.due_date.isoformat() if invoice.due_date else None,
            'created_date': invoice.created_at.isoformat(),
            'business_name': business.name,
            'customer_name': invoice.customer.name if invoice.customer else 'Customer',
            'customer_email': invoice.customer.email if invoice.customer else None,
            'description': f'Invoice #{invoice.invoice_num} from {business.name}',
            'payment_available': payment_available,
            'payment_setup_message': 'Payment processing is being set up' if not payment_available else None
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Unexpected error getting invoice details: {str(e)}")
        return Response(
            {'error': 'Internal server error'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )