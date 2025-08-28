import uuid
from django.db import connections, transaction as db_transaction
from rest_framework import serializers
from .utils import get_or_create_account, calculate_due_date
from finance.models import Account, FinanceTransaction
from .models import Refund, RefundItem, SaleItem, Invoice, Estimate, SalesOrder, SalesOrderItem, default_due_datetime, EstimateItem, EstimateAttachment, InvoiceItem, Sale, POSTransaction, POSTransactionItem, POSRefund, POSRefundItem
from inventory.models import Product, Service, CustomChargePlan, Department
from crm.models import Customer
from pyfactor.logging_config import get_logger
from django.utils import timezone
from decimal import Decimal
from datetime import datetime, timedelta, date
from django.utils.dateparse import parse_date


logger = get_logger()

class CustomChargePlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomChargePlan
        fields = ['id', 'name', 'quantity', 'unit', 'custom_unit', 'period', 'custom_period', 'price']

class ItemSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    name = serializers.CharField(max_length=100)
    description = serializers.CharField(required=False, allow_null=True)
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    is_for_sale = serializers.BooleanField(default=True)
    is_for_rent = serializers.BooleanField(default=False)
    salesTax = serializers.DecimalField(max_digits=5, decimal_places=2, default=0)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    height = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    width = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    height_unit = serializers.CharField(max_length=10, default='cm')
    width_unit = serializers.CharField(max_length=10, default='cm')
    weight = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    weight_unit = serializers.CharField(max_length=10, default='kg')
    charge_period = serializers.CharField(max_length=10, default='day')
    charge_amount = serializers.DecimalField(max_digits=10, decimal_places=2, default=0)
    custom_charge_plans = CustomChargePlanSerializer(many=True, read_only=True)
        
        
class ProductSerializer(serializers.ModelSerializer):
    days_in_stock = serializers.ReadOnlyField()
    custom_charge_plans = CustomChargePlanSerializer(many=True, read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'price', 'is_for_sale', 'is_for_rent', 'salesTax',
            'created_at', 'updated_at', 'height', 'width', 'height_unit', 'width_unit',
            'weight', 'weight_unit', 'charge_period', 'charge_amount', 'custom_charge_plans',
            'product_code', 'department', 'stock_quantity', 'reorder_level', 'days_in_stock'
        ]
        read_only_fields = ['id', 'product_code', 'days_in_stock']

    def create(self, validated_data):
        database_name = self.context.get('database_name')
        logger.debug(f"Creating product in database: {database_name}")
        
        with db_transaction.atomic(using=database_name):
            product = Product.objects.using(database_name).create(**validated_data)
            product.product_code = Product.generate_unique_code(product.name, 'product_code')
            product.save(using=database_name)
            logger.debug(f"Created product: {product}")
        
        return product

class ServiceSerializer(serializers.ModelSerializer):
    days_in_stock = serializers.ReadOnlyField()
    custom_charge_plans = CustomChargePlanSerializer(many=True, read_only=True)

    class Meta:
        model = Service
        fields = [
            'id', 'name', 'description', 'price', 'is_for_sale', 'is_for_rent', 'salesTax',
            'created_at', 'updated_at', 'height', 'width', 'height_unit', 'width_unit',
            'weight', 'weight_unit', 'charge_period', 'charge_amount', 'custom_charge_plans',
            'service_code', 'duration', 'is_recurring', 'days_in_stock'
        ]
        read_only_fields = ['id', 'service_code', 'days_in_stock']

    def create(self, validated_data):
        database_name = self.context.get('database_name')
        logger.debug(f"Creating service in database: {database_name}")
        
        with db_transaction.atomic(using=database_name):
            service = Service.objects.using(database_name).create(**validated_data)
            service.service_code = Service.generate_unique_code(service.name, 'service_code')
            service.save(using=database_name)
            logger.debug(f"Created service: {service}")
        
        return service
    
class CustomerSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()
    accountNumber = serializers.CharField(read_only=True)

    class Meta:
        model = Customer
        fields = [
            'id', 'customerName', 'first_name', 'last_name', 'email', 'phone',
            'accountNumber', 'website', 'notes', 'currency', 'billingCountry',
            'billingState', 'shipToName', 'shippingCountry', 'shippingState',
            'shippingPhone', 'deliveryInstructions', 'street', 'postcode', 'city', 'display_name'
        ]
        read_only_fields = ['id', 'accountNumber']
        

    def create(self, validated_data):
        database_name = self.context.get('database_name')
        with db_transaction.atomic(using=database_name):
            customer = Customer.objects.using(database_name).create(**validated_data)
        return customer
    
    def get_display_name(self, obj):
        return f"{obj.customerName} - {obj.accountNumber}"


class CustomerIncomeSerializer(serializers.ModelSerializer):
    total_income = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Customer
        fields = ['id', 'customerName', 'email', 'phone', 'total_income']

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        return representation
    
class TransactionSerializer(serializers.ModelSerializer):
    account = serializers.PrimaryKeyRelatedField(queryset=Account.objects.all())

    class Meta:
        model = FinanceTransaction
        fields = ['id', 'date', 'description', 'account', 'type', 'amount', 'notes', 'receipt']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.database_name = self.context.get('database_name')
        logger.debug(f"TransactionSerializer initialized with database_name: {self.database_name}")
        if self.database_name:
            self.fields['account'].queryset = Account.objects.using(self.database_name).all()
            logger.debug(f"Account queryset updated for database: {self.database_name}")

    def create(self, validated_data):
        logger.debug(f"Creating transaction with validated_data: {validated_data}")
        transaction = FinanceTransaction.objects.using(self.context['database_name']).create(**validated_data)
        transaction.update_account_balance()
        logger.debug(f"Created transaction: {transaction}")
        return transaction

