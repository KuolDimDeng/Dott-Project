"""
Payment API endpoints for processing invoice and vendor payments
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import transaction as db_transaction
from .stripe_payment_service import StripePaymentService
from .stripe_fees import format_fee_for_display
from .models import InvoicePayment, VendorPayment
from sales.models import Invoice
from purchases.models import Vendor
from pyfactor.logging_config import get_logger
import json

logger = get_logger()


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_invoice_payment_intent(request):
    """
    Create a payment intent for a customer to pay an invoice
    
    Expected data:
    {
        "invoice_id": "uuid",
        "save_payment_method": boolean (optional)
    }
    """
    try:
        invoice_id = request.data.get('invoice_id')
        if not invoice_id:
            return Response(
                {'error': 'invoice_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get invoice
        try:
            invoice = Invoice.objects.get(
                id=invoice_id,
                business_id=request.user.business_id
            )
        except Invoice.DoesNotExist:
            return Response(
                {'error': 'Invoice not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if invoice is already paid
        if invoice.status == 'paid':
            return Response(
                {'error': 'Invoice is already paid'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get business's Stripe account (if they have one)
        # For now, we'll use the platform account
        connected_account_id = getattr(request.user, 'stripe_account_id', None)
        
        # Create payment intent
        result = StripePaymentService.create_invoice_payment_intent(
            invoice,
            connected_account_id
        )
        
        if result['success']:
            # Save payment intent ID to invoice
            invoice.stripe_payment_intent_id = result['payment_intent_id']
            invoice.save(update_fields=['stripe_payment_intent_id'])
            
            logger.info(f"[API] Created payment intent for invoice {invoice.invoice_number}")
            
            return Response({
                'success': True,
                'payment_intent_id': result['payment_intent_id'],
                'client_secret': result['client_secret'],
                'fee_breakdown': result['fee_breakdown'],
                'invoice': {
                    'id': str(invoice.id),
                    'number': invoice.invoice_number,
                    'amount': float(invoice.amount),
                    'currency': invoice.currency
                }
            })
        else:
            return Response(
                {
                    'success': False,
                    'error': result['error'],
                    'error_type': result.get('error_type', 'unknown')
                },
                status=status.HTTP_400_BAD_REQUEST
            )
            
    except Exception as e:
        logger.error(f"[API] Error creating payment intent: {str(e)}")
        return Response(
            {'error': 'Failed to create payment'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def confirm_invoice_payment(request):
    """
    Confirm that an invoice payment was completed
    
    Expected data:
    {
        "payment_intent_id": "pi_xxx",
        "invoice_id": "uuid"
    }
    """
    try:
        payment_intent_id = request.data.get('payment_intent_id')
        invoice_id = request.data.get('invoice_id')
        
        if not payment_intent_id or not invoice_id:
            return Response(
                {'error': 'payment_intent_id and invoice_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get invoice
        try:
            invoice = Invoice.objects.get(
                id=invoice_id,
                business_id=request.user.business_id
            )
        except Invoice.DoesNotExist:
            return Response(
                {'error': 'Invoice not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check payment status
        payment_status = StripePaymentService.get_payment_status(payment_intent_id)
        
        if not payment_status['success']:
            return Response(
                {'error': 'Failed to verify payment'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if payment_status['status'] == 'succeeded':
            with db_transaction.atomic():
                # Update invoice status
                invoice.status = 'paid'
                invoice.save(update_fields=['status'])
                
                # Record payment
                payment = InvoicePayment.objects.create(
                    invoice=invoice,
                    amount=payment_status['amount'] / 100,  # Convert from cents
                    payment_method='stripe',
                    stripe_payment_intent_id=payment_intent_id,
                    metadata=payment_status['metadata']
                )
                
                logger.info(f"[API] Confirmed payment for invoice {invoice.invoice_number}")
                
                return Response({
                    'success': True,
                    'message': 'Payment confirmed',
                    'payment': {
                        'id': str(payment.id),
                        'amount': float(payment.amount),
                        'created_at': payment.created_at
                    }
                })
        else:
            return Response({
                'success': False,
                'message': f'Payment not completed. Status: {payment_status["status"]}'
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        logger.error(f"[API] Error confirming payment: {str(e)}")
        return Response(
            {'error': 'Failed to confirm payment'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def calculate_payment_fees(request):
    """
    Calculate fees for a payment amount
    
    Expected data:
    {
        "amount": 100.00,
        "payment_type": "invoice_payment" or "vendor_payment"
    }
    """
    try:
        amount = request.data.get('amount')
        payment_type = request.data.get('payment_type', 'invoice_payment')
        
        if not amount:
            return Response(
                {'error': 'amount is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Convert to cents
        amount_cents = int(float(amount) * 100)
        
        # Get formatted fee display
        fee_display = format_fee_for_display(amount_cents, payment_type)
        
        return Response({
            'success': True,
            'fees': fee_display,
            'amount_cents': amount_cents
        })
        
    except Exception as e:
        logger.error(f"[API] Error calculating fees: {str(e)}")
        return Response(
            {'error': 'Failed to calculate fees'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_vendor_payment(request):
    """
    Create a payment to a vendor/supplier
    
    Expected data:
    {
        "vendor_id": "uuid",
        "amount": 100.00,
        "invoice_number": "VEN-001",
        "description": "Payment for services"
    }
    """
    try:
        vendor_id = request.data.get('vendor_id')
        amount = request.data.get('amount')
        
        if not vendor_id or not amount:
            return Response(
                {'error': 'vendor_id and amount are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get vendor
        try:
            vendor = Vendor.objects.get(
                id=vendor_id,
                business_id=request.user.business_id
            )
        except Vendor.DoesNotExist:
            return Response(
                {'error': 'Vendor not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Prepare payment data
        payment_data = {
            'amount': float(amount),
            'vendor_id': str(vendor.id),
            'vendor_name': vendor.name,
            'vendor_stripe_account': getattr(vendor, 'stripe_account_id', None),
            'invoice_number': request.data.get('invoice_number', ''),
            'business_id': request.user.business_id,
            'currency': request.data.get('currency', 'usd'),
            'payment_source': request.data.get('payment_source')  # Payment method ID
        }
        
        # Get business's Stripe account
        connected_account_id = getattr(request.user, 'stripe_account_id', None)
        
        # Process payment
        result = StripePaymentService.create_vendor_payment(
            payment_data,
            connected_account_id
        )
        
        if result['success']:
            # Record payment
            with db_transaction.atomic():
                payment = VendorPayment.objects.create(
                    vendor=vendor,
                    business_id=request.user.business_id,
                    amount=float(amount),
                    stripe_charge_id=result['charge_id'],
                    stripe_transfer_id=result.get('transfer_id'),
                    invoice_number=request.data.get('invoice_number', ''),
                    description=request.data.get('description', ''),
                    status='completed'
                )
                
                logger.info(f"[API] Created vendor payment {payment.id}")
                
                return Response({
                    'success': True,
                    'payment': {
                        'id': str(payment.id),
                        'amount': float(payment.amount),
                        'vendor': vendor.name,
                        'charge_id': result['charge_id'],
                        'fee_breakdown': result['fee_breakdown']
                    }
                })
        else:
            return Response(
                {
                    'success': False,
                    'error': result['error'],
                    'error_type': result.get('error_type', 'unknown')
                },
                status=status.HTTP_400_BAD_REQUEST
            )
            
    except Exception as e:
        logger.error(f"[API] Error creating vendor payment: {str(e)}")
        return Response(
            {'error': 'Failed to create payment'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )