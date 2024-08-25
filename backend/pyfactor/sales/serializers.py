import uuid
from django.db import connections, transaction as db_transaction
from rest_framework import serializers
from .utils import get_or_create_account, calculate_due_date
from finance.models import Account, FinanceTransaction
from .models import Product, Service, Customer, Bill, Invoice, Vendor, Estimate, SalesOrder, SalesOrderItem, Department, default_due_datetime, EstimateItem, EstimateAttachment
from pyfactor.logging_config import get_logger
from django.utils import timezone
from decimal import Decimal
from datetime import datetime, timedelta, date
from django.utils.dateparse import parse_date


logger = get_logger()

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ['id', 'name', 'description', 'price', 'sellEnabled', 'buyEnabled', 'salesTax', 'product_code', 'stock_quantity', 'reorder_level']
        read_only_fields = ['id', 'product_code']

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
    class Meta:
        model = Service
        fields = ['id', 'name', 'description', 'price', 'sellEnabled', 'buyEnabled', 'salesTax', 'service_code', 'duration', 'is_recurring']
        read_only_fields = ['id', 'service_code']

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

class BillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bill
        fields = ['id', 'bill_num', 'customer', 'amount', 'created_at']

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
            return timezone.localtime(value).date()
        return None

    def to_internal_value(self, value):
        if isinstance(value, date):
            return timezone.make_aware(datetime.combine(value, datetime.min.time()))
        return super().to_internal_value(value)

class InvoiceSerializer(serializers.ModelSerializer):
    transaction = TransactionSerializer(required=False)
    accounts_receivable = serializers.PrimaryKeyRelatedField(queryset=Account.objects.all(), required=False)
    sales_revenue = serializers.PrimaryKeyRelatedField(queryset=Account.objects.all(), required=False)
    sales_tax_payable = serializers.PrimaryKeyRelatedField(queryset=Account.objects.all(), required=False)
    cost_of_goods_sold = serializers.PrimaryKeyRelatedField(queryset=Account.objects.all(), required=False)
    inventory = serializers.PrimaryKeyRelatedField(queryset=Account.objects.all(), required=False)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'))
    date = DateTimeToDateField()
    due_date = DateTimeToDateField(required=False)
    created_at = DateTimeToDateField(read_only=True)
    updated_at = DateTimeToDateField(read_only=True)
    customer = serializers.CharField()

    class Meta:
        model = Invoice
        fields = ['id', 'invoice_num', 'customer', 'amount', 'date', 'created_at', 'updated_at', 'due_date', 'status', 'transaction', 
                  'accounts_receivable', 'sales_revenue', 'sales_tax_payable', 'cost_of_goods_sold', 'inventory']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.database_name = self.context.get('database_name')
        logger.debug(f"InvoiceSerializer initialized with database_name: {self.database_name}")
        if self.database_name:
            self.fields['transaction'] = TransactionSerializer(required=False, context={'database_name': self.database_name})
            self.fields['accounts_receivable'].queryset = Account.objects.using(self.database_name).all()
            self.fields['sales_revenue'].queryset = Account.objects.using(self.database_name).all()
            self.fields['sales_tax_payable'].queryset = Account.objects.using(self.database_name).all()
            self.fields['cost_of_goods_sold'].queryset = Account.objects.using(self.database_name).all()
            self.fields['inventory'].queryset = Account.objects.using(self.database_name).all()
            logger.debug("Account querysets updated for database")

    def to_internal_value(self, data):
        logger.debug(f"to_internal_value called with data: {data}")
        converted_data = super().to_internal_value(data)
        logger.debug(f"Converted data: {converted_data}")
        return converted_data
    
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
            return customer
        except Customer.DoesNotExist:
            logger.error(f"Customer with id {value} does not exist in database {database_name}.")
            raise serializers.ValidationError(f"Customer with id {value} does not exist in database {database_name}.")

    def create(self, validated_data):
        logger.debug(f"Creating invoice with validated data: {validated_data}")
        transaction_data = validated_data.pop('transaction', None)
        
        invoice = Invoice(**validated_data)
        invoice.invoice_num = Invoice.generate_invoice_number(invoice.id)
        
        if 'date' in validated_data and 'due_date' not in validated_data:
            validated_data['due_date'] = calculate_due_date(validated_data['date'])

        accounts = {
            'accounts_receivable': get_or_create_account(self.context['database_name'], 'Accounts Receivable', 'Accounts Receivable'),
            'sales_revenue': get_or_create_account(self.context['database_name'], 'Sales Revenue', 'Sales Revenue'),
            'sales_tax_payable': get_or_create_account(self.context['database_name'], 'Sales Tax Payable', 'Sales Tax Payable'),
            'cost_of_goods_sold': get_or_create_account(self.context['database_name'], 'Cost of Goods Sold', 'Cost of Goods Sold'),
            'inventory': get_or_create_account(self.context['database_name'], 'Inventory', 'Inventory')
        }

        for account_field, account in accounts.items():
            setattr(invoice, account_field, account)

        transaction_instance = None
        if transaction_data:
            transaction_serializer = TransactionSerializer(data=transaction_data, context=self.context)
            if transaction_serializer.is_valid():
                transaction_instance = transaction_serializer.save()
                logger.debug(f"Transaction created: {transaction_instance}")
            else:
                logger.error(f"Transaction validation failed: {transaction_serializer.errors}")
                raise serializers.ValidationError(transaction_serializer.errors)

        with db_transaction.atomic(using=self.context['database_name']):
            invoice.transaction = transaction_instance
            invoice.save(using=self.context['database_name'])
            logger.debug(f"Invoice saved: {invoice}")

        return invoice