class DateTimeToDateField(serializers.DateTimeField):
    def to_representation(self, value):
        if value:
            if isinstance(value, datetime):
                return timezone.localtime(value).date()
            elif isinstance(value, date):
                return value
        return None

    def to_internal_value(self, value):
        if isinstance(value, date):
            return timezone.make_aware(datetime.combine(value, datetime.min.time()))
        return super().to_internal_value(value)
    
class InvoiceItemSerializer(serializers.ModelSerializer):
    product = serializers.CharField(max_length=36)  # Keep this as CharField

    class Meta:
        model = InvoiceItem
        fields = ['product', 'quantity', 'unit_price']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.database_name = self.context.get('database_name')
        logger.debug(f"InvoiceItemSerializer initialized with database_name: {self.database_name}")

    def validate_product(self, value):
        database_name = self.context.get('database_name')
        if not database_name:
            raise ValueError("database_name is required in the serializer context")
        try:
            product = Product.objects.using(database_name).get(pk=value)
            logger.debug(f"Product retrieved: {product.id}: {product.name}")
            return value  # Return the product ID, not the product object
        except Product.DoesNotExist:
            logger.error(f"Product with id {value} does not exist in database {database_name}.")
            raise serializers.ValidationError(f"Product with id {value} does not exist in database {database_name}.")
        
        
class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True)
    customer = serializers.CharField()
    date = DateTimeToDateField()
    due_date = DateTimeToDateField(required=False)
    totalAmount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)

    class Meta:
        model = Invoice
        fields = ['id', 'invoice_num', 'customer', 'totalAmount', 'date', 'due_date', 'items', 'discount', 'currency']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.database_name = self.context.get('database_name')
        logger.debug(f"InvoiceSerializer initialized with database: {self.database_name}")

    def validate(self, data):
        if 'totalAmount' not in data:
            # Calculate totalAmount based on items
            total = sum(item['quantity'] * item['unit_price'] for item in data['items'])
            data['totalAmount'] = total - data.get('discount', 0)
        return data

    def validate_customer(self, value):
        database_name = self.context.get('database_name')

        if isinstance(value, str):
            try:
                value = uuid.UUID(value)
            except ValueError:
                raise serializers.ValidationError(f"Invalid UUID format for customer: {value}")
        elif not isinstance(value, uuid.UUID):
            raise serializers.ValidationError(f"Invalid customer identifier: {value}")

        logger.debug(f"Validating customer: {value} in database: {database_name}")

        try:
            customer = Customer.objects.using(database_name).get(pk=value)
            logger.debug(f"Customer retrieved: {customer.id}: {customer.business_name}")
            return customer
        except Customer.DoesNotExist:
            logger.error(f"Customer with id {value} does not exist in database {database_name}.")
            raise serializers.ValidationError(f"Customer with id {value} does not exist in database {database_name}.")

    
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        database_name = self.context.get('database_name')
        
        # Get user from context
        request = self.context.get('request')
        user = request.user if request else None
        
        logger.info(f"[CURRENCY-INVOICE] Creating invoice for user: {user.email if user else 'Unknown'}")
        
        # Get business currency preference if not provided
        if 'currency' not in validated_data or validated_data['currency'] == 'USD':
            try:
                from users.models import Business, BusinessDetails
                from currency.exchange_rate_service import exchange_rate_service
                
                # Get user's business
                if hasattr(user, 'business_id') and user.business_id:
                    business_id = user.business_id
                elif hasattr(user, 'tenant_id') and user.tenant_id:
                    business_id = user.tenant_id
                else:
                    # Try to get from profile
                    from users.models import UserProfile
                    profile = UserProfile.objects.filter(user=user).first()
                    business_id = profile.business_id if profile else None
                
                if business_id:
                    business = Business.objects.get(id=business_id)
                    business_details = BusinessDetails.objects.filter(business=business).first()
                    
                    if business_details and business_details.preferred_currency_code:
                        validated_data['currency'] = business_details.preferred_currency_code
                        logger.info(f"[CURRENCY-INVOICE] Set invoice currency to business preference: {business_details.preferred_currency_code}")
                        
                        # Get exchange rate if not USD
                        if business_details.preferred_currency_code != 'USD':
                            try:
                                # Get exchange rate from business currency to USD
                                rate = exchange_rate_service.get_exchange_rate(
                                    business_details.preferred_currency_code, 
                                    'USD'
                                )
                                if rate:
                                    validated_data['exchange_rate'] = rate
                                    validated_data['exchange_rate_date'] = timezone.now()
                                    logger.info(f"[CURRENCY-INVOICE] Set exchange rate: {rate} for {business_details.preferred_currency_code} to USD")
                            except Exception as e:
                                logger.error(f"[CURRENCY-INVOICE] Error getting exchange rate: {str(e)}")
            except Exception as e:
                logger.error(f"[CURRENCY-INVOICE] Error getting business currency preference: {str(e)}")
                # Default to USD if there's any error
                validated_data['currency'] = 'USD'

        with db_transaction.atomic(using=database_name):
            logger.info(f"[CURRENCY-INVOICE] Creating invoice with currency: {validated_data.get('currency', 'USD')}")
            invoice = Invoice.objects.using(database_name).create(**validated_data)
            total_amount = Decimal('0.00')
            total_cost = Decimal('0.00')

            for item_data in items_data:
                product_id = item_data.pop('product')
                product = Product.objects.using(database_name).get(pk=product_id)
                item = InvoiceItem.objects.using(database_name).create(
                    invoice=invoice,
                    product=product,  # Pass the Product instance, not the ID
                    **item_data
                )
                total_amount += item.quantity * item.unit_price
                total_cost += item.quantity * product.price  # Assuming product has a 'price' field for cost

            invoice.totalAmount = total_amount
            invoice.save(using=database_name)


            # Create transactions
            accounts_receivable = Account.objects.using(database_name).get(name='Accounts Receivable')
            sales_revenue = Account.objects.using(database_name).get(name='Sales Revenue')
            sales_tax_payable = Account.objects.using(database_name).get(name='Sales Tax Payable')
            cost_of_goods_sold = Account.objects.using(database_name).get(name='Cost of Goods Sold')
            inventory = Account.objects.using(database_name).get(name='Inventory')

            # Accounts Receivable transaction
            ar_transaction = FinanceTransaction.objects.using(database_name).create(
                account=accounts_receivable,
                amount=total_amount,
                type='debit',
                description=f"Invoice {invoice.invoice_num} - Accounts Receivable"
            )
            invoice.accounts_receivable = accounts_receivable
            invoice.transaction = ar_transaction

            # Sales Revenue transaction
            FinanceTransaction.objects.using(database_name).create(
                account=sales_revenue,
                amount=total_amount,
                type='credit',
                description=f"Invoice {invoice.invoice_num} - Sales Revenue"
            )
            invoice.sales_revenue = sales_revenue

            # Sales Tax Payable transaction (if applicable)
            tax_amount = total_amount * Decimal('0.1')  # Assuming 10% tax rate
            FinanceTransaction.objects.using(database_name).create(
                account=sales_tax_payable,
                amount=tax_amount,
                type='credit',
                description=f"Invoice {invoice.invoice_num} - Sales Tax Payable"
            )
            invoice.sales_tax_payable = sales_tax_payable

            # Cost of Goods Sold transaction
            FinanceTransaction.objects.using(database_name).create(
                account=cost_of_goods_sold,
                amount=total_cost,
                type='debit',
                description=f"Invoice {invoice.invoice_num} - Cost of Goods Sold"
            )
            invoice.cost_of_goods_sold = cost_of_goods_sold

            # Inventory transaction
            FinanceTransaction.objects.using(database_name).create(
                account=inventory,
                amount=total_cost,
                type='credit',
                description=f"Invoice {invoice.invoice_num} - Inventory"
            )
            invoice.inventory = inventory

            invoice.save(using=database_name)

        return invoice





class EstimateItemSerializer(serializers.ModelSerializer):
    product = serializers.CharField(max_length=36)  # Change this to CharField
    description = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = EstimateItem
        fields = ['id', 'product', 'service', 'description', 'quantity', 'unit_price']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.database_name = self.context.get('database_name')
        logger.debug(f"EstimateItemSerializer initialized with database_name: {self.database_name}")

    def to_internal_value(self, data):
        logger.debug(f"EstimateItemSerializer to_internal_value: {data}")
        return super().to_internal_value(data)
    
    def create(self, validated_data):
        database_name = self.context.get('database_name')
        if not database_name:
            raise ValueError("database_name is required in the serializer context")

        return EstimateItem.objects.using(database_name).create(**validated_data)

    def validate_product(self, value):
        database_name = self.context.get('database_name')
        if not database_name:
            raise serializers.ValidationError("database_name is required in the serializer context")

        try:
            product = Product.objects.using(database_name).get(pk=value)
            logger.debug(f"Product validated: {product.id}: {product.name}")
            return value
        except Product.DoesNotExist:
            logger.error(f"Product with id {value} not found in database {database_name}")
            raise serializers.ValidationError(f"Product with id {value} does not exist.")
        
class EstimateAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = EstimateAttachment
        fields = ['id', 'file']

