from django.contrib import admin
from .models import (
    PaymentGateway, PaymentMethod, Transaction, WebhookEvent,
    PaymentAuditLog, PaymentReconciliation, PaymentConfiguration,
    QRPaymentTransaction, InvoicePayment, VendorPayment, PlatformFeeCollection
)

@admin.register(PaymentGateway)
class PaymentGatewayAdmin(admin.ModelAdmin):
    list_display = ['display_name', 'name', 'status', 'tenant_id', 'created_at']
    list_filter = ['status', 'name', 'created_at']
    search_fields = ['display_name', 'name']
    ordering = ['priority', 'name']

@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = ['user', 'method_type', 'gateway', 'is_default', 'is_verified', 'created_at']
    list_filter = ['method_type', 'is_verified', 'is_default', 'created_at']
    search_fields = ['user__email', 'nickname']

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ['reference_number', 'user', 'transaction_type', 'amount', 'currency', 'status', 'created_at']
    list_filter = ['transaction_type', 'status', 'currency', 'created_at']
    search_fields = ['reference_number', 'user__email', 'description']
    ordering = ['-created_at']

@admin.register(QRPaymentTransaction)
class QRPaymentTransactionAdmin(admin.ModelAdmin):
    list_display = ['transaction_id', 'business_name', 'user', 'amount', 'currency', 'status', 'created_at', 'expires_at']
    list_filter = ['status', 'currency', 'created_at']
    search_fields = ['transaction_id', 'business_name', 'user__email']
    ordering = ['-created_at']
    readonly_fields = ['transaction_id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Transaction Info', {
            'fields': ('transaction_id', 'business_id', 'business_name', 'user')
        }),
        ('Payment Details', {
            'fields': ('amount', 'currency', 'tax', 'subtotal', 'items')
        }),
        ('Status & Timing', {
            'fields': ('status', 'created_at', 'updated_at', 'expires_at', 'completed_at')
        }),
        ('Customer Info', {
            'fields': ('customer_name', 'customer_email', 'customer_phone')
        }),
        ('Gateway Info', {
            'fields': ('stripe_payment_intent_id', 'gateway_transaction_id', 'gateway_response')
        }),
        ('Additional Data', {
            'fields': ('metadata',)
        })
    )

@admin.register(WebhookEvent)
class WebhookEventAdmin(admin.ModelAdmin):
    list_display = ['gateway', 'event_type', 'processed', 'verified', 'created_at']
    list_filter = ['processed', 'verified', 'event_type', 'created_at']
    search_fields = ['event_id', 'gateway__display_name']

@admin.register(PaymentAuditLog)
class PaymentAuditLogAdmin(admin.ModelAdmin):
    list_display = ['action', 'user', 'risk_level', 'created_at']
    list_filter = ['action', 'risk_level', 'created_at']
    search_fields = ['user__email', 'description']

@admin.register(InvoicePayment)
class InvoicePaymentAdmin(admin.ModelAdmin):
    list_display = ['id', 'invoice', 'amount', 'currency', 'status', 'created_at']
    list_filter = ['status', 'currency', 'created_at']
    search_fields = ['stripe_payment_intent_id']

@admin.register(VendorPayment)
class VendorPaymentAdmin(admin.ModelAdmin):
    list_display = ['id', 'vendor', 'amount', 'currency', 'status', 'created_at']
    list_filter = ['status', 'currency', 'created_at']
    search_fields = ['stripe_charge_id', 'invoice_number']

@admin.register(PlatformFeeCollection)
class PlatformFeeCollectionAdmin(admin.ModelAdmin):
    list_display = ['id', 'business_id', 'transaction_type', 'amount', 'platform_fee', 'platform_profit', 'created_at']
    list_filter = ['transaction_type', 'status', 'created_at']
    search_fields = ['business_id', 'transaction_id']
