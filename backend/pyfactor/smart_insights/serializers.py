from rest_framework import serializers
from .models import CreditPackage, UserCredit, CreditTransaction, QueryLog, MonthlyUsage


class CreditPackageSerializer(serializers.ModelSerializer):
    price_per_credit = serializers.DecimalField(max_digits=10, decimal_places=4, read_only=True)
    
    class Meta:
        model = CreditPackage
        fields = [
            'id', 'name', 'credits', 'price', 'price_per_credit',
            'stripe_price_id', 'is_active'
        ]


class UserCreditSerializer(serializers.ModelSerializer):
    can_use_credits = serializers.SerializerMethodField()
    
    class Meta:
        model = UserCredit
        fields = [
            'balance', 'total_purchased', 'total_used', 
            'monthly_spend_limit', 'can_use_credits',
            'created_at', 'updated_at'
        ]
        
    def get_can_use_credits(self, obj):
        return obj.balance > 0


class CreditTransactionSerializer(serializers.ModelSerializer):
    transaction_type_display = serializers.CharField(source='get_transaction_type_display', read_only=True)
    
    class Meta:
        model = CreditTransaction
        fields = [
            'id', 'transaction_type', 'transaction_type_display',
            'amount', 'balance_after', 'description', 
            'created_at'
        ]


class QueryLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = QueryLog
        fields = [
            'id', 'query', 'response', 'credits_used',
            'input_tokens', 'output_tokens', 'model_used',
            'processing_time_ms', 'created_at'
        ]


class MonthlyUsageSerializer(serializers.ModelSerializer):
    is_at_limit = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = MonthlyUsage
        fields = [
            'year', 'month', 'total_credits_used', 
            'total_cost', 'query_count', 'is_at_limit'
        ]


class PurchaseCreditsSerializer(serializers.Serializer):
    package_id = serializers.UUIDField()
    payment_method_id = serializers.CharField(required=False)  # For Stripe
    
    def validate_package_id(self, value):
        try:
            package = CreditPackage.objects.get(id=value, is_active=True)
        except CreditPackage.DoesNotExist:
            raise serializers.ValidationError("Invalid package selected")
        return value