"""
POS Transaction Completion Views
Handles complete transaction recording with SMS receipts and double-entry bookkeeping
"""

from django.db import transaction as db_transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from decimal import Decimal
import logging
import json

from sales.models import POSTransaction, POSTransactionItem
from sales.services.accounting_service import AccountingService
from custom_auth.sms_service import SMSService
from finance.models import JournalEntry, JournalEntryLine
from inventory.models import Product
from users.models import UserProfile

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@db_transaction.atomic
def complete_pos_transaction(request):
    """
    Complete POS transaction with:
    1. Transaction recording
    2. Double-entry bookkeeping
    3. SMS receipt sending (optional)
    4. Inventory update
    """
    try:
        data = request.data
        user = request.user
        
        # Get tenant ID from current context
        from custom_auth.rls import get_current_tenant_id
        tenant_id = get_current_tenant_id()
        
        # Create POS Transaction
        transaction_obj = POSTransaction.objects.create(
            tenant_id=tenant_id,
            transaction_type=data.get('transaction_type', 'quick_sale'),
            payment_method=data.get('payment_method', 'cash'),
            payment_gateway=data.get('payment_gateway'),
            subtotal=Decimal(data.get('subtotal', 0)),
            tax_amount=Decimal(data.get('tax_amount', 0)),
            total_amount=Decimal(data.get('total_amount', 0)),
            currency=data.get('currency', 'USD'),
            cashier=user,
            customer_phone=data.get('customer_phone'),
            metadata=data.get('metadata', {}),
            payment_details=data.get('payment_details', {}),
            status='completed',
        )
        
        # Create transaction items
        items = data.get('items', [])
        for item in items:
            item_obj = POSTransactionItem.objects.create(
                tenant_id=tenant_id,
                transaction=transaction_obj,
                item_name=item.get('item_name'),
                product_id=item.get('product_id') if item.get('product_id') else None,
                quantity=Decimal(item.get('quantity', 1)),
                unit_price=Decimal(item.get('unit_price', 0)),
                total_price=Decimal(item.get('total_price', 0)),
                tax_amount=Decimal(item.get('tax_amount', 0)),
            )
            
            # Update inventory if product exists
            if item.get('product_id'):
                try:
                    product = Product.objects.get(
                        id=item.get('product_id'),
                        tenant_id=tenant_id
                    )
                    # Reduce stock
                    if hasattr(product, 'quantity_on_hand'):
                        product.quantity_on_hand -= Decimal(item.get('quantity', 1))
                        product.save()
                except Product.DoesNotExist:
                    logger.warning(f"Product {item.get('product_id')} not found for inventory update")
        
        # Create journal entries for double-entry bookkeeping
        try:
            accounting_service = AccountingService()
            journal_entry = accounting_service.create_pos_sale_entry(
                transaction=transaction_obj,
                payment_method=data.get('payment_method'),
                tenant_id=tenant_id,
            )
            logger.info(f"Journal entry created: {journal_entry.id}")
        except Exception as e:
            logger.error(f"Failed to create journal entries: {str(e)}")
            # Continue even if accounting fails - transaction is still valid
        
        # Send SMS receipt if requested
        if data.get('send_sms_receipt') and data.get('customer_phone'):
            try:
                send_sms_receipt(
                    transaction_obj,
                    data.get('customer_phone')
                )
            except Exception as e:
                logger.error(f"Failed to send SMS receipt: {str(e)}")
                # Continue even if SMS fails
        
        return Response({
            'success': True,
            'transaction_id': str(transaction_obj.id),
            'transaction_number': transaction_obj.transaction_number,
            'message': 'Transaction completed successfully',
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"POS transaction completion error: {str(e)}")
        return Response({
            'success': False,
            'message': f'Transaction failed: {str(e)}',
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_pos_receipt(request):
    """
    Send SMS receipt for a completed transaction
    """
    try:
        transaction_id = request.data.get('transaction_id')
        phone_number = request.data.get('phone_number')
        
        if not transaction_id or not phone_number:
            return Response({
                'success': False,
                'message': 'Transaction ID and phone number are required',
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get transaction
        from custom_auth.rls import get_current_tenant_id
        tenant_id = get_current_tenant_id()
        
        transaction_obj = POSTransaction.objects.get(
            id=transaction_id,
            tenant_id=tenant_id
        )
        
        # Send SMS receipt
        success = send_sms_receipt(transaction_obj, phone_number)
        
        if success:
            # Update transaction with customer phone
            transaction_obj.customer_phone = phone_number
            transaction_obj.save()
            
            return Response({
                'success': True,
                'message': 'Receipt sent successfully',
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'success': False,
                'message': 'Failed to send receipt',
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except POSTransaction.DoesNotExist:
        return Response({
            'success': False,
            'message': 'Transaction not found',
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Receipt sending error: {str(e)}")
        return Response({
            'success': False,
            'message': f'Error: {str(e)}',
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def send_sms_receipt(transaction, phone_number):
    """
    Send SMS receipt for a transaction
    """
    try:
        # Get business details
        try:
            from users.models import BusinessDetails
            business = BusinessDetails.objects.filter(
                tenant_id=transaction.tenant_id
            ).first()
            business_name = business.business_name if business else "Business"
        except:
            business_name = "Business"
        
        # Format receipt message
        items_text = "\n".join([
            f"- {item.item_name} x{item.quantity}: {transaction.currency}{item.total_price}"
            for item in transaction.items.all()[:3]  # Limit to 3 items for SMS length
        ])
        
        if transaction.items.count() > 3:
            items_text += f"\n... and {transaction.items.count() - 3} more items"
        
        message = f"""
{business_name} Receipt
Transaction: {transaction.transaction_number}
Date: {transaction.created_at.strftime('%Y-%m-%d %H:%M')}

Items:
{items_text}

Subtotal: {transaction.currency}{transaction.subtotal}
Tax: {transaction.currency}{transaction.tax_amount}
Total: {transaction.currency}{transaction.total_amount}

Payment: {transaction.get_payment_method_display()}
Status: Paid

Thank you for your business!
        """.strip()
        
        # Send SMS
        sms_service = SMSService()
        success, response = sms_service.send_sms(phone_number, message)
        
        if success:
            logger.info(f"SMS receipt sent to {phone_number} for transaction {transaction.id}")
        else:
            logger.error(f"Failed to send SMS receipt: {response}")
        
        return success
        
    except Exception as e:
        logger.error(f"SMS receipt error: {str(e)}")
        return False


# Extension for AccountingService to handle POS transactions
def create_pos_sale_entry(self, transaction, payment_method, tenant_id):
    """
    Create journal entries for a POS sale transaction
    Implements double-entry bookkeeping
    """
    try:
        # Create journal entry
        journal_entry = JournalEntry.objects.create(
            tenant_id=tenant_id,
            date=timezone.now().date(),
            description=f"POS Sale - {transaction.transaction_number}",
            entry_type='sale',
            reference_number=transaction.transaction_number,
            created_by=transaction.cashier,
        )
        
        # Determine accounts based on payment method
        if payment_method == 'cash':
            debit_account = self.get_or_create_account('cash')
        elif payment_method == 'card':
            debit_account = self.get_or_create_account('accounts_receivable')
        elif payment_method == 'mobile_money':
            debit_account = self.get_or_create_account('accounts_receivable')
        else:
            debit_account = self.get_or_create_account('cash')
        
        sales_account = self.get_or_create_account('sales_revenue')
        tax_account = self.get_or_create_account('sales_tax_payable')
        
        # Debit: Cash/AR account for total amount
        JournalEntryLine.objects.create(
            tenant_id=tenant_id,
            journal_entry=journal_entry,
            account=debit_account,
            description=f"Payment received - {payment_method}",
            debit=transaction.total_amount,
            credit=Decimal('0.00'),
        )
        
        # Credit: Sales Revenue for subtotal
        JournalEntryLine.objects.create(
            tenant_id=tenant_id,
            journal_entry=journal_entry,
            account=sales_account,
            description="Sales revenue",
            debit=Decimal('0.00'),
            credit=transaction.subtotal,
        )
        
        # Credit: Sales Tax Payable for tax amount
        if transaction.tax_amount > 0:
            JournalEntryLine.objects.create(
                tenant_id=tenant_id,
                journal_entry=journal_entry,
                account=tax_account,
                description="Sales tax collected",
                debit=Decimal('0.00'),
                credit=transaction.tax_amount,
            )
        
        # If tracking inventory, add COGS entries
        if transaction.items.filter(product__isnull=False).exists():
            cogs_account = self.get_or_create_account('cost_of_goods_sold')
            inventory_account = self.get_or_create_account('inventory')
            
            total_cost = Decimal('0.00')
            for item in transaction.items.filter(product__isnull=False):
                if hasattr(item.product, 'cost_price') and item.product.cost_price:
                    total_cost += item.product.cost_price * item.quantity
            
            if total_cost > 0:
                # Debit: COGS
                JournalEntryLine.objects.create(
                    tenant_id=tenant_id,
                    journal_entry=journal_entry,
                    account=cogs_account,
                    description="Cost of goods sold",
                    debit=total_cost,
                    credit=Decimal('0.00'),
                )
                
                # Credit: Inventory
                JournalEntryLine.objects.create(
                    tenant_id=tenant_id,
                    journal_entry=journal_entry,
                    account=inventory_account,
                    description="Inventory reduction",
                    debit=Decimal('0.00'),
                    credit=total_cost,
                )
        
        return journal_entry
        
    except Exception as e:
        logger.error(f"Failed to create journal entries: {str(e)}")
        raise


# Monkey patch the AccountingService to add POS support
AccountingService.create_pos_sale_entry = create_pos_sale_entry