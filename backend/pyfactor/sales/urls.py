from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .viewsets import SalesOrderViewSet, InvoiceViewSet, EstimateViewSet
from .pos_viewsets import POSTransactionViewSet, POSRefundViewSet
from .views import (
    # Keep existing views that work
    create_customer,
    customer_list,
    customer_detail,
    customer_invoices,
    customer_transactions,
    update_customer,
    delete_customer,
    income_by_customer,
    customer_income_detail,
    create_sale,
    create_refund,
    refund_list,
    refund_detail,
    create_custom_charge_plan,
    list_custom_charge_plans,
    # PDF-related views
    estimate_pdf,
    save_estimate,
    email_estimate,
    print_estimate,
)
from .receipt_views import send_receipt_email
from .views_pos_complete import complete_pos_transaction, send_pos_receipt

# Create router for ViewSets
router = DefaultRouter()
router.register(r'orders', SalesOrderViewSet, basename='salesorder')
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'estimates', EstimateViewSet, basename='estimate')

# POS-specific routes
router.register(r'pos/transactions', POSTransactionViewSet, basename='pos-transaction')
router.register(r'pos/refunds', POSRefundViewSet, basename='pos-refund')

urlpatterns = [
    # Include ViewSet routes
    path('', include(router.urls)),
    
    # POS Transaction Completion endpoints
    path('pos/complete-transaction/', complete_pos_transaction, name='complete_pos_transaction'),
    path('pos/send-receipt/', send_pos_receipt, name='send_pos_receipt'),
    
    # Keep existing customer endpoints (they work)
    path('customers/create/', create_customer, name='create_customer'),
    path('customers/', customer_list, name='customer_list'),
    path('customers/<uuid:pk>/', customer_detail, name='customer-detail'),
    path('customers/<uuid:pk>/update/', update_customer, name='update-customer'),
    path('customers/<uuid:pk>/delete/', delete_customer, name='delete-customer'),
    path('customers/<uuid:customer_id>/invoices/', customer_invoices, name='customer-invoices'),
    path('customers/<uuid:customer_id>/transactions/', customer_transactions, name='customer-transactions'),
    
    # PDF-related endpoints for estimates
    path('estimates/<uuid:estimate_id>/pdf/', estimate_pdf, name='estimate_pdf'),
    path('estimates/<uuid:estimate_id>/save/', save_estimate, name='save_estimate'),
    path('estimates/<uuid:estimate_id>/print/', print_estimate, name='print_estimate'),
    path('estimates/<uuid:estimate_id>/email/', email_estimate, name='email_estimate'),
    
    # Other working endpoints
    path('income-by-customer/', income_by_customer, name='income-by-customer'),
    path('income-by-customer/<uuid:customer_id>/', customer_income_detail, name='customer-income-detail'),
    path('sales/create/', create_sale, name='create-sale'),
    path('refunds/create/', create_refund, name='create-refund'),
    path('refunds/', refund_list, name='refund-list'),
    path('refunds/<uuid:pk>/', refund_detail, name='refund-detail'),
    path('custom-charge-plans/create/', create_custom_charge_plan, name='create-custom-charge-plan'),
    path('custom-charge-plans/', list_custom_charge_plans, name='list-custom-charge-plans'),
    
    # Receipt email endpoint
    path('pos/send-receipt/', send_receipt_email, name='send-receipt-email'),
]