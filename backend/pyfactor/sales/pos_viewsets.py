"""
POS ViewSets for Point of Sale operations.
Handles complete sales, refunds, and transaction management.
"""

from decimal import Decimal
from django.db import transaction as db_transaction
from django.utils import timezone
from rest_framework import viewsets, status
from custom_auth.tenant_base_viewset import TenantIsolatedViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import ValidationError
from django.shortcuts import get_object_or_404

from .models import POSTransaction, POSTransactionItem, POSRefund, POSRefundItem
from .serializers import (
    POSTransactionCreateSerializer, POSTransactionListSerializer, 
    POSTransactionDetailSerializer, POSRefundCreateSerializer,
    POSRefundListSerializer, POSSaleCompletionSerializer
)
from .services.inventory_service import InventoryService
from .services.accounting_service import AccountingService
from .services.tax_service import TaxService
from custom_auth.models import TenantManager
from users.models import BusinessSettings, UserProfile
from pyfactor.logging_config import get_logger

logger = get_logger()


class POSTransactionViewSet(TenantIsolatedViewSet):
    """
    ViewSet for POS transactions with comprehensive sale processing.
    """
    permission_classes = [IsAuthenticated]
    
    # Use tenant-aware manager
    def get_queryset(self):
        return POSTransaction.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'list':
            return POSTransactionListSerializer
        elif self.action == 'retrieve':
            return POSTransactionDetailSerializer
        elif self.action == 'complete_sale':
            return POSSaleCompletionSerializer
        else:
            return POSTransactionCreateSerializer
    
    @action(detail=False, methods=['post'], url_path='complete-sale')
    def complete_sale(self, request):
        """
        Complete POS sale endpoint that handles:
        1. Transaction creation
        2. Inventory reduction
        3. Accounting journal entries
        4. Low stock alerts
        
        Expected payload:
        {
            "customer_id": "uuid-optional",
            "items": [
                {
                    "id": "product-or-service-uuid",
                    "type": "product|service",
                    "quantity": 2,
                    "unit_price": 15.99
                }
            ],
            "payment_method": "cash|card|mobile_money|bank_transfer|check|store_credit",
            "amount_tendered": 50.00,
            "discount_percentage": 5.0,
            "tax_rate": 8.5,
            "use_shipping_address": true,
            "notes": "Optional notes"
        }
        """
        try:
            # Validate input data
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            validated_data = serializer.validated_data
            items = validated_data['items']
            customer = validated_data.get('customer_id')
            payment_method = validated_data['payment_method']
            amount_tendered = validated_data.get('amount_tendered')
            discount_percentage = validated_data.get('discount_percentage', Decimal('0'))
            manual_tax_rate = validated_data.get('tax_rate')  # Keep for backward compatibility
            use_shipping_address = validated_data.get('use_shipping_address', True)
            notes = validated_data.get('notes', '')
            
            with db_transaction.atomic():
                # Step 1: Validate stock availability
                logger.info(f"Starting POS sale completion for {len(items)} items")
                InventoryService.validate_stock_availability(items)
                
                # Step 2: Get business settings and user profile
                business_settings = BusinessSettings.objects.filter(
                    tenant_id=request.user.tenant_id
                ).first()
                
                user_profile = UserProfile.objects.filter(
                    user=request.user
                ).first()
                
                # Step 3: Calculate subtotal and discount
                subtotal = sum(item['quantity'] * item['unit_price'] for item in items)
                discount_amount = subtotal * discount_percentage / 100
                after_discount = subtotal - discount_amount
                
                # Step 4: Calculate tax using destination-based taxation
                if manual_tax_rate is not None:
                    # Use manual tax rate if provided (backward compatibility)
                    tax_total = after_discount * manual_tax_rate / 100
                    tax_calculation = {
                        'total_tax_amount': tax_total,
                        'tax_rate': manual_tax_rate,
                        'tax_jurisdiction': {},
                        'tax_calculation_method': 'manual',
                        'line_items': []
                    }
                else:
                    # Use the tax service for destination-based taxation
                    tax_calculation = TaxService.calculate_transaction_tax(
                        customer=customer,
                        items=items,
                        business_settings=business_settings,
                        user_profile=user_profile,
                        use_shipping_address=use_shipping_address
                    )
                    tax_total = tax_calculation['total_tax_amount']
                
                total_amount = after_discount + tax_total
                
                # Calculate change for cash payments
                change_due = Decimal('0')
                if payment_method == 'cash' and amount_tendered:
                    change_due = max(Decimal('0'), amount_tendered - total_amount)
                
                # Get user's currency preference
                currency_code = 'USD'  # Default
                currency_symbol = '$'  # Default
                try:
                    from users.models import UserProfile
                    user_profile = UserProfile.objects.filter(user=request.user).first()
                    if user_profile and user_profile.preferred_currency_code:
                        currency_code = user_profile.preferred_currency_code
                        currency_symbol = user_profile.preferred_currency_symbol or '$'
                except Exception as e:
                    logger.warning(f"Could not get user currency preference: {e}")
                
                # Step 5: Create POS transaction with tax jurisdiction info
                pos_transaction = POSTransaction.objects.create(
                    tenant_id=request.user.tenant_id,  # CRITICAL: Explicitly set tenant_id
                    customer=customer,
                    subtotal=subtotal,
                    discount_amount=discount_amount,
                    discount_percentage=discount_percentage,
                    tax_total=tax_total,
                    total_amount=total_amount,
                    payment_method=payment_method,
                    amount_tendered=amount_tendered,
                    change_due=change_due,
                    status='completed',
                    notes=notes,
                    created_by=request.user,
                    # Currency information
                    currency_code=currency_code,
                    currency_symbol=currency_symbol,
                    # New tax jurisdiction fields
                    tax_jurisdiction=tax_calculation.get('tax_jurisdiction', {}),
                    tax_calculation_method=tax_calculation.get('tax_calculation_method', 'manual'),
                    shipping_address_used=use_shipping_address if customer else False
                )
                
                logger.info(f"Created POS transaction {pos_transaction.transaction_number}")
                
                # Step 6: Create transaction items and collect cost data
                items_with_cost = []
                
                # Get line item tax details from calculation
                line_item_taxes = {
                    item['item_name']: item 
                    for item in tax_calculation.get('line_items', [])
                }
                
                for idx, item_data in enumerate(items):
                    item_obj = item_data['item']
                    quantity = item_data['quantity']
                    unit_price = item_data['unit_price']
                    
                    # Get tax info for this specific item
                    line_tax_info = line_item_taxes.get(item_obj.name, {})
                    
                    # Use calculated tax or fall back to proportional calculation
                    if line_tax_info:
                        item_tax = line_tax_info.get('tax_amount', Decimal('0'))
                        item_tax_rate = line_tax_info.get('tax_rate', Decimal('0'))
                    else:
                        # Fallback: Calculate tax for this item (proportional)
                        item_subtotal = quantity * unit_price
                        item_discount = item_subtotal * discount_percentage / 100
                        item_after_discount = item_subtotal - item_discount
                        # Use the effective tax rate from the total calculation
                        effective_rate = tax_calculation.get('tax_rate', Decimal('0'))
                        item_tax = item_after_discount * effective_rate / 100
                        item_tax_rate = effective_rate
                    
                    # Create transaction item
                    if item_data['type'] == 'product':
                        cost_price = getattr(item_obj, 'cost', Decimal('0'))
                        transaction_item = POSTransactionItem.objects.create(
                            transaction=pos_transaction,
                            product=item_obj,
                            item_name=item_obj.name,
                            item_sku=getattr(item_obj, 'sku', ''),
                            quantity=quantity,
                            unit_price=unit_price,
                            line_discount_percentage=discount_percentage,
                            tax_rate=item_tax_rate,
                            tax_amount=item_tax,
                            cost_price=cost_price
                        )
                        
                        # Add cost data for accounting
                        items_with_cost.append({
                            'type': 'product',
                            'item': item_obj,
                            'quantity': quantity,
                            'unit_price': unit_price,
                            'cost_price': cost_price,
                            'tax_amount': item_tax
                        })
                    else:  # service
                        transaction_item = POSTransactionItem.objects.create(
                            transaction=pos_transaction,
                            service=item_obj,
                            item_name=item_obj.name,
                            item_sku=getattr(item_obj, 'service_code', ''),
                            quantity=quantity,
                            unit_price=unit_price,
                            line_discount_percentage=discount_percentage,
                            tax_rate=item_tax_rate,
                            tax_amount=item_tax
                        )
                        
                        items_with_cost.append({
                            'type': 'service',
                            'item': item_obj,
                            'quantity': quantity,
                            'unit_price': unit_price,
                            'tax_amount': item_tax
                        })
                
                # Step 5: Reduce inventory for products
                logger.info("Reducing inventory for products")
                updated_products = InventoryService.reduce_stock(
                    items, 
                    transaction_ref=pos_transaction.transaction_number
                )
                
                # Step 6: Create accounting journal entries
                logger.info("Creating accounting journal entries")
                journal_entry = AccountingService.create_sale_journal_entry(
                    pos_transaction,
                    items_with_cost
                )
                
                # Link journal entry to transaction
                pos_transaction.journal_entry = journal_entry
                pos_transaction.save()
                
                # Step 7: Check for low stock alerts
                low_stock_alerts = InventoryService.check_low_stock_alerts(items)
                
                # Step 8: Prepare response data
                response_data = {
                    'transaction': {
                        'id': str(pos_transaction.id),
                        'transaction_number': pos_transaction.transaction_number,
                        'subtotal': str(pos_transaction.subtotal),
                        'discount_amount': str(pos_transaction.discount_amount),
                        'tax_total': str(pos_transaction.tax_total),
                        'total_amount': str(pos_transaction.total_amount),
                        'payment_method': pos_transaction.payment_method,
                        'amount_tendered': str(pos_transaction.amount_tendered) if pos_transaction.amount_tendered else None,
                        'change_due': str(pos_transaction.change_due),
                        'status': pos_transaction.status,
                        'created_at': pos_transaction.created_at.isoformat(),
                        'customer_name': pos_transaction.customer.business_name if pos_transaction.customer else None,
                        'tax_calculation_method': pos_transaction.tax_calculation_method,
                        'tax_jurisdiction': pos_transaction.tax_jurisdiction
                    },
                    'items': [
                        {
                            'name': item.item_name,
                            'sku': item.item_sku,
                            'quantity': str(item.quantity),
                            'unit_price': str(item.unit_price),
                            'line_total': str(item.line_total),
                            'tax_amount': str(item.tax_amount)
                        }
                        for item in pos_transaction.items.all()
                    ],
                    'inventory_updates': updated_products,
                    'low_stock_alerts': low_stock_alerts,
                    'accounting': {
                        'journal_entry_id': str(journal_entry.id),
                        'status': 'posted'
                    }
                }
                
                logger.info(f"Successfully completed POS sale {pos_transaction.transaction_number}")
                return Response(response_data, status=status.HTTP_201_CREATED)
                
        except ValidationError as e:
            logger.error(f"Validation error in POS sale: {str(e)}")
            return Response(
                {'error': 'Validation failed', 'details': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Unexpected error in POS sale: {str(e)}")
            return Response(
                {'error': 'Internal server error', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'], url_path='void')
    def void_transaction(self, request, pk=None):
        """
        Void a POS transaction.
        This will:
        1. Restore inventory
        2. Create reverse accounting entries
        3. Update transaction status
        """
        try:
            pos_transaction = self.get_object()
            
            if pos_transaction.status != 'completed':
                return Response(
                    {'error': 'Only completed transactions can be voided'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            void_reason = request.data.get('reason', 'Transaction voided')
            
            with db_transaction.atomic():
                # Prepare items data for inventory restoration
                items_for_restoration = []
                for item in pos_transaction.items.all():
                    if item.product:
                        items_for_restoration.append({
                            'type': 'product',
                            'item': item.product,
                            'quantity': item.quantity
                        })
                
                # Restore inventory
                restored_products = InventoryService.restore_stock(
                    items_for_restoration,
                    transaction_ref=f"VOID-{pos_transaction.transaction_number}"
                )
                
                # Create void accounting entries
                void_journal_entry = AccountingService.void_transaction_journal_entry(pos_transaction)
                
                # Update transaction status
                pos_transaction.status = 'voided'
                pos_transaction.voided_by = request.user
                pos_transaction.voided_at = timezone.now()
                pos_transaction.void_reason = void_reason
                pos_transaction.save()
                
                response_data = {
                    'message': f'Transaction {pos_transaction.transaction_number} has been voided',
                    'voided_transaction': {
                        'id': str(pos_transaction.id),
                        'transaction_number': pos_transaction.transaction_number,
                        'status': pos_transaction.status,
                        'void_reason': pos_transaction.void_reason,
                        'voided_at': pos_transaction.voided_at.isoformat(),
                        'voided_by': request.user.username
                    },
                    'inventory_restored': restored_products,
                    'void_journal_entry_id': str(void_journal_entry.id)
                }
                
                return Response(response_data, status=status.HTTP_200_OK)
                
        except Exception as e:
            logger.error(f"Error voiding transaction {pk}: {str(e)}")
            return Response(
                {'error': 'Failed to void transaction', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='daily-summary')
    def daily_summary(self, request):
        """
        Get daily sales summary for today.
        """
        try:
            today = timezone.now().date()
            
            # Get today's completed transactions
            daily_transactions = POSTransaction.objects.filter(
                created_at__date=today,
                status='completed'
            )
            
            # Calculate summary metrics
            total_sales = sum(t.total_amount for t in daily_transactions)
            total_transactions = daily_transactions.count()
            total_items_sold = sum(t.total_items for t in daily_transactions)
            
            # Payment method breakdown
            payment_methods = {}
            for transaction in daily_transactions:
                method = transaction.payment_method
                if method not in payment_methods:
                    payment_methods[method] = {'count': 0, 'total': Decimal('0')}
                payment_methods[method]['count'] += 1
                payment_methods[method]['total'] += transaction.total_amount
            
            # Top selling items (simplified)
            # This would need more complex aggregation for production
            
            response_data = {
                'date': today.isoformat(),
                'summary': {
                    'total_sales': str(total_sales),
                    'total_transactions': total_transactions,
                    'total_items_sold': total_items_sold,
                    'average_transaction': str(total_sales / total_transactions) if total_transactions > 0 else '0.00'
                },
                'payment_methods': {
                    method: {
                        'count': data['count'],
                        'total': str(data['total'])
                    }
                    for method, data in payment_methods.items()
                }
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error generating daily summary: {str(e)}")
            return Response(
                {'error': 'Failed to generate daily summary', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class POSRefundViewSet(TenantIsolatedViewSet):
    """
    ViewSet for POS refunds and returns.
    """
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return POSRefund.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'list':
            return POSRefundListSerializer
        else:
            return POSRefundCreateSerializer
    
    def create(self, request, *args, **kwargs):
        """
        Create a POS refund with inventory and accounting updates.
        """
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            with db_transaction.atomic():
                # Create the refund
                refund = serializer.save()
                
                # Prepare items for inventory restoration
                items_for_restoration = []
                for refund_item in refund.items.all():
                    if refund_item.original_item.product:
                        items_for_restoration.append({
                            'type': 'product',
                            'item': refund_item.original_item.product,
                            'quantity_returned': refund_item.quantity_returned,
                            'cost_price': refund_item.original_item.cost_price
                        })
                
                # Restore inventory
                restored_products = InventoryService.restore_stock(
                    items_for_restoration,
                    transaction_ref=refund.refund_number
                )
                
                # Create refund accounting entries
                journal_entry = AccountingService.create_refund_journal_entry(
                    refund,
                    items_for_restoration
                )
                
                # Link journal entry to refund
                refund.journal_entry = journal_entry
                refund.save()
                
                response_data = {
                    'refund': {
                        'id': str(refund.id),
                        'refund_number': refund.refund_number,
                        'total_amount': str(refund.total_amount),
                        'status': refund.status,
                        'created_at': refund.created_at.isoformat()
                    },
                    'inventory_restored': restored_products,
                    'journal_entry_id': str(journal_entry.id)
                }
                
                return Response(response_data, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            logger.error(f"Error creating refund: {str(e)}")
            return Response(
                {'error': 'Failed to create refund', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )