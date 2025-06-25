#!/usr/bin/env python
"""
Test script to verify the new sales order ViewSet is working correctly.
Run this from the Django shell: python manage.py shell < test_sales_order.py
"""
from django.contrib.auth import get_user_model
from sales.models import SalesOrder, SalesOrderItem
from inventory.models import Product
from crm.models import Customer
from decimal import Decimal

User = get_user_model()

# Get the first user
try:
    user = User.objects.first()
    if not user:
        print("No users found in database")
        exit()
    
    print(f"Testing with user: {user.email}")
    
    # Get or create a test customer
    customer, created = Customer.objects.get_or_create(
        email='test@example.com',
        defaults={
            'customerName': 'Test Customer',
            'first_name': 'Test',
            'last_name': 'Customer',
            'phone': '1234567890',
        }
    )
    print(f"Customer: {customer.customerName} (created: {created})")
    
    # Get or create a test product
    product, created = Product.objects.get_or_create(
        name='Test Product',
        defaults={
            'price': Decimal('100.00'),
            'stock_quantity': 10,
        }
    )
    print(f"Product: {product.name} (created: {created})")
    
    # Create a sales order
    order = SalesOrder.objects.create(
        customer=customer,
        date='2025-01-25',
        due_date='2025-02-25',
        payment_terms='net_30',
        tax_rate=Decimal('10.00'),
        shipping_cost=Decimal('25.00'),
        notes='Test order created via script'
    )
    print(f"Created order: {order.order_number}")
    
    # Add items to the order
    item = SalesOrderItem.objects.create(
        sales_order=order,
        product=product,
        quantity=2,
        unit_price=Decimal('100.00'),
        description='Test product item'
    )
    print(f"Added item: {item.product.name} x {item.quantity}")
    
    # Calculate totals
    order.calculate_total_amount()
    
    print(f"\nOrder Summary:")
    print(f"  Order Number: {order.order_number}")
    print(f"  Customer: {order.customer.customerName}")
    print(f"  Subtotal: ${order.subtotal}")
    print(f"  Tax: ${order.tax_total}")
    print(f"  Shipping: ${order.shipping_cost}")
    print(f"  Total: ${order.total_amount}")
    
    # List all orders
    print(f"\nAll orders for tenant {order.tenant_id}:")
    for o in SalesOrder.objects.all():
        print(f"  - {o.order_number}: {o.customer.customerName} - ${o.total_amount}")
    
except Exception as e:
    print(f"Error: {str(e)}")
    import traceback
    traceback.print_exc()