class EstimateSerializer(serializers.ModelSerializer):
    items = EstimateItemSerializer(many=True, required=True)  # Change from read_only=True to required=True
    customer = serializers.UUIDField()  # Change this to UUIDField
    customer_name = serializers.SerializerMethodField()
    transaction = TransactionSerializer(required=False)
    date = DateTimeToDateField()
    valid_until = DateTimeToDateField(required=False)
    title = serializers.CharField(max_length=100, required=False, allow_blank=True)
    summary = serializers.CharField(max_length=200, required=False, allow_blank=True)
    discount = serializers.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    currency = serializers.CharField(max_length=3, default='USD')
    footer = serializers.CharField(max_length=200, required=False, allow_blank=True)
    totalAmount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Estimate
        fields = '__all__'
        read_only_fields = ['estimate_num']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.database_name = self.context.get('database_name')
        logger.debug(f"EstimateSerializer initialized with database_name: {self.database_name}")

    
    def get_customer_name(self, obj):
        return obj.customer.customerName if obj.customer else ''

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['totalAmount'] = str(instance.totalAmount)  # Convert to string to ensure it's JSON serializable
        return representation

    def to_internal_value(self, data):
        logger.debug(f"to_internal_value called with data: {data}")
        
        # Convert the data without removing items
        try:
            converted_data = super().to_internal_value(data)
            logger.debug(f"Base data converted: {converted_data}")
        except Exception as e:
            logger.error(f"Error converting base data: {str(e)}")
            raise

        # Process items if present
        items_data = data.get('items')
        if items_data is not None:
            converted_items = []
            for item in items_data:
                logger.debug(f"Processing item: {item}")
                try:
                    item_serializer = EstimateItemSerializer(
                        data=item, 
                        context={'database_name': self.context.get('database_name')}
                    )
                    if item_serializer.is_valid(raise_exception=True):
                        converted_items.append(item_serializer.validated_data)
                        logger.debug(f"Item converted: {item_serializer.validated_data}")
                except Exception as e:
                    logger.error(f"Error processing item {item}: {str(e)}")
                    raise
            
            # Add converted items back to the data
            converted_data['items'] = converted_items
        else:
            logger.error("Items data is None")
            raise serializers.ValidationError({'items': 'This field is required.'})
        
        logger.debug(f"Final converted data: {converted_data}")
        return converted_data
            
    def validate_date(self, value):
        return parse_date(value) if isinstance(value, str) else value

    def validate_valid_until(self, value):
        return parse_date(value) if isinstance(value, str) else value

    def validate_customer(self, value):
        database_name = self.context.get('database_name')
        
        if isinstance(value, str):
            try:
                value = uuid.UUID(value)
            except ValueError:
                raise serializers.ValidationError(f"Invalid UUID format for customer: {value}")
        elif not isinstance(value, uuid.UUID):
            raise serializers.ValidationError(f"Invalid customer identifier: {value}")

        logger.debug(f"Validating customer: {value} in database: {database_name}")
        
        try:
            customer = Customer.objects.using(database_name).get(pk=value)
            logger.debug(f"Customer validated: {customer.id}: {customer.customerName}")
            return customer
        except Customer.DoesNotExist:
            logger.error(f"Customer with id {value} does not exist in database {database_name}.")
            raise serializers.ValidationError(f"Customer with id {value} does not exist in database {database_name}.")

    def validate(self, data):
        items_data = data.get('items', [])
        if not items_data:
            raise serializers.ValidationError({'items': 'This field is required.'})

    
        return data

    def create(self, validated_data):
        logger.debug(f"Creating estimate with data: {validated_data}")
        
        if not self.database_name:
            raise ValueError("database_name is required in the serializer context")

        items_data = validated_data.pop('items', [])  # Extract items data
        logger.debug(f"Extracted items data: {items_data}")
        
        # Get user from context
        request = self.context.get('request')
        user = request.user if request else None
        
        logger.info(f"[CURRENCY-ESTIMATE] Creating estimate for user: {user.email if user else 'Unknown'}")
        
        # Get business currency preference if not provided
        if 'currency' not in validated_data or validated_data['currency'] == 'USD':
            try:
                from users.models import Business, BusinessDetails
                from currency.exchange_rate_service import exchange_rate_service
                
                # Get user's business
                if hasattr(user, 'business_id') and user.business_id:
                    business_id = user.business_id
                elif hasattr(user, 'tenant_id') and user.tenant_id:
                    business_id = user.tenant_id
                else:
                    # Try to get from profile
                    from users.models import UserProfile
                    profile = UserProfile.objects.filter(user=user).first()
                    business_id = profile.business_id if profile else None
                
                if business_id:
                    business = Business.objects.get(id=business_id)
                    business_details = BusinessDetails.objects.filter(business=business).first()
                    
                    if business_details and business_details.preferred_currency_code:
                        validated_data['currency'] = business_details.preferred_currency_code
                        logger.info(f"[CURRENCY-ESTIMATE] Set estimate currency to business preference: {business_details.preferred_currency_code}")
                        
                        # Get exchange rate if not USD
                        if business_details.preferred_currency_code != 'USD':
                            try:
                                # Get exchange rate from business currency to USD
                                rate = exchange_rate_service.get_exchange_rate(
                                    business_details.preferred_currency_code, 
                                    'USD'
                                )
                                if rate:
                                    validated_data['exchange_rate'] = rate
                                    validated_data['exchange_rate_date'] = timezone.now()
                                    logger.info(f"[CURRENCY-ESTIMATE] Set exchange rate: {rate} for {business_details.preferred_currency_code} to USD")
                            except Exception as e:
                                logger.error(f"[CURRENCY-ESTIMATE] Error getting exchange rate: {str(e)}")
            except Exception as e:
                logger.error(f"[CURRENCY-ESTIMATE] Error getting business currency preference: {str(e)}")
                # Default to USD if there's any error
                validated_data['currency'] = 'USD'
        
        logger.info(f"[CURRENCY-ESTIMATE] Creating estimate with currency: {validated_data.get('currency', 'USD')}")
        estimate = Estimate.objects.using(self.database_name).create(**validated_data)
        logger.debug(f"Created Estimate {estimate.estimate_num} with data: {validated_data}")
        
         # Generate and set the estimate_num
        estimate.estimate_num = Estimate.generate_estimate_number(estimate.id)
        logger.debug(f"Generated estimate_num for Estimate {estimate.estimate_num}")
        estimate.save(using=self.database_name)
        logger.debug(f"Saved Estimate {estimate.estimate_num}")
        
        # Create Estimate Items
        total_amount = Decimal('0.00')  # Initialize total amount to 0.00
        for item_data in items_data:
            product_id = item_data.pop('product')
            logger.debug(f"Creating EstimateItem for product {product_id} with data: { item_data}")
            product = Product.objects.using(self.database_name).get(pk=product_id)
            logger.debug(f"Product retrieved: {product.id}: {product.name}")
            item = EstimateItem.objects.using(self.database_name).create(
                estimate=estimate,
                product=product,
                **item_data
            )
            
            total_amount += item.quantity * item.unit_price
            
        logger.debug(f"Created EstimateItems for Estimate {estimate.estimate_num}")
        # Calculate and update totalAmount after items are created
        estimate.totalAmount = total_amount
        logger.debug(f"Recalculated totalAmount for Estimate {estimate.estimate_num}: {estimate.totalAmount}")

        # Save the updated Estimate with the calculated totalAmount
        estimate.save(using=self.database_name)
        logger.debug(f"Saved updated Estimate {estimate.estimate_num} with total {estimate.totalAmount}")

        return estimate

    def calculate_total_amount(self, estimate):
        """
        Calculate the total amount for the estimate by summing up the amount of each EstimateItem.
        """
        total = Decimal('0.00')
        for item in estimate.items.all():
            total += item.quantity * item.unit_price
        return total

    
    def get_customer_name(self, obj):
        return obj.customer.customerName if obj.customer else ''

    