class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = ['id', 'vendor_number', 'vendor_name', 'street', 'postcode', 'city', 'state', 'phone']
        read_only_fields = ['id', 'vendor_number']

    def create(self, validated_data):
        database_name = self.context.get('database_name')
        return Vendor.objects.using(database_name).create(**validated_data)

class EstimateItemSerializer(serializers.ModelSerializer):
    product = serializers.CharField(max_length=36)  # Change this to CharField
    description = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = EstimateItem
        fields = ['id', 'product', 'description', 'quantity', 'unit_price']

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
    product = DatabasePrimaryKeyRelatedField(queryset=Product.objects.all(), required=False)

    class Meta:
        model = SalesOrderItem
        fields = ['id', 'product', 'description', 'quantity', 'unit_price']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        database_name = self.context.get('database_name')
        if database_name:
            logger.debug(f"SalesOrderItemSerializer initialized with database: {database_name}")

    def to_internal_value(self, data):
        logger.debug(f"SalesOrderItemSerializer to_internal_value called with data: {data}")
        if 'product' in data and isinstance(data['product'], str):
            try:
                database_name = self.context.get('database_name')
                logger.debug(f"Attempting to fetch product with id {data['product']} from database {database_name}")
                product = Product.objects.using(database_name).get(pk=data['product'])
                data['product'] = product.pk
                logger.debug(f"Product found: {product.id}: {product.name}")
            except Product.DoesNotExist:
                logger.error(f"Product with id {data['product']} not found in database {database_name}")
                raise serializers.ValidationError({'product': f"Product with id {data['product']} does not exist."})
        return super().to_internal_value(data)

class SalesOrderSerializer(serializers.ModelSerializer):
    items = SalesOrderItemSerializer(many=True)
    customer = serializers.CharField()

    class Meta:
        model = SalesOrder
        fields = ['id', 'order_number', 'customer', 'date', 'items', 'discount', 'currency', 'amount']
        read_only_fields = ['order_number', 'amount']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        database_name = self.context.get('database_name')
        if database_name:
            logger.debug(f"SalesOrderSerializer initialized with database: {database_name}")

    def to_internal_value(self, data):
        logger.debug(f"SalesOrderSerializer to_internal_value called with data: {data}")
        return super().to_internal_value(data)

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
            return customer
        except Customer.DoesNotExist:
            logger.error(f"Customer with id {value} does not exist in database {database_name}.")
            raise serializers.ValidationError(f"Customer with id {value} does not exist in database {database_name}.")

    def create(self, validated_data):
        database_name = self.context.get('database_name')
        items_data = validated_data.pop('items')
        sales_order = SalesOrder.objects.using(database_name).create(**validated_data)
        
        for item_data in items_data:
            SalesOrderItem.objects.using(database_name).create(sales_order=sales_order, **item_data)
        
        return sales_order

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'dept_code', 'dept_name', 'created_at']