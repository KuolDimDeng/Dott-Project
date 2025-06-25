"""
New serializers for sales module using industry-standard patterns.
These work with the tenant-aware ViewSets and don't use database_name.
"""
from rest_framework import serializers
from decimal import Decimal
from django.utils import timezone
from django.utils.dateparse import parse_date

from .models import (
    SalesOrder, SalesOrderItem, Invoice, InvoiceItem, 
    Estimate, EstimateItem, Customer
)
from inventory.models import Product, Service
from pyfactor.logging_config import get_logger

logger = get_logger()


class SalesOrderItemSerializer(serializers.ModelSerializer):
    """Simple serializer for sales order items."""
    class Meta:
        model = SalesOrderItem
        fields = [
            'id', 'item_type', 'product', 'service', 'item_id',
            'description', 'quantity', 'unit_price', 'tax_rate',
            'tax_amount', 'total'
        ]
        read_only_fields = ['id', 'total']
    
    def validate(self, data):
        """Ensure either product or service is specified."""
        if not data.get('product') and not data.get('service'):
            raise serializers.ValidationError(
                "Either product or service must be specified"
            )
        return data


class SalesOrderSerializer(serializers.ModelSerializer):
    """Industry-standard serializer for sales orders."""
    items = SalesOrderItemSerializer(many=True, required=False)
    customer_name = serializers.CharField(source='customer.customerName', read_only=True)
    customer_id = serializers.CharField(source='customer.customer_id', read_only=True)
    
    class Meta:
        model = SalesOrder
        fields = [
            'id', 'order_number', 'customer', 'customer_name', 'customer_id',
            'date', 'due_date', 'status', 'payment_terms',
            'subtotal', 'tax_rate', 'tax_total', 'discount', 'discount_percentage',
            'shipping_cost', 'total_amount', 'totalAmount',
            'notes', 'items', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'order_number', 'customer_name', 'customer_id',
            'subtotal', 'tax_total', 'total_amount', 'totalAmount',
            'created_at', 'updated_at'
        ]
    
    def create(self, validated_data):
        """Create sales order with items."""
        items_data = validated_data.pop('items', [])
        
        # Create the order
        order = SalesOrder.objects.create(**validated_data)
        
        # Create items
        for item_data in items_data:
            SalesOrderItem.objects.create(sales_order=order, **item_data)
        
        # Calculate totals
        order.calculate_total_amount()
        
        return order
    
    def update(self, instance, validated_data):
        """Update sales order with items."""
        items_data = validated_data.pop('items', None)
        
        # Update order fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update items if provided
        if items_data is not None:
            # Clear existing items
            instance.items.all().delete()
            
            # Create new items
            for item_data in items_data:
                SalesOrderItem.objects.create(sales_order=instance, **item_data)
            
            # Recalculate totals
            instance.calculate_total_amount()
        
        return instance


class InvoiceItemSerializer(serializers.ModelSerializer):
    """Simple serializer for invoice items."""
    class Meta:
        model = InvoiceItem
        fields = [
            'id', 'product', 'service', 'description',
            'quantity', 'unit_price', 'tax_rate', 'tax_amount', 'total'
        ]
        read_only_fields = ['id', 'total']


class InvoiceSerializer(serializers.ModelSerializer):
    """Industry-standard serializer for invoices."""
    items = InvoiceItemSerializer(many=True, required=False)
    customer_name = serializers.CharField(source='customer.customerName', read_only=True)
    customer_id = serializers.CharField(source='customer.customer_id', read_only=True)
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_num', 'customer', 'customer_name', 'customer_id',
            'date', 'due_date', 'status', 'is_paid',
            'subtotal', 'tax_total', 'discount', 'totalAmount', 'total',
            'amount_paid', 'balance_due', 'currency',
            'notes', 'terms', 'items', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'invoice_num', 'customer_name', 'customer_id',
            'subtotal', 'tax_total', 'total', 'balance_due',
            'created_at', 'updated_at'
        ]
    
    def create(self, validated_data):
        """Create invoice with items."""
        items_data = validated_data.pop('items', [])
        
        # Create the invoice
        invoice = Invoice.objects.create(**validated_data)
        
        # Create items
        total_amount = Decimal('0.00')
        for item_data in items_data:
            item = InvoiceItem.objects.create(invoice=invoice, **item_data)
            total_amount += item.quantity * item.unit_price
        
        # Update totals
        invoice.subtotal = total_amount
        invoice.totalAmount = total_amount - invoice.discount
        invoice.total = invoice.totalAmount
        invoice.balance_due = invoice.total - invoice.amount_paid
        invoice.save()
        
        return invoice


class EstimateItemSerializer(serializers.ModelSerializer):
    """Simple serializer for estimate items."""
    class Meta:
        model = EstimateItem
        fields = [
            'id', 'product', 'service', 'description',
            'quantity', 'unit_price', 'tax_rate', 'tax_amount', 'total'
        ]
        read_only_fields = ['id', 'total']


class EstimateSerializer(serializers.ModelSerializer):
    """Industry-standard serializer for estimates."""
    items = EstimateItemSerializer(many=True, required=False)
    customer_name = serializers.CharField(source='customer.customerName', read_only=True)
    customer_id = serializers.CharField(source='customer.customer_id', read_only=True)
    
    class Meta:
        model = Estimate
        fields = [
            'id', 'estimate_num', 'customer', 'customer_name', 'customer_id',
            'date', 'valid_until', 'status',
            'title', 'summary', 'customer_ref',
            'subtotal', 'tax_total', 'discount', 'totalAmount', 'total',
            'currency', 'notes', 'terms', 'footer',
            'items', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'estimate_num', 'customer_name', 'customer_id',
            'subtotal', 'tax_total', 'total',
            'created_at', 'updated_at'
        ]
    
    def create(self, validated_data):
        """Create estimate with items."""
        items_data = validated_data.pop('items', [])
        
        # Generate estimate number
        validated_data['estimate_num'] = Estimate.generate_estimate_number()
        
        # Create the estimate
        estimate = Estimate.objects.create(**validated_data)
        
        # Create items
        total_amount = Decimal('0.00')
        for item_data in items_data:
            item = EstimateItem.objects.create(estimate=estimate, **item_data)
            total_amount += item.quantity * item.unit_price
        
        # Update totals
        estimate.subtotal = total_amount
        estimate.totalAmount = total_amount - estimate.discount
        estimate.total = estimate.totalAmount
        estimate.save()
        
        return estimate