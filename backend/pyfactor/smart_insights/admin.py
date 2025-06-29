from django.contrib import admin
from .models import CreditPackage, UserCredit, CreditTransaction, QueryLog, MonthlyUsage


@admin.register(CreditPackage)
class CreditPackageAdmin(admin.ModelAdmin):
    list_display = ['name', 'credits', 'price', 'price_per_credit', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(UserCredit)
class UserCreditAdmin(admin.ModelAdmin):
    list_display = ['user', 'balance', 'total_purchased', 'total_used', 'monthly_spend_limit']
    search_fields = ['user__email', 'user__username']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(CreditTransaction)
class CreditTransactionAdmin(admin.ModelAdmin):
    list_display = ['user', 'transaction_type', 'amount', 'balance_after', 'created_at']
    list_filter = ['transaction_type', 'created_at']
    search_fields = ['user__email', 'description']
    readonly_fields = ['id', 'created_at']
    date_hierarchy = 'created_at'


@admin.register(QueryLog)
class QueryLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'credits_used', 'model_used', 'created_at']
    list_filter = ['model_used', 'created_at']
    search_fields = ['user__email', 'query', 'response']
    readonly_fields = ['id', 'created_at']
    date_hierarchy = 'created_at'


@admin.register(MonthlyUsage)
class MonthlyUsageAdmin(admin.ModelAdmin):
    list_display = ['user', 'year', 'month', 'total_credits_used', 'total_cost', 'query_count']
    list_filter = ['year', 'month']
    search_fields = ['user__email']
    readonly_fields = ['created_at', 'updated_at']