class DatabasePrimaryKeyRelatedField(serializers.PrimaryKeyRelatedField):
    def get_queryset(self):
        database_name = self.context.get('database_name')
        if database_name:
            return self.queryset.using(database_name)
        return self.queryset

class SalesOrderItemSerializer(serializers.ModelSerializer):
    product = serializers.CharField(max_length=36)  # Change this to CharField

    class Meta:
        model = SalesOrderItem
        fields = ['id', 'product', 'service', 'description', 'quantity', 'unit_price']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.database_name = self.context.get('database_name')
        logger.debug(f"SalesOrderItemSerializer initialized with database: {self.database_name}")

    def to_internal_value(self, data):
        logger.debug(f"SalesOrderItemSerializer to_internal_value called with data: {data}")
        return super().to_internal_value(data)
    
    def create(self, validated_data):
        database_name = self.context.get('database_name')
        if not database_name:
            raise ValueError("database_name is required in the serializer context")
        return SalesOrderItem.objects.using(database_name).create(**validated_data)
    
    def validate_product(self, value):
        database_name = self.context.get('database_name')
        if not database_name:
            raise ValueError("database_name is required in the serializer context")
        try:
            product = Product.objects.using(database_name).get(pk=value)
            logger.debug(f"Product retrieved: {product.id}: {product.name}")
            return product
        except Product.DoesNotExist:
            logger.error(f"Product with id {value} does not exist in database {database_name}.")
            raise serializers.ValidationError(f"Product with id {value} does not exist in database {database_name}.")

class SalesOrderSerializer(serializers.ModelSerializer):
    items = SalesOrderItemSerializer(many=True)
    customer = serializers.CharField()
    customer_name = serializers.CharField(read_only=True)
    date = DateTimeToDateField()
    totalAmount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)



    class Meta:
        model = SalesOrder
        fields = '__all__'
        read_only_fields = ['order_number']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.database_name = self.context.get('database_name')
        logger.debug(f"SalesOrderSerializer initialized with database: {self.database_name}")

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['totalAmount'] = str(instance.totalAmount)
        return representation

    def to_internal_value(self, data):
        logger.debug(f"SalesOrderSerializer to_internal_value called with data: {data}")
        try:
            converted_data = super().to_internal_value(data)
            logger.debug(f"Base data converted: {converted_data}")
        except Exception as e:
            logger.error(f"Error converting base data: {str(e)}")
            raise
        
        # Process items if present
        items_data = data.get('items')
        if items_data is not None:
            converted_items = []
            for item in items_data:
                logger.debug(f"Processing item: {item}")
                try:
                    item_serializer = EstimateItemSerializer(
                        data=item, 
                        context={'database_name': self.context.get('database_name')}
                    )
                    if item_serializer.is_valid(raise_exception=True):
                        converted_items.append(item_serializer.validated_data)
                        logger.debug(f"Item converted: {item_serializer.validated_data}")
                except Exception as e:
                    logger.error(f"Error processing item {item}: {str(e)}")
                    raise
            
            # Add converted items back to the data
            converted_data['items'] = converted_items
        else:
            logger.error("Items data is None")
            raise serializers.ValidationError({'items': 'This field is required.'})
        
        logger.debug(f"Final converted data: {converted_data}")
        return converted_data

    def validate_date(self, value):
        return parse_date(value) if isinstance(value, str) else value

    def validate_customer(self, value):
        database_name = self.context.get('database_name')
        
        if isinstance(value, str):
            try:
                value = uuid.UUID(value)
            except ValueError:
                raise serializers.ValidationError(f"Invalid UUID format for customer: {value}")
        elif not isinstance(value, uuid.UUID):
            raise serializers.ValidationError(f"Invalid customer identifier: {value}")

        logger.debug(f"Validating customer: {value} in database: {database_name}")
        
        try:
            customer = Customer.objects.using(database_name).get(pk=value)
            logger.debug(f"Customer retrieved: {customer.id}: {customer.business_name}")
            return customer
        except Customer.DoesNotExist:
            logger.error(f"Customer with id {value} does not exist in database {database_name}.")
            raise serializers.ValidationError(f"Customer with id {value} does not exist in database {database_name}.")

    def validate(self, data):
        items_data = data.get('items', [])
        if not items_data:
            raise serializers.ValidationError({'items': 'This field is required.'})
        
        return data
        
    def create(self, validated_data):
        logger.debug(f"SalesOrderSerializer create called with data: {validated_data}")
        
        if not self.database_name:
            raise ValueError("database_name is required in the serializer context")
        
        items_data = validated_data.pop('items', [])
        logger.debug(f"Items data: {items_data}")
        sales_order = SalesOrder.objects.using(self.database_name).create(**validated_data)
        logger.debug(f"Created SalesOrder: {sales_order.order_number} with data: {validated_data}")
        
        
        
        # Create Sales Order items
        total_amount = Decimal('0.00')
        for item_data in items_data:
            product_id = item_data.pop('product')
            logger.debug(f"Product id: {product_id} with data: {item_data}")
            product = Product.objects.using(self.database_name).get(pk=product_id)
            logger.debug(f"Product retrieved: {product.id}: {product.name}")
            item = SalesOrderItem.objects.using(self.database_name).create(
                sales_order=sales_order, 
                product=product,
                **item_data)
            total_amount += item.quantity * item.unit_price
        
        logger.debug(f"Created Sales Order items for SalesOrder: {sales_order.order_number}")
        sales_order.totalAmount = total_amount - sales_order.discount
        sales_order.save(using=self.database_name)
        logger.debug(f"Updated SalesOrder: {sales_order.order_number} with total amount: {sales_order.totalAmount}")
        return sales_order
    
    def calculate_total_amount(self, estimate):
        """
        Calculate the total amount for the estimate by summing up the amount of each EstimateItem.
        """
        total = Decimal('0.00')
        for item in estimate.items.all():
            total += item.quantity * item.unit_price
        return total

    def get_customer_name(self, obj):
        return obj.customer.customerName if obj.customer else ''


  

class DepartmentSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = Department
        fields = ['id', 'dept_code', 'dept_name', 'created_at']
        
class SaleItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SaleItem
        fields = ['product', 'quantity', 'unit_price']

        
class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True)
    invoice = InvoiceSerializer(read_only=True)

    class Meta:
        model = Sale
        fields = ['id', 'product', 'customer', 'quantity', 'total_amount', 'payment_method', 'amount_given', 'change_due', 'created_at', 'created_by', 'items', 'invoice']
        read_only_fields = ['id', 'total_amount', 'change_due', 'created_at', 'created_by', 'invoice']

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        sale = Sale.objects.using(self.context['database_name']).create(**validated_data)
        for item_data in items_data:
            SaleItem.objects.using(self.context['database_name']).create(sale=sale, **item_data)
        return sale
    
class RefundItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = RefundItem
        fields = ['id', 'product', 'quantity', 'unit_price']

class RefundSerializer(serializers.ModelSerializer):
    items = RefundItemSerializer(many=True)

    class Meta:
        model = Refund
        fields = ['id', 'sale', 'date', 'total_amount', 'reason', 'items']

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        refund = Refund.objects.create(**validated_data)
        for item_data in items_data:
            RefundItem.objects.create(refund=refund, **item_data)
        return refund


# ===== POS SERIALIZERS =====

class POSTransactionItemSerializer(serializers.ModelSerializer):
    """
    Serializer for POS transaction line items.
    """
    product_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    service_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    
    # Read-only fields for display
    product_name = serializers.CharField(source='product.name', read_only=True)
    service_name = serializers.CharField(source='service.name', read_only=True)
    
    class Meta:
        model = POSTransactionItem
        fields = [
            'id', 'product_id', 'service_id', 'product_name', 'service_name',
            'item_name', 'item_sku', 'quantity', 'unit_price', 
            'line_discount', 'line_discount_percentage',
            'tax_rate', 'tax_amount', 'tax_inclusive',
            'line_total', 'cost_price'
        ]
        read_only_fields = ['id', 'line_total', 'tax_amount']
    
    def validate(self, data):
        """Ensure either product or service is provided, but not both"""
        product_id = data.get('product_id')
        service_id = data.get('service_id')
        
        if not product_id and not service_id:
            raise serializers.ValidationError("Either product_id or service_id must be provided")
        
        if product_id and service_id:
            raise serializers.ValidationError("Cannot specify both product_id and service_id")
        
        return data
    
    def validate_product_id(self, value):
        """Validate that the product exists and has sufficient stock"""
        if value:
            try:
                product = Product.objects.get(pk=value)
                return product
            except Product.DoesNotExist:
                raise serializers.ValidationError(f"Product with id {value} does not exist")
        return value
    
    def validate_service_id(self, value):
        """Validate that the service exists"""
        if value:
            try:
                service = Service.objects.get(pk=value)
                return service
            except Service.DoesNotExist:
                raise serializers.ValidationError(f"Service with id {value} does not exist")
        return value


class POSTransactionCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating POS transactions.
    """
    items = POSTransactionItemSerializer(many=True)
    customer_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    
    # Display fields
    customer_name = serializers.CharField(source='customer.customerName', read_only=True)
    total_items_count = serializers.IntegerField(source='total_items', read_only=True)
    
    class Meta:
        model = POSTransaction
        fields = [
            'id', 'transaction_number', 'customer_id', 'customer_name',
            'subtotal', 'discount_amount', 'discount_percentage',
            'tax_total', 'total_amount', 'payment_method',
            'amount_tendered', 'change_due', 'status', 'notes',
            'items', 'total_items_count', 'created_at', 'created_by'
        ]
        read_only_fields = [
            'id', 'transaction_number', 'subtotal', 'tax_total', 
            'change_due', 'created_at', 'created_by'
        ]
    
    def validate_customer_id(self, value):
        """Validate customer exists if provided"""
        if value:
            try:
                customer = Customer.objects.get(pk=value)
                return customer
            except Customer.DoesNotExist:
                raise serializers.ValidationError(f"Customer with id {value} does not exist")
        return value
    
    def validate_items(self, value):
        """Validate that at least one item is provided"""
        if not value:
            raise serializers.ValidationError("At least one item is required")
        return value
    
    def validate_amount_tendered(self, value):
        """Validate amount tendered for cash payments"""
        payment_method = self.initial_data.get('payment_method')
        if payment_method == 'cash' and (not value or value <= 0):
            raise serializers.ValidationError("Amount tendered is required for cash payments")
        return value
    
    def validate(self, data):
        """Additional validation for the entire transaction"""
        items = data.get('items', [])
        
        # Check inventory for products
        for item_data in items:
            product = item_data.get('product_id')
            if product and hasattr(product, 'quantity'):
                requested_qty = item_data.get('quantity', 0)
                if product.quantity < requested_qty:
                    raise serializers.ValidationError(
                        f"Insufficient stock for {product.name}. "
                        f"Available: {product.quantity}, Requested: {requested_qty}"
                    )
        
        return data
    
    def create(self, validated_data):
        """Create POS transaction with all related records"""
        items_data = validated_data.pop('items')
        customer = validated_data.pop('customer_id', None)
        validated_data['customer'] = customer
        validated_data['created_by'] = self.context['request'].user
        
        with db_transaction.atomic():
            # Create the transaction
            transaction = POSTransaction.objects.create(**validated_data)
            
            # Create transaction items
            for item_data in items_data:
                product = item_data.pop('product_id', None)
                service = item_data.pop('service_id', None)
                
                # Set item name and SKU from product/service
                if product:
                    item_data['product'] = product
                    item_data['item_name'] = product.name
                    item_data['item_sku'] = getattr(product, 'sku', '')
                    item_data['cost_price'] = getattr(product, 'cost', 0)
                elif service:
                    item_data['service'] = service
                    item_data['item_name'] = service.name
                    item_data['item_sku'] = getattr(service, 'service_code', '')
                
                POSTransactionItem.objects.create(
                    transaction=transaction,
                    **item_data
                )
            
            # Recalculate totals
            transaction.calculate_totals()
            transaction.save()
            
            return transaction


class POSTransactionListSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for listing POS transactions.
    """
    customer_name = serializers.CharField(source='customer.customerName', read_only=True)
    total_items_count = serializers.IntegerField(source='total_items', read_only=True)
    
    class Meta:
        model = POSTransaction
        fields = [
            'id', 'transaction_number', 'customer_name',
            'total_amount', 'payment_method', 'status',
            'total_items_count', 'created_at',
            'currency_code', 'currency_symbol'
        ]


class POSTransactionDetailSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for retrieving POS transactions.
    """
    items = POSTransactionItemSerializer(many=True, read_only=True)
    customer_name = serializers.CharField(source='customer.customerName', read_only=True)
    customer_email = serializers.CharField(source='customer.email', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = POSTransaction
        fields = [
            'id', 'transaction_number', 'customer_name', 'customer_email',
            'subtotal', 'discount_amount', 'discount_percentage',
            'tax_total', 'total_amount', 'payment_method',
            'amount_tendered', 'change_due', 'status', 'notes',
            'items', 'created_at', 'created_by_name',
            'tax_jurisdiction', 'tax_calculation_method', 'shipping_address_used',
            'currency_code', 'currency_symbol'
        ]


class POSRefundItemSerializer(serializers.ModelSerializer):
    """
    Serializer for POS refund line items.
    """
    original_item_name = serializers.CharField(source='original_item.item_name', read_only=True)
    original_quantity = serializers.DecimalField(source='original_item.quantity', max_digits=10, decimal_places=3, read_only=True)
    
    class Meta:
        model = POSRefundItem
        fields = [
            'id', 'original_item', 'original_item_name', 'original_quantity',
            'quantity_returned', 'unit_refund_amount', 'total_refund_amount',
            'condition'
        ]
        read_only_fields = ['id', 'total_refund_amount']


class POSRefundCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating POS refunds.
    """
    items = POSRefundItemSerializer(many=True)
    
    class Meta:
        model = POSRefund
        fields = [
            'id', 'refund_number', 'original_transaction',
            'refund_type', 'total_amount', 'tax_amount',
            'status', 'reason', 'notes', 'items'
        ]
        read_only_fields = ['id', 'refund_number']
    
    def validate_items(self, value):
        """Validate refund items"""
        if not value:
            raise serializers.ValidationError("At least one item is required for refund")
        
        for item_data in value:
            original_item = item_data.get('original_item')
            quantity_returned = item_data.get('quantity_returned', 0)
            
            if not original_item:
                raise serializers.ValidationError("Original item is required")
            
            if quantity_returned <= 0:
                raise serializers.ValidationError("Quantity returned must be greater than 0")
            
            if quantity_returned > original_item.quantity:
                raise serializers.ValidationError(
                    f"Cannot refund more than original quantity. "
                    f"Original: {original_item.quantity}, Requested: {quantity_returned}"
                )
        
        return value
    
    def create(self, validated_data):
        """Create POS refund with all related records"""
        items_data = validated_data.pop('items')
        validated_data['created_by'] = self.context['request'].user
        
        with db_transaction.atomic():
            # Create the refund
            refund = POSRefund.objects.create(**validated_data)
            
            # Create refund items
            for item_data in items_data:
                POSRefundItem.objects.create(
                    refund=refund,
                    **item_data
                )
            
            return refund


class POSRefundListSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for listing POS refunds.
    """
    original_transaction_number = serializers.CharField(source='original_transaction.transaction_number', read_only=True)
    
    class Meta:
        model = POSRefund
        fields = [
            'id', 'refund_number', 'original_transaction_number',
            'refund_type', 'total_amount', 'status', 'created_at'
        ]


class POSSaleCompletionSerializer(serializers.Serializer):
    """
    Serializer for the complete POS sale endpoint that handles everything:
    - Transaction creation
    - Inventory reduction
    - Accounting entries
    """
    # Customer information
    customer_id = serializers.UUIDField(required=False, allow_null=True)
    
    # Transaction items
    items = serializers.ListField(
        child=serializers.DictField(
            child=serializers.CharField()
        ),
        min_length=1
    )
    
    # Payment information
    payment_method = serializers.ChoiceField(choices=POSTransaction.PAYMENT_METHOD_CHOICES)
    amount_tendered = serializers.DecimalField(max_digits=15, decimal_places=4, required=False, allow_null=True)
    
    # Discounts and tax
    discount_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, default=0, required=False)
    tax_rate = serializers.DecimalField(max_digits=5, decimal_places=2, required=False, allow_null=True)
    use_shipping_address = serializers.BooleanField(default=True, required=False)
    
    # Currency fields
    currency_code = serializers.CharField(max_length=3, required=False, default='USD')
    currency_symbol = serializers.CharField(max_length=10, required=False, default='$')
    
    # Backorder fields
    has_backorders = serializers.BooleanField(default=False, required=False)
    
    # Optional fields
    notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate_customer_id(self, value):
        """Validate customer exists if provided"""
        if value:
            try:
                return Customer.objects.get(pk=value)
            except Customer.DoesNotExist:
                raise serializers.ValidationError(f"Customer with id {value} does not exist")
        return None
    
    def validate_items(self, value):
        """Validate and normalize items data"""
        validated_items = []
        
        for item in value:
            # Required fields
            if 'id' not in item:
                raise serializers.ValidationError("Item 'id' is required")
            if 'quantity' not in item:
                raise serializers.ValidationError("Item 'quantity' is required")
            if 'type' not in item or item['type'] not in ['product', 'service']:
                raise serializers.ValidationError("Item 'type' must be 'product' or 'service'")
            
            # Validate quantity
            try:
                quantity = Decimal(str(item['quantity']))
                if quantity <= 0:
                    raise serializers.ValidationError("Item quantity must be greater than 0")
            except (ValueError, TypeError):
                raise serializers.ValidationError("Invalid item quantity")
            
            # Validate item exists
            item_id = item['id']
            if item['type'] == 'product':
                try:
                    product = Product.objects.get(pk=item_id)
                    # Check stock availability (skip if backorder allowed)
                    is_backorder = item.get('is_backorder', False)
                    if hasattr(product, 'quantity') and product.quantity < quantity and not is_backorder:
                        # Only raise error if not a backorder
                        if not self.initial_data.get('has_backorders', False):
                            raise serializers.ValidationError(
                                f"Insufficient stock for {product.name}. "
                                f"Available: {product.quantity}, Requested: {quantity}"
                            )
                    validated_items.append({
                        'type': 'product',
                        'item': product,
                        'quantity': quantity,
                        'unit_price': Decimal(str(item.get('unit_price', product.price or 0))),
                        'is_backorder': is_backorder,
                        'is_partial_backorder': item.get('is_partial_backorder', False),
                        'backorder_quantity': item.get('backorder_quantity', 0)
                    })
                except Product.DoesNotExist:
                    raise serializers.ValidationError(f"Product with id {item_id} does not exist")
            
            elif item['type'] == 'service':
                try:
                    service = Service.objects.get(pk=item_id)
                    validated_items.append({
                        'type': 'service',
                        'item': service,
                        'quantity': quantity,
                        'unit_price': Decimal(str(item.get('unit_price', service.price or 0))),
                    })
                except Service.DoesNotExist:
                    raise serializers.ValidationError(f"Service with id {item_id} does not exist")
        
        return validated_items
    
    def validate_amount_tendered(self, value):
        """Validate amount tendered for cash payments"""
        payment_method = self.initial_data.get('payment_method')
        if payment_method == 'cash' and (not value or value <= 0):
            raise serializers.ValidationError("Amount tendered is required for cash payments")
        return value