"""
Industry-standard ViewSets for Sales module following tenant-aware patterns.
These replace the old multi-database views with proper tenant isolation.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import PermissionDenied
from django.db import transaction as db_transaction
from decimal import Decimal
from django.utils import timezone
from django.http import FileResponse, HttpResponse

from .models import SalesOrder, SalesOrderItem, Invoice, Estimate
from .serializers_new import (
    SalesOrderSerializer, 
    SalesOrderItemSerializer,
    InvoiceSerializer,
    EstimateSerializer
)
from .utils import generate_invoice_pdf
from pyfactor.logging_config import get_logger

logger = get_logger()


class SalesOrderViewSet(viewsets.ModelViewSet):
    """
    Industry-standard ViewSet for Sales Orders with proper tenant isolation.
    Following the proven pattern from CustomerViewSet.
    """
    queryset = SalesOrder.objects.all()  # TenantManager handles filtering
    serializer_class = SalesOrderSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        """Create sales order with automatic tenant assignment."""
        order = serializer.save()
        logger.info(f"Sales order {order.order_number} created for tenant {order.tenant_id}")
    
    def perform_update(self, serializer):
        """Update sales order with items."""
        order = serializer.save()
        logger.info(f"Sales order {order.order_number} updated for tenant {order.tenant_id}")
    
    @action(detail=True, methods=['post'])
    def convert_to_invoice(self, request, pk=None):
        """Convert sales order to invoice."""
        order = self.get_object()
        
        try:
            # Check if invoice already exists
            if hasattr(order, 'invoice'):
                return Response(
                    {'error': 'Invoice already exists for this order'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create invoice from order
            invoice = Invoice.objects.create(
                customer=order.customer,
                sales_order=order,
                totalAmount=order.total_amount,
                date=timezone.now().date(),
                due_date=order.due_date,
                subtotal=order.subtotal,
                tax_total=order.tax_rate * order.subtotal / 100,
                total=order.total_amount,
                balance_due=order.total_amount,
                notes=order.notes
            )
            
            # Copy items to invoice
            for order_item in order.items.all():
                # Create invoice item (you may need to create InvoiceItem model)
                pass
            
            return Response(
                InvoiceSerializer(invoice).data,
                status=status.HTTP_201_CREATED
            )
            
        except Exception as e:
            logger.error(f"Error converting order to invoice: {str(e)}")
            return Response(
                {'error': 'Failed to convert order to invoice'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class InvoiceViewSet(viewsets.ModelViewSet):
    """
    Industry-standard ViewSet for Invoices with proper tenant isolation.
    """
    queryset = Invoice.objects.all()  # TenantManager handles filtering
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        """Create invoice with automatic tenant assignment."""
        invoice = serializer.save()
        logger.info(f"Invoice {invoice.invoice_num} created for tenant {invoice.tenant_id}")
    
    @action(detail=True, methods=['post'])
    def send_invoice(self, request, pk=None):
        """Send invoice via email or other methods."""
        invoice = self.get_object()
        method = request.data.get('method', 'email')
        recipient = request.data.get('recipient')
        
        # TODO: Implement actual sending logic
        invoice.status = 'sent'
        invoice.save()
        
        return Response({'message': f'Invoice sent via {method}'})
    
    @action(detail=True, methods=['post'])
    def record_payment(self, request, pk=None):
        """Record payment for invoice."""
        invoice = self.get_object()
        amount = Decimal(request.data.get('amount', 0))
        
        if amount <= 0:
            return Response(
                {'error': 'Invalid payment amount'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update payment info
        invoice.amount_paid += amount
        invoice.balance_due = invoice.total - invoice.amount_paid
        
        if invoice.balance_due <= 0:
            invoice.status = 'paid'
            invoice.is_paid = True
        
        invoice.save()
        
        return Response({
            'amount_paid': str(invoice.amount_paid),
            'balance_due': str(invoice.balance_due),
            'status': invoice.status
        })
    
    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        """Generate and return PDF for invoice."""
        logger.info(f"PDF generation requested for invoice {pk}")
        logger.info(f"User: {request.user}, Tenant: {getattr(request.user, 'tenant_id', 'No tenant')}")
        try:
            # Get the invoice using get_object() which respects permissions and tenant filtering
            invoice = self.get_object()
            
            # Prefetch related data
            invoice = Invoice.objects.select_related(
                'customer'
            ).prefetch_related(
                'items__product',
                'items__service'
            ).get(pk=invoice.pk)
            
            logger.info(f"Invoice found: {invoice.invoice_num}")
            
            # Generate PDF
            pdf_buffer = generate_invoice_pdf(invoice)
            
            # Create response
            filename = f"invoice_{invoice.invoice_num}.pdf"
            response = HttpResponse(
                pdf_buffer.getvalue(),
                content_type='application/pdf'
            )
            response['Content-Disposition'] = f'inline; filename="{filename}"'
            
            logger.info(f"Generated PDF for invoice {invoice.invoice_num}")
            return response
            
        except Invoice.DoesNotExist:
            logger.error(f"Invoice not found: {pk}")
            return Response(
                {'error': 'Invoice not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.exception(f"Error generating PDF for invoice {pk}: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            return Response(
                {'error': f'Failed to generate PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class EstimateViewSet(viewsets.ModelViewSet):
    """
    Industry-standard ViewSet for Estimates with proper tenant isolation.
    """
    queryset = Estimate.objects.all()  # TenantManager handles filtering
    serializer_class = EstimateSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        """Create estimate with automatic tenant assignment."""
        estimate = serializer.save()
        logger.info(f"Estimate created for tenant {estimate.tenant_id}")
    
    @action(detail=True, methods=['post'])
    def convert_to_order(self, request, pk=None):
        """Convert estimate to sales order."""
        estimate = self.get_object()
        
        try:
            # Create sales order from estimate
            order = SalesOrder.objects.create(
                customer=estimate.customer,
                order_number=f"SO-{estimate.estimate_number}",
                date=timezone.now().date(),
                due_date=estimate.valid_until,
                subtotal=estimate.subtotal,
                tax_rate=estimate.tax_rate,
                discount_percentage=estimate.discount,
                total_amount=estimate.total,
                status='pending',
                notes=estimate.notes
            )
            
            # Copy items
            for est_item in estimate.items.all():
                SalesOrderItem.objects.create(
                    sales_order=order,
                    item_type=est_item.item_type,
                    product=est_item.product,
                    service=est_item.service,
                    description=est_item.description,
                    quantity=est_item.quantity,
                    rate=est_item.rate,
                    amount=est_item.amount
                )
            
            # Mark estimate as converted
            estimate.status = 'converted'
            estimate.save()
            
            return Response(
                SalesOrderSerializer(order).data,
                status=status.HTTP_201_CREATED
            )
            
        except Exception as e:
            logger.error(f"Error converting estimate to order: {str(e)}")
            return Response(
                {'error': 'Failed to convert estimate to order'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )