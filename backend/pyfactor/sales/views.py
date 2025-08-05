#Users/kuoldeng/projectx/backend/pyfactor/sales/views.py
import base64
from decimal import Decimal
import decimal
import uuid
from django.shortcuts import get_object_or_404, render
from psycopg2 import IntegrityError
from rest_framework import generics, status, serializers, viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from finance.utils import generate_financial_statements, get_or_create_chart_account
from finance.views import get_user_database
from .models import CustomChargePlan, Estimate, EstimateItem, Invoice, Customer, InvoiceItem, Product, Refund, Sale, Service, default_due_datetime, SalesOrder, SalesOrderItem
from finance.models import Account, AccountType, FinanceTransaction
from users.models import UserProfile
from .serializers import CustomChargePlanSerializer, CustomerIncomeSerializer, InvoiceSerializer, CustomerSerializer, ProductSerializer, RefundSerializer, SaleSerializer, ServiceSerializer,  EstimateSerializer, EstimateAttachmentSerializer, SalesOrderSerializer, EstimateAttachmentSerializer, EstimateItemSerializer, SalesOrderItemSerializer, InvoiceItemSerializer
from finance.serializers import TransactionSerializer
from django.conf import settings
from django.db import connections, transaction as db_transaction
from finance.account_types import ACCOUNT_TYPES
from pyfactor.userDatabaseRouter import UserDatabaseRouter
from pyfactor.user_console import console
from pyfactor.logging_config import get_logger
from .utils import get_or_create_account, ensure_date 
from datetime import datetime, timedelta, date
from django.db.models import Q
from django.http import FileResponse, HttpResponse
from django.core.mail import EmailMessage
from django.db.models import Sum, DecimalField, F, Case, When, Value
from inventory.serializers import InventoryItemSerializer
from .utils import generate_pdf
from dateutil import parser
from django.core.exceptions import ObjectDoesNotExist
from .utils import get_or_create_user_database
import traceback
from decimal import Decimal
from rest_framework.exceptions import ValidationError
from finance.utils import create_general_ledger_entry, update_chart_of_accounts
from django.apps import apps
from barcode import generate
from barcode.writer import ImageWriter
from io import BytesIO

logger = get_logger()


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_custom_charge_plan(request):
    serializer = CustomChargePlanSerializer(data=request.data)
    if serializer.is_valid():
        plan = serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_custom_charge_plans(request):
    plans = CustomChargePlan.objects.all()
    serializer = CustomChargePlanSerializer(plans, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_invoice(request):
    """Create a new invoice with dynamic table creation tracking"""
    # Generate a unique request ID for tracking
    request_id = uuid.uuid4().hex[:8]
    
    logger.info(f"[DYNAMIC-INVOICE-{request_id}] Create Invoice requested by user {request.user.id}")
    logger.debug(f"[DYNAMIC-INVOICE-{request_id}] Received request data: {request.data}")
    
    user = request.user
    if not user.is_authenticated:
        logger.warning(f"[DYNAMIC-INVOICE-{request_id}] Unauthenticated user attempted to create invoice")
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        # Get database information
        database_name = get_user_database(user)
        logger.info(f"[DYNAMIC-INVOICE-{request_id}] Using database {database_name} for invoice creation")
        
        # Check if invoice table exists before we try to use it
        with connections['default'].cursor() as cursor:
            # Extract schema name from database
            schema_name = database_name.split('_')[0]
            logger.info(f"[DYNAMIC-INVOICE-{request_id}] Checking if sales_invoice table exists in schema {schema_name}")
            
            cursor.execute("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_schema = %s AND table_name = 'sales_invoice'
                )
            """, [schema_name])
            
            table_exists = cursor.fetchone()[0]
            logger.info(f"[DYNAMIC-INVOICE-{request_id}] Invoice table exists: {table_exists}")
            
            if not table_exists:
                logger.info(f"[DYNAMIC-INVOICE-{request_id}] Invoice table will be created dynamically")
                
            # Also check for invoice items table
            cursor.execute("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_schema = %s AND table_name = 'sales_invoiceitem'
                )
            """, [schema_name])
            
            items_table_exists = cursor.fetchone()[0]
            logger.info(f"[DYNAMIC-INVOICE-{request_id}] Invoice Items table exists: {items_table_exists}")
        
        ensure_database_exists(database_name)
        
        # Set up accounts
        logger.debug(f"[DYNAMIC-INVOICE-{request_id}] Setting up finance accounts")
        accounts_receivable = get_or_create_account(database_name, 'Accounts Receivable', 'Asset')
        sales_revenue = get_or_create_account(database_name, 'Sales Revenue', 'Revenue')
        sales_tax_payable = get_or_create_account(database_name, 'Sales Tax Payable', 'Liability')
        inventory = get_or_create_account(database_name, 'Inventory', 'Asset')
        cost_of_goods_sold = get_or_create_account(database_name, 'Cost of Goods Sold', 'Expense')

        with db_transaction.atomic(using=database_name):
            # Log the start of the transaction
            logger.debug(f"[DYNAMIC-INVOICE-{request_id}] Started database transaction")
            
            serializer = InvoiceSerializer(data=request.data, context={'database_name': database_name, 'request': request})
            if serializer.is_valid():
                # Log that we're about to save the invoice, which may trigger table creation
                logger.info(f"[DYNAMIC-INVOICE-{request_id}] Invoice data valid, creating invoice object")
                
                invoice = serializer.save()
                total_amount = Decimal(str(invoice.totalAmount))
                
                try:
                    tax_amount = Decimal(str(invoice.sales_tax_payable)) if invoice.sales_tax_payable else Decimal('0')
                except decimal.InvalidOperation:
                    logger.warning(f"[DYNAMIC-INVOICE-{request_id}] Invalid sales tax value for invoice {invoice.invoice_num}: {invoice.sales_tax_payable}")
                    tax_amount = Decimal('0')

                subtotal = total_amount - tax_amount
                logger.debug(f"[DYNAMIC-INVOICE-{request_id}] Invoice amounts - Total: {total_amount}, Tax: {tax_amount}, Subtotal: {subtotal}")

                # Accounts Receivable (Debit)
                create_general_ledger_entry(database_name, accounts_receivable, total_amount, 'debit', f"Invoice {invoice.invoice_num} created")
                
                # Sales Revenue (Credit)
                create_general_ledger_entry(database_name, sales_revenue, subtotal, 'credit', f"Revenue from Invoice {invoice.invoice_num}")
                
                # Sales Tax Payable (Credit)
                if tax_amount > 0:
                    create_general_ledger_entry(database_name, sales_tax_payable, tax_amount, 'credit', f"Sales tax for Invoice {invoice.invoice_num}")
                
                logger.info(f"[DYNAMIC-INVOICE-{request_id}] Invoice created successfully with ID {invoice.id}")
                
                # Check again if the tables were created
                with connections['default'].cursor() as cursor:
                    cursor.execute("""
                        SELECT EXISTS (
                            SELECT 1 FROM information_schema.tables 
                            WHERE table_schema = %s AND table_name = 'sales_invoice'
                        )
                    """, [schema_name])
                    
                    table_exists_after = cursor.fetchone()[0]
                    if not table_exists and table_exists_after:
                        logger.info(f"[DYNAMIC-INVOICE-{request_id}] Confirmed dynamic creation of sales_invoice table")
                    
                    cursor.execute("""
                        SELECT EXISTS (
                            SELECT 1 FROM information_schema.tables 
                            WHERE table_schema = %s AND table_name = 'sales_invoiceitem'
                        )
                    """, [schema_name])
                    
                    items_table_exists_after = cursor.fetchone()[0]
                    if not items_table_exists and items_table_exists_after:
                        logger.info(f"[DYNAMIC-INVOICE-{request_id}] Confirmed dynamic creation of sales_invoiceitem table")
                
                return Response(InvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)
            else:
                logger.error(f"[DYNAMIC-INVOICE-{request_id}] Validation errors: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.exception(f"[DYNAMIC-INVOICE-{request_id}] Unexpected error: {str(e)}")
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def ensure_database_exists(database_name):
    logger.debug("Creating dynamic database if it doesn't exist: %s", database_name)
    router = UserDatabaseRouter()
    router.create_dynamic_database(database_name)

def ensure_accounts_exist(database_name):
    logger.debug(f"Ensuring necessary accounts exist in database: {database_name}")
    
    # Log existing account types
    existing_account_types = AccountType.objects.using(database_name).all()
    logger.debug(f"Existing AccountTypes: {[at.name for at in existing_account_types]}")

    accounts_to_create = [
        ('Accounts Receivable', 'Accounts Receivable'),
        ('Sales Revenue', 'Sales Revenue'),
        ('Sales Tax Payable', 'Sales Tax Payable'),
        ('Cost of Goods Sold', 'Cost of Goods Sold'),
    ]
    
    for account_name, account_type_name in accounts_to_create:
        logger.debug(f"Processing account: {account_name} of type {account_type_name}")
        try:
            account = get_or_create_account(database_name, account_name, account_type_name)
            logger.debug(f"Successfully processed account: {account}")
        except Exception as e:
            logger.error(f"Error processing account {account_name}: {e}", exc_info=True)
            raise

def get_user_database(user):
    user_profile = UserProfile.objects.using('default').get(user=user)
    return user_profile.database_name

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def invoice_list(request):
    user = request.user
    database_name = get_user_database(user)

    if request.method == 'GET':
        invoices = Invoice.objects.using(database_name).all()
        serializer = InvoiceSerializer(invoices, many=True, context={'database_name': database_name})
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = InvoiceSerializer(data=request.data, context={'database_name': database_name, 'request': request})
        if serializer.is_valid():
            invoice = serializer.save()
            return Response(InvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def invoice_detail(request, pk):
    user = request.user
    database_name = get_user_database(user)

    try:
        invoice = Invoice.objects.using(database_name).get(pk=pk)
    except Invoice.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = InvoiceSerializer(invoice, context={'database_name': database_name})
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = InvoiceSerializer(invoice, data=request.data, context={'database_name': database_name, 'request': request})
        if serializer.is_valid():
            updated_invoice = serializer.save()
            return Response(InvoiceSerializer(updated_invoice).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        invoice.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_customer(request):
    """Create a new customer with dynamic table creation tracking"""
    # Generate a unique request ID for tracking
    request_id = uuid.uuid4().hex[:8]
    
    logger.info(f"[DYNAMIC-CUSTOMER-{request_id}] Create Customer requested by user {request.user.id}")
    logger.debug(f"[DYNAMIC-CUSTOMER-{request_id}] Received request data: {request.data}")
    
    user = request.user

    if not user.is_authenticated:
        logger.warning(f"[DYNAMIC-CUSTOMER-{request_id}] Unauthenticated user attempted to create customer")
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        # Get database information
        database_name = get_user_database(user)
        logger.info(f"[DYNAMIC-CUSTOMER-{request_id}] Using database {database_name} for customer creation")
        
        # Check if customer table exists before we try to use it
        with connections['default'].cursor() as cursor:
            # Extract schema name from database
            schema_name = database_name.split('_')[0]
            logger.info(f"[DYNAMIC-CUSTOMER-{request_id}] Checking if crm_customer table exists in schema {schema_name}")
            
            cursor.execute("""
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_schema = %s AND table_name = 'crm_customer'
                )
            """, [schema_name])
            
            table_exists = cursor.fetchone()[0]
            logger.info(f"[DYNAMIC-CUSTOMER-{request_id}] Customer table exists: {table_exists}")
            
            if not table_exists:
                logger.info(f"[DYNAMIC-CUSTOMER-{request_id}] Customer table will be created dynamically")
        
        ensure_database_exists(database_name)

        with db_transaction.atomic(using=database_name):
            # Log the start of the transaction
            logger.debug(f"[DYNAMIC-CUSTOMER-{request_id}] Started database transaction")
            
            serializer = CustomerSerializer(data=request.data, context={'database_name': database_name})
            if serializer.is_valid():
                # Log that we're about to save the customer, which may trigger table creation
                logger.info(f"[DYNAMIC-CUSTOMER-{request_id}] Customer data valid, creating customer object")
                
                customer = serializer.save()
                logger.info(f"[DYNAMIC-CUSTOMER-{request_id}] Customer created successfully with ID {customer.id}")
                
                # Check again if the table was created
                with connections['default'].cursor() as cursor:
                    cursor.execute("""
                        SELECT EXISTS (
                            SELECT 1 FROM information_schema.tables 
                            WHERE table_schema = %s AND table_name = 'crm_customer'
                        )
                    """, [schema_name])
                    
                    table_exists_after = cursor.fetchone()[0]
                    if not table_exists and table_exists_after:
                        logger.info(f"[DYNAMIC-CUSTOMER-{request_id}] Confirmed dynamic creation of crm_customer table")
                
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                logger.error(f"[DYNAMIC-CUSTOMER-{request_id}] Validation errors: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except ValueError as e:
        logger.error(f"[DYNAMIC-CUSTOMER-{request_id}] ValueError: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except IntegrityError as e:
        logger.error(f"[DYNAMIC-CUSTOMER-{request_id}] IntegrityError: {str(e)}")
        return Response({'error': 'Data integrity error occurred.'}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.exception(f"[DYNAMIC-CUSTOMER-{request_id}] Unexpected error: {str(e)}")
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def customer_list(request):
    logger.debug("Customer List called")
    user = request.user

    try:
        database_name = get_user_database(user)
        ensure_database_exists(database_name)

        customers = Customer.objects.using(database_name).all()
        serializer = CustomerSerializer(customers, many=True)
        return Response(serializer.data)

    except ValueError as e:
        logger.error("ValueError in customer_list: %s", str(e))
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.exception("Error fetching customers: %s", str(e))
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def customer_detail(request, pk):
    """
    API view to get customer details by ID.
    """
    logger.debug("Customer Detail called")
    user = request.user

    try:
        user_profile = UserProfile.objects.using('default').get(user=user)
        database_name = user_profile.database_name
        logger.debug("User Profile: %s", user_profile)
        logger.debug("Database Name from UserProfile: %s", database_name)

        if not database_name:
            logger.error("Database name is empty.")
            return Response({'error': 'Database name is empty.'}, status=status.HTTP_400_BAD_REQUEST)

        # Create the dynamic database if it doesn't exist
        logger.debug(f"Creating dynamic database: %s", database_name)
        router = UserDatabaseRouter()
        router.create_dynamic_database(database_name)
        
        customer = get_object_or_404(Customer.objects.using(database_name), pk=pk)
        logger.debug("Fetched customer: %s", customer)
        serializer = CustomerSerializer(customer)
        return Response(serializer.data)

    except UserProfile.DoesNotExist:
        logger.error("UserProfile does not exist for user: %s", user)
        console.error("UserProfile does not exist for user: %s", user)
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        logger.exception("Error fetching customer detail: %s", str(e))
        console.error("Error fetching customer detail: %s", str(e))
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def income_by_customer(request):
    logger.debug("Income by Customer called")
    user = request.user

    try:
        database_name = get_user_database(user)
        ensure_database_exists(database_name)

        customers = Customer.objects.using(database_name).annotate(
            total_income=Sum('invoices__totalAmount')
        ).order_by('-total_income')

        serializer = CustomerIncomeSerializer(customers, many=True)
        return Response(serializer.data)

    except UserProfile.DoesNotExist:
        logger.error("User profile not found.")
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.exception(f"Error fetching income by customer: {str(e)}")
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def customer_income_detail(request, customer_id):
    logger.debug(f"Customer Income Detail called for customer_id: {customer_id}")
    user = request.user

    try:
        database_name = get_user_database(user)
        ensure_database_exists(database_name)

        customer = Customer.objects.using(database_name).annotate(
            total_income=Sum('invoices__totalAmount')
        ).get(id=customer_id)

        invoices = Invoice.objects.using(database_name).filter(customer=customer)
        
        data = {
            'customer': CustomerIncomeSerializer(customer).data,
            'invoices': [
                {
                    'invoice_num': invoice.invoice_num,
                    'date': invoice.date,
                    'totalAmount': invoice.totalAmount,
                    'status': invoice.status
                } for invoice in invoices
            ]
        }

        return Response(data)

    except Customer.DoesNotExist:
        return Response({'error': 'Customer not found.'}, status=status.HTTP_404_NOT_FOUND)
    except UserProfile.DoesNotExist:
        logger.error("User profile not found.")
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.exception(f"Error fetching customer income detail: {str(e)}")
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_product(request):
    logger.debug("Create Product: Received request data: %s", request.data)
    user = request.user

    try:
        # Get the user profile and database name
        user_profile = UserProfile.objects.using('default').get(user=user)
        database_name = user_profile.database_name
        logger.debug("Database name: %s", database_name)

        # Get user's business to determine business type
        business = Business.objects.using('default').filter(owner=user).first()
        if not business:
            return Response({'error': 'No business found for user'}, status=status.HTTP_400_BAD_REQUEST)

        business_type = business.business_type
        business_subtype_selections = business.business_subtype_selections if hasattr(business, 'business_subtype_selections') else {}
        
        logger.debug(f"Business type: {business_type}")
        logger.debug(f"Business subtype selections: {business_subtype_selections}")

        # Ensure the database exists
        router = UserDatabaseRouter()
        router.create_dynamic_database(database_name)

        # Check if the connection exists
        if database_name not in connections:
            raise ConnectionDoesNotExist(f"The connection '{database_name}' doesn't exist.")

        with db_transaction.atomic(using=database_name):
            # Extract custom_charge_plans data from request
            custom_charge_plans_data = request.data.pop('custom_charge_plans', [])
            
            # Extract business-specific fields from request data
            standard_fields = ['name', 'description', 'price', 'is_for_sale', 'is_for_rent', 
                              'salesTax', 'stock_quantity', 'reorder_level', 'height', 'width', 
                              'height_unit', 'width_unit', 'weight', 'weight_unit', 'charge_period', 
                              'charge_amount']
            
            # Create a copy of request.data for standard fields
            standard_data = {}
            for field in standard_fields:
                if field in request.data:
                    standard_data[field] = request.data.get(field)
            
            # Create the base product
            product_serializer = ProductSerializer(data=standard_data, context={'database_name': database_name})
            if product_serializer.is_valid():
                product = product_serializer.save()
                
                # Handle custom charge plans
                for plan_data in custom_charge_plans_data:
                    plan_id = plan_data.get('id')
                    if plan_id:
                        try:
                            plan = CustomChargePlan.objects.using(database_name).get(id=plan_id)
                            product.custom_charge_plans.add(plan)
                        except CustomChargePlan.DoesNotExist:
                            logger.warning(f"Custom charge plan with id {plan_id} does not exist.")
                    else:
                        plan_serializer = CustomChargePlanSerializer(data=plan_data)
                        if plan_serializer.is_valid():
                            plan = plan_serializer.save()
                            product.custom_charge_plans.add(plan)
                        else:
                            logger.error(f"Invalid custom charge plan data: {plan_serializer.errors}")
                
                # Process business-specific fields
                # Import the utilities here to avoid circular imports
                from sales.utils import get_product_fields_for_business, get_submenu_specific_fields

                # Get the list of fields for this business type
                business_specific_fields = set(get_product_fields_for_business(business))
                # Also get submenu-specific fields
                additional_fields = get_submenu_specific_fields(business_type, business_subtype_selections)
                business_specific_fields.update(additional_fields)
                
                # Remove standard fields
                business_specific_fields = business_specific_fields - set(standard_fields)
                
                # Create or update ProductTypeFields
                type_fields_data = {}
                extra_fields_data = {}
                
                # Classify fields into model fields and extra fields
                from sales.models import ProductTypeFields
                product_type_fields_model_fields = [f.name for f in ProductTypeFields._meta.get_fields()]
                
                for field_name in business_specific_fields:
                    if field_name in request.data:
                        field_value = request.data.get(field_name)
                        if field_value is not None:  # Only process non-empty fields
                            if field_name in product_type_fields_model_fields:
                                type_fields_data[field_name] = field_value
                            else:
                                extra_fields_data[field_name] = field_value
                
                # Add any JSON-formatted extra fields
                if 'extra_fields' in request.data and request.data['extra_fields']:
                    try:
                        if isinstance(request.data['extra_fields'], str):
                            import json
                            additional_extra = json.loads(request.data['extra_fields'])
                        else:
                            additional_extra = request.data['extra_fields']
                        extra_fields_data.update(additional_extra)
                    except Exception as e:
                        logger.error(f"Error parsing extra_fields: {e}")
                
                # Save the type fields
                if type_fields_data or extra_fields_data:
                    type_fields_data['extra_fields'] = extra_fields_data
                    
                    # Create or update ProductTypeFields
                    ProductTypeFields.objects.using(database_name).update_or_create(
                        product=product,
                        defaults=type_fields_data
                    )
                    logger.debug(f"Saved product type fields: {type_fields_data}")

                # No longer create corresponding inventory item
                # The inventory_product table is the single source of truth

                logger.info(f"Product created: {product.id} - {product.name}")
                return Response(ProductSerializer(product).data, status=status.HTTP_201_CREATED)
            else:
                logger.error("Validation errors: %s", product_serializer.errors)
                return Response(product_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except UserProfile.DoesNotExist:
        logger.error("UserProfile does not exist for user: %s", user)
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    except ConnectionDoesNotExist as e:
        logger.error(f"Database connection error: {str(e)}")
        return Response({'error': 'Database connection error. Please try again later.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except ValidationError as e:
        logger.error(f"Validation error: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.exception("Error creating product: %s", str(e))
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_service(request):
    logger.debug("Create Service: Received request data: %s", request.data)
    user = request.user

    try:
        # Get the user profile and database name
        user_profile = UserProfile.objects.using('default').get(user=user)
        database_name = user_profile.database_name
        logger.debug("Database name: %s", database_name)

        # Get user's business to determine business type
        business = Business.objects.using('default').filter(owner=user).first()
        if not business:
            return Response({'error': 'No business found for user'}, status=status.HTTP_400_BAD_REQUEST)

        business_type = business.business_type
        business_subtype_selections = business.business_subtype_selections if hasattr(business, 'business_subtype_selections') else {}
        
        logger.debug(f"Business type: {business_type}")
        logger.debug(f"Business subtype selections: {business_subtype_selections}")

        with db_transaction.atomic(using=database_name):
            # Extract custom_charge_plans data from request
            custom_charge_plans_data = request.data.pop('custom_charge_plans', [])
            
            # Extract standard fields from request data
            standard_fields = ['name', 'description', 'price', 'duration', 'is_recurring', 
                               'salesTax', 'charge_period', 'charge_amount']
            
            # Create a copy of request.data for standard fields
            standard_data = {}
            for field in standard_fields:
                if field in request.data:
                    standard_data[field] = request.data.get(field)
            
            # Create the base service
            serializer = ServiceSerializer(data=standard_data, context={'database_name': database_name})
            if serializer.is_valid():
                service = serializer.save()
                
                # Handle custom charge plans
                for plan_data in custom_charge_plans_data:
                    plan_id = plan_data.get('id')
                    if plan_id:
                        try:
                            plan = CustomChargePlan.objects.using(database_name).get(id=plan_id)
                            service.custom_charge_plans.add(plan)
                        except CustomChargePlan.DoesNotExist:
                            logger.warning(f"Custom charge plan with id {plan_id} does not exist.")
                    else:
                        plan_serializer = CustomChargePlanSerializer(data=plan_data)
                        if plan_serializer.is_valid():
                            plan = plan_serializer.save()
                            service.custom_charge_plans.add(plan)
                        else:
                            logger.error(f"Invalid custom charge plan data: {plan_serializer.errors}")
                
                # Process business-specific fields
                # Import the utilities here to avoid circular imports
                from sales.utils import get_service_fields_for_business, get_submenu_specific_fields

                # Get the list of fields for this business type
                business_specific_fields = set(get_service_fields_for_business(business))
                # Also get submenu-specific fields
                additional_fields = get_submenu_specific_fields(business_type, business_subtype_selections)
                business_specific_fields.update(additional_fields)
                
                # Remove standard fields
                business_specific_fields = business_specific_fields - set(standard_fields)
                
                # Create or update ServiceTypeFields
                type_fields_data = {}
                extra_fields_data = {}
                
                # Classify fields into model fields and extra fields
                from sales.models import ServiceTypeFields
                service_type_fields_model_fields = [f.name for f in ServiceTypeFields._meta.get_fields()]
                
                for field_name in business_specific_fields:
                    if field_name in request.data:
                        field_value = request.data.get(field_name)
                        if field_value is not None:  # Only process non-empty fields
                            if field_name in service_type_fields_model_fields:
                                type_fields_data[field_name] = field_value
                            else:
                                extra_fields_data[field_name] = field_value
                
                # Add any JSON-formatted extra fields
                if 'extra_fields' in request.data and request.data['extra_fields']:
                    try:
                        if isinstance(request.data['extra_fields'], str):
                            import json
                            additional_extra = json.loads(request.data['extra_fields'])
                        else:
                            additional_extra = request.data['extra_fields']
                        extra_fields_data.update(additional_extra)
                    except Exception as e:
                        logger.error(f"Error parsing extra_fields: {e}")
                
                # Save the type fields
                if type_fields_data or extra_fields_data:
                    type_fields_data['extra_fields'] = extra_fields_data
                    
                    # Create or update ServiceTypeFields
                    ServiceTypeFields.objects.using(database_name).update_or_create(
                        service=service,
                        defaults=type_fields_data
                    )
                    logger.debug(f"Saved service type fields: {type_fields_data}")

                logger.info(f"Service created: {service.id} - {service.name}")
                return Response(ServiceSerializer(service).data, status=status.HTTP_201_CREATED)
            else:
                logger.error("Validation errors: %s", serializer.errors)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except UserProfile.DoesNotExist:
        logger.error("UserProfile does not exist for user: %s", user)
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.exception("Error creating service: %s", str(e))
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_product(request, pk):
    logger.debug(f"Update Product: Received request data for product {pk}: %s", request.data)
    user = request.user

    try:
        # Get the user profile and database name
        user_profile = UserProfile.objects.using('default').get(user=user)
        database_name = user_profile.database_name
        
        # Get user's business to determine business type
        business = Business.objects.using('default').filter(owner=user).first()
        if not business:
            return Response({'error': 'No business found for user'}, status=status.HTTP_400_BAD_REQUEST)

        business_type = business.business_type
        business_subtype_selections = business.business_subtype_selections if hasattr(business, 'business_subtype_selections') else {}

        # Ensure database exists
        router = UserDatabaseRouter()
        router.create_dynamic_database(database_name)

        with db_transaction.atomic(using=database_name):
            # Get the product
            try:
                product = Product.objects.using(database_name).get(pk=pk)
            except Product.DoesNotExist:
                return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)
            
            # Extract custom_charge_plans data from request
            custom_charge_plans_data = request.data.pop('custom_charge_plans', [])
            
            # Extract standard fields from request data
            standard_fields = ['name', 'description', 'price', 'is_for_sale', 'is_for_rent', 
                              'salesTax', 'stock_quantity', 'reorder_level', 'height', 'width', 
                              'height_unit', 'width_unit', 'weight', 'weight_unit', 'charge_period', 
                              'charge_amount']
            
            # Create a copy of request.data for standard fields
            standard_data = {}
            for field in standard_fields:
                if field in request.data:
                    standard_data[field] = request.data.get(field)
            
            # Update the base product
            product_serializer = ProductSerializer(product, data=standard_data, partial=True)
            if product_serializer.is_valid():
                product = product_serializer.save()
                
                # Handle custom charge plans - clear existing and add new ones
                product.custom_charge_plans.clear()
                for plan_data in custom_charge_plans_data:
                    plan_id = plan_data.get('id')
                    if plan_id:
                        try:
                            plan = CustomChargePlan.objects.using(database_name).get(id=plan_id)
                            product.custom_charge_plans.add(plan)
                        except CustomChargePlan.DoesNotExist:
                            logger.warning(f"Custom charge plan with id {plan_id} does not exist.")
                    else:
                        plan_serializer = CustomChargePlanSerializer(data=plan_data)
                        if plan_serializer.is_valid():
                            plan = plan_serializer.save()
                            product.custom_charge_plans.add(plan)
                        else:
                            logger.error(f"Invalid custom charge plan data: {plan_serializer.errors}")
                
                # Process business-specific fields
                from sales.utils import get_product_fields_for_business, get_submenu_specific_fields

                # Get the list of fields for this business type
                business_specific_fields = set(get_product_fields_for_business(business))
                additional_fields = get_submenu_specific_fields(business_type, business_subtype_selections)
                business_specific_fields.update(additional_fields)
                
                # Remove standard fields
                business_specific_fields = business_specific_fields - set(standard_fields)
                
                # Create or update ProductTypeFields
                type_fields_data = {}
                extra_fields_data = {}
                
                # Get existing type fields or create new
                from sales.models import ProductTypeFields
                type_fields, created = ProductTypeFields.objects.using(database_name).get_or_create(product=product)
                
                # If not created, get existing extra fields
                if not created and type_fields.extra_fields:
                    extra_fields_data = type_fields.extra_fields
                
                # Update with new values
                product_type_fields_model_fields = [f.name for f in ProductTypeFields._meta.get_fields()]
                
                for field_name in business_specific_fields:
                    if field_name in request.data:
                        field_value = request.data.get(field_name)
                        if field_name in product_type_fields_model_fields:
                            type_fields_data[field_name] = field_value
                        else:
                            extra_fields_data[field_name] = field_value
                
                # Add any JSON-formatted extra fields
                if 'extra_fields' in request.data and request.data['extra_fields']:
                    try:
                        if isinstance(request.data['extra_fields'], str):
                            import json
                            additional_extra = json.loads(request.data['extra_fields'])
                        else:
                            additional_extra = request.data['extra_fields']
                        extra_fields_data.update(additional_extra)
                    except Exception as e:
                        logger.error(f"Error parsing extra_fields: {e}")
                
                # Save the type fields
                type_fields_data['extra_fields'] = extra_fields_data
                
                # Update ProductTypeFields
                for key, value in type_fields_data.items():
                    setattr(type_fields, key, value)
                type_fields.save(using=database_name)
                
                logger.info(f"Product updated: {product.id} - {product.name}")
                return Response(ProductSerializer(product).data)
            else:
                logger.error("Validation errors: %s", product_serializer.errors)
                return Response(product_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except UserProfile.DoesNotExist:
        logger.error("UserProfile does not exist for user: %s", user)
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.exception("Error updating product: %s", str(e))
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def product_list(request):
    logger.debug("Product List called")
    user = request.user

    try:
        user_profile = UserProfile.objects.using('default').get(user=user)
        database_name = user_profile.database_name

        if not database_name:
            logger.error("Database name is empty.")
            return Response({'error': 'Database name is empty.'}, status=status.HTTP_400_BAD_REQUEST)

        router = UserDatabaseRouter()
        router.create_dynamic_database(database_name)

        # Get query parameters
        sort_by = request.GET.get('sort_by', 'name')
        sort_order = request.GET.get('sort_order', 'asc')
        search = request.GET.get('search', '')

        # Apply sorting and filtering
        products = Product.objects.using(database_name).all()

        if search:
            products = products.filter(
                Q(name__icontains=search) | 
                Q(description__icontains=search)
            )

        if sort_order == 'desc':
            sort_by = f'-{sort_by}'

        products = products.order_by(sort_by)

        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data)

    except UserProfile.DoesNotExist:
        logger.error(f"UserProfile does not exist for user: {user}")
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        logger.exception(f"Error fetching products: {str(e)}")
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def product_detail(request, pk):
    logger.debug(f"Product Detail called for product_id: {pk}")
    user = request.user

    try:
        user_profile = UserProfile.objects.using('default').get(user=user)
        database_name = user_profile.database_name

        if not database_name:
            logger.error("Database name is empty.")
            return Response({'error': 'Database name is empty.'}, status=status.HTTP_400_BAD_REQUEST)

        router = UserDatabaseRouter()
        router.create_dynamic_database(database_name)

        try:
            product = Product.objects.using(database_name).get(pk=pk)
        except Product.DoesNotExist:
            logger.error(f"Product with id {pk} not found in database {database_name}")
            return Response({'error': 'Product not found.'}, status=status.HTTP_404_NOT_FOUND)

        if request.method == 'GET':
            serializer = ProductSerializer(product)
            return Response(serializer.data)

        elif request.method == 'PUT':
            serializer = ProductSerializer(product, data=request.data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        elif request.method == 'DELETE':
            product.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

    except UserProfile.DoesNotExist:
        logger.error(f"UserProfile does not exist for user: {user}")
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        logger.exception(f"Error processing product detail: {str(e)}")
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def service_list(request):
    """
    API view to list all services.
    """
    logger.debug("Service List called")
    user = request.user
    logger.debug("User: %s", user)

    try:
        user_profile = UserProfile.objects.using('default').get(user=user)
        database_name = user_profile.database_name
        logger.debug("User Profile: %s", user_profile)
        logger.debug("Database Name from UserProfile: %s", database_name)

        if not database_name:
            logger.error("Database name is empty.")
            return Response({'error': 'Database name is empty.'}, status=status.HTTP_400_BAD_REQUEST)

        # Create the dynamic database if it doesn't exist
        logger.debug(f"Creating dynamic database: %s", database_name)
        router = UserDatabaseRouter()
        router.create_dynamic_database(database_name)
        
        services = Service.objects.using(database_name).all()
        logger.debug("Fetched services: %s", services)
        serializer = ServiceSerializer(services, many=True)
        return Response(serializer.data)

    except UserProfile.DoesNotExist:
        logger.error("UserProfile does not exist for user: %s", user)
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        logger.exception("Error fetching services: %s", str(e))
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def customer_invoices(request, customer_id):
    """
    API view to list all invoices for a specific customer.
    """
    logger.debug(f"Customer Invoices called for customer_id: {customer_id}")
    user = request.user

    try:
        user_profile = get_object_or_404(UserProfile.objects.using('default'), user=user)
        database_name = user_profile.database_name

        if not database_name:
            logger.error("Database name is empty.")
            return Response({'error': 'Database name is empty.'}, status=status.HTTP_400_BAD_REQUEST)

        # Create the dynamic database if it doesn't exist
        logger.debug(f"Creating dynamic database: {database_name}")
        router = UserDatabaseRouter()
        router.create_dynamic_database(database_name)
        
        invoices = Invoice.objects.using(database_name).filter(customer_id=customer_id)
        logger.debug(f"Fetched invoices for customer {customer_id}: {invoices}")

        serializer = InvoiceSerializer(invoices, many=True, context={'database_name': database_name})
        return Response(serializer.data)

    except UserProfile.DoesNotExist:
        logger.error(f"UserProfile does not exist for user: {user}")
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        logger.exception(f"Error fetching invoices for customer {customer_id}: {str(e)}")
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def customer_transactions(request, customer_id):
    """
    API view to list all transactions for a specific customer.
    """
    logger.debug(f"Customer Transactions called for customer_id: {customer_id}")
    user = request.user

    try:
        user_profile = UserProfile.objects.using('default').get(user=user)
        database_name = user_profile.database_name

        if not database_name:
            logger.error("Database name is empty.")
            return Response({'error': 'Database name is empty.'}, status=status.HTTP_400_BAD_REQUEST)

        # Create the dynamic database if it doesn't exist
        logger.debug(f"Creating dynamic database: {database_name}")
        router = UserDatabaseRouter()
        router.create_dynamic_database(database_name)
        
        # First, get all invoices for the customer
        invoices = Invoice.objects.using(database_name).filter(customer_id=customer_id)
        
        # Then, get all transactions related to these invoices
        transactions = FinanceTransaction.objects.using(database_name).filter(invoice__in=invoices)
        
        logger.debug(f"Fetched transactions for customer {customer_id}: {transactions}")
        serializer = TransactionSerializer(transactions, many=True)
        return Response(serializer.data)

    except UserProfile.DoesNotExist:
        logger.error(f"UserProfile does not exist for user: {user}")
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        logger.exception(f"Error fetching transactions for customer {customer_id}: {str(e)}")
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def invoice_detail(request, invoice_id):
    """
    API view to get invoice details by ID.
    """
    logger.debug(f"Invoice Detail called for invoice_id: {invoice_id}")
    user = request.user

    try:
        user_profile = UserProfile.objects.using('default').get(user=user)
        database_name = user_profile.database_name

        if not database_name:
            logger.error("Database name is empty.")
            return Response({'error': 'Database name is empty.'}, status=status.HTTP_400_BAD_REQUEST)

        # Ensure the dynamic database exists
        logger.debug(f"Using database: {database_name}")
        router = UserDatabaseRouter()
        router.create_dynamic_database(database_name)
        
        try:
            invoice = Invoice.objects.using(database_name).get(id=invoice_id)
            logger.debug(f"Fetched invoice: {invoice}")
            serializer = InvoiceSerializer(invoice)
            return Response(serializer.data)
        except Invoice.DoesNotExist:
            logger.error(f"Invoice with id {invoice_id} does not exist in database {database_name}.")
            return Response({'error': 'Invoice not found.'}, status=status.HTTP_404_NOT_FOUND)

    except UserProfile.DoesNotExist:
        logger.error(f"UserProfile does not exist for user: {user}")
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        logger.exception(f"Error fetching invoice {invoice_id}: {str(e)}")
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_customer(request, pk):
    """
    API view to update a customer.
    """
    logger.debug(f"Update Customer: Received request data for customer {pk}: %s", request.data)
    user = request.user

    try:
        user_profile = UserProfile.objects.using('default').get(user=user)
        database_name = user_profile.database_name
        logger.debug("Database name: %s", database_name)

        router = UserDatabaseRouter()
        router.create_dynamic_database(database_name)

        with db_transaction.atomic(using=database_name):
            customer = get_object_or_404(Customer.objects.using(database_name), pk=pk)
            if request.method == 'PUT':
                serializer = CustomerSerializer(customer, data=request.data)
            else:  # PATCH
                serializer = CustomerSerializer(customer, data=request.data, partial=True)
            if serializer.is_valid():
                updated_customer = serializer.save()
                logger.debug("Customer updated: %s", serializer.data)
                return Response(serializer.data)
            else:
                logger.error("Validation errors: %s", serializer.errors)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except UserProfile.DoesNotExist:
        logger.error("UserProfile does not exist for user: %s", user)
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.exception("Error updating customer: %s", str(e))
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_customer(request, pk):
    """
    API view to delete a customer.
    """
    logger.debug(f"Delete Customer: Received request to delete customer {pk}")
    user = request.user

    try:
        user_profile = UserProfile.objects.using('default').get(user=user)
        database_name = user_profile.database_name
        logger.debug("Database name: %s", database_name)

        router = UserDatabaseRouter()
        router.create_dynamic_database(database_name)

        with db_transaction.atomic(using=database_name):
            customer = get_object_or_404(Customer.objects.using(database_name), pk=pk)
            customer.delete()
            logger.debug(f"Customer {pk} deleted successfully")
            return Response(status=status.HTTP_204_NO_CONTENT)
    except UserProfile.DoesNotExist:
        logger.error("UserProfile does not exist for user: %s", user)
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.exception("Error deleting customer: %s", str(e))
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def service_detail(request, pk):
    logger.debug(f"Service Detail called for product_id: {pk}")
    user = request.user

    try:
        user_profile = UserProfile.objects.using('default').get(user=user)
        database_name = user_profile.database_name

        if not database_name:
            logger.error("Database name is empty.")
            return Response({'error': 'Database name is empty.'}, status=status.HTTP_400_BAD_REQUEST)

        router = UserDatabaseRouter()
        router.create_dynamic_database(database_name)

        service = Service.objects.using(database_name).get(pk=pk)

        if request.method == 'PUT':
            serializer = ServiceSerializer(service, data=request.data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        elif request.method == 'DELETE':
            service.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

    except UserProfile.DoesNotExist:
        logger.error(f"UserProfile does not exist for user: {user}")
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    except Product.DoesNotExist:
        return Response({'error': 'Service not found.'}, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        logger.exception(f"Error processing product detail: {str(e)}")
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_estimates(request):
    logger.debug("List Estimates called")
    user = request.user

    try:
        user_profile = UserProfile.objects.using('default').get(user=user)
        database_name = user_profile.database_name

        if not database_name:
            logger.error("Database name is empty.")
            return Response({'error': 'Database name is empty.'}, status=status.HTTP_400_BAD_REQUEST)

        router = UserDatabaseRouter()
        router.create_dynamic_database(database_name)

        estimates = Estimate.objects.using(database_name).all().prefetch_related('items', 'customer')
        serializer = EstimateSerializer(estimates, many=True, context={'database_name': database_name})
        return Response(serializer.data)

    except UserProfile.DoesNotExist:
        logger.error("User profile not found.")
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.exception(f"Error fetching estimates: {str(e)}")
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_estimate(request):
    """
    API view to create a new estimate.
    """
    logger.debug("Create Estimate called with request data: %s", request.data)
    user = request.user
    
    
    if not user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)


    try:
        database_name = get_user_database(user)
        logger.debug("Database name: %s", database_name)
        ensure_database_exists(database_name)
        logger.debug("Database {database_name} exists.")
        ensure_accounts_exist(database_name)
        logger.debug("Accounts exist.")
        


        with db_transaction.atomic(using=database_name):
            data = request.data
            data['date'] = ensure_date(data.get('date', timezone.now()))
            data['valid_until'] = ensure_date(data.get('valid_until', default_due_datetime()))
            estimate = create_estimate_with_transaction(data, database_name, request)
            return Response(EstimateSerializer(estimate).data, status=status.HTTP_201_CREATED)
      
    except UserProfile.DoesNotExist:
        logger.error("User profile not found.")
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.exception(f"Unexpected error creating estimate: {e}")
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def create_estimate_with_transaction(data, database_name, request=None):
    logger.debug(f"Creating estimate with transaction in database: {database_name}")
    logger.debug(f"Data received: {data}")

    estimate_serializer = EstimateSerializer(data=data, context={'database_name': database_name, 'request': request})
    
    if estimate_serializer.is_valid(raise_exception=True):
        estimate = estimate_serializer.save()
        logger.debug(f"Estimate saved: {estimate.estimate_num}")
        
          # Add general ledger entries here (if you want to record estimates in the general ledger)
        create_general_ledger_entry(database_name,
                                    get_or_create_account(database_name, 'Estimated Receivables', 'Current Asset'),
                                    estimate.total_amount,
                                    'debit',
                                    f"Estimate {estimate.estimate_num} created")
        create_general_ledger_entry(database_name,
                                    get_or_create_account(database_name, 'Estimated Revenue', 'Revenue'),
                                    estimate.total_amount,
                                    'credit',
                                    f"Estimated Revenue from Estimate {estimate.estimate_num}")


        # No need to process items here, as they are already processed in the serializer's create method

        return estimate
        
def ensure_date(date_value):
    if isinstance(date_value, str):
        try:
            parsed_date = parser.isoparse(date_value)
            return parsed_date  # Return the full datetime object
        except ValueError:
            raise ValueError(f"Invalid date format: {date_value}")
    elif isinstance(date_value, (datetime, date)):
        return datetime.combine(date_value, datetime.min.time())  # Convert to datetime if needed
    else:
        raise ValueError(f"Unsupported date type: {type(date_value)}")
def default_valid_until():
    return timezone.now() + timedelta(days=30)

def get_user_database(user):
    user_profile = UserProfile.objects.using('default').get(user=user)
    return user_profile.database_name

def ensure_database_exists(database_name):
    logger.debug("Creating dynamic database if it doesn't exist: %s", database_name)
    router = UserDatabaseRouter()
    router.create_dynamic_database(database_name)
    

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def estimate_detail(request, pk):
    logger.debug(f"Estimate Detail called for estimate_id: {pk}")
    user = request.user

    try:
        user_profile = UserProfile.objects.using('default').get(user=user)
        database_name = user_profile.database_name

        if not database_name:
            logger.error("Database name is empty.")
            return Response({'error': 'Database name is empty.'}, status=status.HTTP_400_BAD_REQUEST)

        router = UserDatabaseRouter()
        router.create_dynamic_database(database_name)
        
        estimate = get_object_or_404(Estimate.objects.using(database_name).prefetch_related('items', 'customer'), pk=pk)
        logger.debug(f"Fetched estimate: {estimate}")
        serializer = EstimateSerializer(estimate, context={'database_name': database_name})
        return Response(serializer.data)

    except UserProfile.DoesNotExist:
        logger.error(f"UserProfile does not exist for user: {user}")
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.exception(f"Error fetching estimate {pk}: {str(e)}")
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_estimate(request, pk):
    """
    API view to update an estimate.
    """
    logger.debug(f"Update Estimate: Received request data for estimate {pk}: %s", request.data)
    user = request.user

    try:
        user_profile = UserProfile.objects.using('default').get(user=user)
        database_name = user_profile.database_name
        logger.debug("Database name: %s", database_name)

        router = UserDatabaseRouter()
        router.create_dynamic_database(database_name)

        with db_transaction.atomic(using=database_name):
            estimate = get_object_or_404(Estimate.objects.using(database_name), pk=pk)
            if request.method == 'PUT':
                serializer = EstimateSerializer(estimate, data=request.data)
            else:  # PATCH
                serializer = EstimateSerializer(estimate, data=request.data, partial=True)
            if serializer.is_valid():
                updated_estimate = serializer.save()
                logger.debug("Estimate updated: %s", serializer.data)
                return Response(serializer.data)
            else:
                logger.error("Validation errors: %s", serializer.errors)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except UserProfile.DoesNotExist:
        logger.error("UserProfile does not exist for user: %s", user)
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.exception("Error updating estimate: %s", str(e))
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_estimate(request, pk):
    """
    API view to delete an estimate.
    """
    logger.debug(f"Delete Estimate: Received request to delete estimate {pk}")
    user = request.user

    try:
        user_profile = UserProfile.objects.using('default').get(user=user)
        database_name = user_profile.database_name
        logger.debug("Database name: %s", database_name)

        router = UserDatabaseRouter()
        router.create_dynamic_database(database_name)

        with db_transaction.atomic(using=database_name):
            estimate = get_object_or_404(Estimate.objects.using(database_name), pk=pk)
            estimate.delete()
            logger.debug(f"Estimate {pk} deleted successfully")
            return Response(status=status.HTTP_204_NO_CONTENT)
    except UserProfile.DoesNotExist:
        logger.error("UserProfile does not exist for user: %s", user)
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.exception("Error deleting estimate: %s", str(e))
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    

    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def estimate_pdf(request, estimate_id):
    user = request.user
    database_name = get_user_database(user)
    
    try:
        estimate = get_object_or_404(Estimate.objects.using(database_name), id=estimate_id)
        pdf = generate_pdf(estimate)
        return FileResponse(pdf, content_type='application/pdf')
    except Exception as e:
        logger.error(f"Error generating PDF for estimate {estimate_id}: {str(e)}")
        return Response({'error': 'Failed to generate PDF'}, status=500)

@api_view(['POST'])
def save_estimate(request, estimate_id):
    estimate = get_object_or_404(Estimate, id=estimate_id)
    estimate.status = 'saved'
    estimate.save()
    return Response({'status': 'saved'})

@api_view(['POST'])
def print_estimate(request, estimate_id):
    # In a real-world scenario, you might send this to a printing service
    # For now, we'll just return the PDF
    estimate = get_object_or_404(Estimate, id=estimate_id)
    pdf = generate_pdf(estimate)
    return FileResponse(pdf, content_type='application/pdf')

@api_view(['POST'])
def email_estimate(request, estimate_id):
    estimate = get_object_or_404(Estimate, id=estimate_id)
    pdf = generate_pdf(estimate)
    
    # Get the company email from settings or the business model
    from django.conf import settings
    company_email = settings.COMPANY_EMAIL

    if not company_email:
        return Response({'error': 'Company email not set'}, status=400)

    email = EmailMessage(
        'Estimate',
        'Please find attached the estimate you requested.',
        company_email,
        [estimate.customer.email],
    )
    email.attach(f'estimate_{estimate.id}.pdf', pdf.read(), 'application/pdf')
    email.send()

    return Response({'status': 'email sent'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_sales_order(request):
    logger.debug("Create Sales Order: Received request data: %s", request.data)
    user = request.user

    if not user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        database_name = get_user_database(user)
        logger.debug("Database name: %s", database_name)
        ensure_database_exists(database_name)
        logger.debug("Database {database_name} exists")
        ensure_accounts_exist(database_name)
        logger.debug("Accounts exist")

        with db_transaction.atomic(using=database_name):
            data = request.data
            data['date'] = ensure_date(data.get('date', timezone.now()))
            sales_order = create_sales_order_with_transaction(data, database_name)
            return Response(SalesOrderSerializer(sales_order, context={'database_name': database_name}).data, status=status.HTTP_201_CREATED)

    except UserProfile.DoesNotExist:
        logger.error("UserProfile does not exist for user: %s", user)
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.exception("Unexpected error creating sales order: %s", str(e))
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def create_sales_order_with_transaction(data, database_name):
    logger.debug(f"Creating sales order with transaction in database: {database_name}")
    logger.debug(f"Data received: {data}")

    sales_order_serializer = SalesOrderSerializer(data=data, context={'database_name': database_name})
    
    if sales_order_serializer.is_valid(raise_exception=True):
        sales_order = sales_order_serializer.save()
        logger.debug(f"Sales order created: {sales_order.order_number}")
        
        # Add general ledger entries here
        create_general_ledger_entry(database_name, 
                                    get_or_create_account(database_name, 'Accounts Receivable', 'Current Asset'),
                                    sales_order.total_amount,
                                    'debit',
                                    f"Sales Order {sales_order.order_number} created")
        create_general_ledger_entry(database_name,
                                    get_or_create_account(database_name, 'Sales', 'Revenue'),
                                    sales_order.total_amount,
                                    'credit',
                                    f"Revenue from Sales Order {sales_order.order_number}")



        return sales_order

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_sales_orders(request):
    logger.debug("List Sales Orders called")
    user = request.user

    try:
        database_name = get_user_database(user)
        ensure_database_exists(database_name)

        sales_orders = SalesOrder.objects.using(database_name).all()
        serializer = SalesOrderSerializer(sales_orders, many=True, context={'database_name': database_name})
        return Response(serializer.data)

    except UserProfile.DoesNotExist:
        logger.error("User profile not found.")
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.exception(f"Error fetching sales orders: {str(e)}")
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def sales_order_detail(request, pk):
    logger.debug(f"Sales Order Detail called for sales_order_id: {pk}")
    user = request.user

    try:
        database_name = get_user_database(user)
        ensure_database_exists(database_name)
        
        sales_order = get_object_or_404(SalesOrder.objects.using(database_name).prefetch_related('items', 'customer'), pk=pk)

        if request.method == 'GET':
            serializer = SalesOrderSerializer(sales_order, context={'database_name': database_name})
            return Response(serializer.data)

        elif request.method == 'PUT':
            with db_transaction.atomic(using=database_name):
                serializer = SalesOrderSerializer(sales_order, data=request.data, context={'database_name': database_name})
                if serializer.is_valid():
                    updated_sales_order = serializer.save()
                    
                    items_data = request.data.get('items', [])
                    updated_sales_order.items.all().delete()
                    for item_data in items_data:
                        item_serializer = SalesOrderItemSerializer(data=item_data, context={'database_name': database_name})
                        if item_serializer.is_valid():
                            item_serializer.save(sales_order=updated_sales_order)
                    
                    updated_sales_order.calculate_total_amount()
                    updated_sales_order.save()
                    
                    return Response(SalesOrderSerializer(updated_sales_order, context={'database_name': database_name}).data)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        elif request.method == 'DELETE':
            sales_order.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

    except UserProfile.DoesNotExist:
        logger.error(f"UserProfile does not exist for user: {user}")
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.exception(f"Error processing sales order detail: {str(e)}")
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def product_by_barcode(request, barcode):
    user = request.user
    database_name = get_user_database(user)

    try:
        product = Product.objects.using(database_name).get(product_code=barcode)
        serializer = ProductSerializer(product)
        return Response(serializer.data)
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)
    

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_sale(request):
    user = request.user
    database_name = get_user_database(user)

    with db_transaction.atomic(using=database_name):
        serializer = SaleSerializer(data=request.data, context={'database_name': database_name})
        if serializer.is_valid():
            # Create the sale
            sale = serializer.save(created_by=user)

            # Create the invoice
            invoice = Invoice.objects.using(database_name).create(
                customer=sale.customer,
                totalAmount=sale.total_amount,
                date=sale.created_at,
                due_date=sale.created_at + timedelta(days=30),  # Adjust as needed
                status='paid'
            )

            # Link the sale to the invoice
            sale.invoice = invoice
            sale.save(using=database_name)

            # Create invoice items
            for item in sale.items.all():
                InvoiceItem.objects.using(database_name).create(
                    invoice=invoice,
                    product=item.product,
                    quantity=item.quantity,
                    unit_price=item.unit_price
                )

            # Update accounts
            update_accounts_for_sale(sale, database_name)

            return Response(SaleSerializer(sale).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def update_accounts_for_sale(sale, database_name):
        # Get or create necessary accounts
        cash_account = Account.objects.using(database_name).get_or_create(name='Cash')[0]
        sales_revenue_account = Account.objects.using(database_name).get_or_create(name='Sales Revenue')[0]
        accounts_receivable = Account.objects.using(database_name).get_or_create(name='Accounts Receivable')[0]
        inventory_account = Account.objects.using(database_name).get_or_create(name='Inventory')[0]
        cogs_account = Account.objects.using(database_name).get_or_create(name='Cost of Goods Sold')[0]

        # Record the sale
        if sale.payment_method == 'cash':
            create_general_ledger_entry(database_name, cash_account, sale.total_amount, 'debit', f"Cash sale {sale.id}")
        else:
            create_general_ledger_entry(database_name, accounts_receivable, sale.total_amount, 'debit', f"Credit sale {sale.id}")

        create_general_ledger_entry(database_name, sales_revenue_account, sale.total_amount, 'credit', f"Revenue from sale {sale.id}")

        # Update inventory and record COGS
        for item in sale.items.all():
            product = item.product
            cost = product.price * item.quantity  # Assuming product.price is the cost price
            
            # Reduce inventory
            create_general_ledger_entry(database_name, inventory_account, cost, 'credit', f"Inventory reduction for sale {sale.id}")
            
            # Record COGS
            create_general_ledger_entry(database_name, cogs_account, cost, 'debit', f"COGS for sale {sale.id}")

            # Update product quantity
            product.stock_quantity -= item.quantity
            product.save(using=database_name)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_receipt_data(request, sale_id):
    sale = get_object_or_404(Sale, id=sale_id)
    receipt_data = {
        'sale_id': str(sale.id),
        'product_name': sale.product.name,
        'quantity': sale.quantity,
        'total_amount': str(sale.total_amount),
        'date': sale.created_at.strftime("%Y-%m-%d %H:%M:%S")
    }
    return Response(receipt_data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_product_label_data(request, product_id):
    product = get_object_or_404(Product, id=product_id)
    label_data = {
        'product_code': product.product_code,
        'name': product.name,
        'price': str(product.price),
        'barcode': base64.b64encode(product.get_barcode_image()).decode()
    }
    return Response(label_data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_customers(request):
    query = request.GET.get('q', '')
    user = request.user
    database_name = get_user_database(user)

    customers = Customer.objects.using(database_name).filter(
        Q(customerName__icontains=query) | 
        Q(phone__icontains=query)
    )[:10]  # Limit to 10 results
    serializer = CustomerSerializer(customers, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def print_barcode(request, product_id):
    user = request.user
    database_name = get_user_database(user)

    try:
        product = Product.objects.using(database_name).get(id=product_id)
        
        # Generate barcode
        rv = BytesIO()
        generate('code128', product.product_code, writer=ImageWriter(), output=rv)
        rv.seek(0)

        # Create the HTTP response with the barcode image
        response = HttpResponse(rv, content_type='image/png')
        response['Content-Disposition'] = f'attachment; filename="barcode_{product.product_code}.png"'
        return response
    except Product.DoesNotExist:
        return Response({'error': 'Product not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.exception(f"Error generating barcode for product {product_id}: {str(e)}")
        return Response({'error': 'Failed to generate barcode'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_refund(request):
    user = request.user
    database_name = get_user_database(user)

    serializer = RefundSerializer(data=request.data, context={'database_name': database_name})
    if serializer.is_valid():
        refund = serializer.save()
        return Response(RefundSerializer(refund).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def refund_list(request):
    user = request.user
    database_name = get_user_database(user)

    refunds = Refund.objects.using(database_name).all()
    serializer = RefundSerializer(refunds, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def refund_detail(request, pk):
    user = request.user
    database_name = get_user_database(user)

    try:
        refund = Refund.objects.using(database_name).get(pk=pk)
    except Refund.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    
    serializer = RefundSerializer(refund)
    return Response(serializer.data)



