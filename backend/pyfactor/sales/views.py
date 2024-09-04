from decimal import Decimal
import decimal
from django.shortcuts import get_object_or_404, render
from psycopg2 import IntegrityError
from rest_framework import generics, status, serializers, viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from finance.utils import generate_financial_statements, get_or_create_chart_account
from finance.views import get_user_database
from .models import Estimate, EstimateItem, Invoice, Customer, Product, Service, default_due_datetime, SalesOrder, SalesOrderItem
from finance.models import Account, AccountType, FinanceTransaction
from users.models import UserProfile
from .serializers import CustomerIncomeSerializer, InvoiceSerializer, CustomerSerializer, ProductSerializer, ServiceSerializer,  EstimateSerializer, EstimateAttachmentSerializer, SalesOrderSerializer, EstimateAttachmentSerializer, EstimateItemSerializer, SalesOrderItemSerializer, InvoiceItemSerializer
from finance.serializers import TransactionSerializer
from django.conf import settings
from django.db import connections, transaction as db_transaction
from finance.account_types import ACCOUNT_TYPES
from pyfactor.userDatabaseRouter import UserDatabaseRouter
from pyfactor.user_console import console
from pyfactor.logging_config import get_logger
from .utils import get_or_create_account, ensure_date
from django.db import transaction 
from datetime import datetime, timedelta, date
from django.db.models import Q
from django.http import FileResponse
from django.core.mail import EmailMessage
from django.db.models import Sum, DecimalField, F, Case, When, Value

from .utils import generate_pdf
from dateutil import parser
from django.core.exceptions import ObjectDoesNotExist
from .utils import get_or_create_user_database
import traceback
from decimal import Decimal
from rest_framework.exceptions import ValidationError
from finance.utils import create_general_ledger_entry, update_chart_of_accounts
from django.apps import apps





import uuid

logger = get_logger()




@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_invoice(request):
    logger.debug("Create Invoice: Received request data: %s", request.data)
    user = request.user

    if not user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        database_name = get_user_database(user)
        ensure_database_exists(database_name)
        ensure_accounts_exist(database_name)

        accounts_receivable = get_or_create_chart_account(database_name, 'Accounts Receivable', 'Current Asset')
        sales_revenue = get_or_create_chart_account(database_name, 'Sales Revenue', 'Revenue')
        sales_tax_payable = get_or_create_chart_account(database_name, 'Sales Tax Payable', 'Current Liability')
        inventory = get_or_create_chart_account(database_name, 'Inventory', 'Current Asset')
        cost_of_goods_sold = get_or_create_chart_account(database_name, 'Cost of Goods Sold (COGS)', 'Cost of Goods Sold')

        with db_transaction.atomic(using=database_name):
            serializer = InvoiceSerializer(data=request.data, context={'database_name': database_name})
            if serializer.is_valid():
                invoice = serializer.save()
                total_amount = Decimal(str(invoice.totalAmount))
                
                try:
                    tax_amount = Decimal(str(invoice.sales_tax_payable)) if invoice.sales_tax_payable else Decimal('0')
                except decimal.InvalidOperation:
                    logger.warning(f"Invalid sales tax value for invoice {invoice.invoice_num}: {invoice.sales_tax_payable}")
                    tax_amount = Decimal('0')

                subtotal = total_amount - tax_amount

                # Accounts Receivable (Debit)
                create_general_ledger_entry(database_name, accounts_receivable, total_amount, 'debit', f"Invoice {invoice.invoice_num} created")
                
                # Sales Revenue (Credit)
                create_general_ledger_entry(database_name, sales_revenue, subtotal, 'credit', f"Revenue from Invoice {invoice.invoice_num}")
                
                # Sales Tax Payable (Credit)
                if tax_amount > 0:
                    create_general_ledger_entry(database_name, sales_tax_payable, tax_amount, 'credit', f"Sales tax for Invoice {invoice.invoice_num}")

                # Handle inventory and COGS
                for item in invoice.items.all():
                    if item.product:
                        try:
                            quantity = Decimal(str(item.quantity))
                            cost_price = Decimal(str(item.product.price))  # Assuming this is the cost price
                            cost = quantity * cost_price

                            # Inventory (Credit)
                            create_general_ledger_entry(database_name, inventory, cost, 'credit', f"Inventory reduction for Invoice {invoice.invoice_num}")
                            
                            # Cost of Goods Sold (Debit)
                            create_general_ledger_entry(database_name, cost_of_goods_sold, cost, 'debit', f"COGS for Invoice {invoice.invoice_num}")
                        except decimal.InvalidOperation as e:
                            logger.error(f"Invalid decimal value for item in invoice {invoice.invoice_num}: {e}")
                            # You might want to handle this error, perhaps by skipping this item or rolling back the transaction

                # Generate updated financial statements
                generate_financial_statements(database_name)

                return Response(InvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)
            else:
                logger.error("Validation errors: %s", serializer.errors)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except UserProfile.DoesNotExist:
        logger.error("UserProfile does not exist for user: %s", user)
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.exception("Unexpected error creating invoice: %s", str(e))
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
        serializer = InvoiceSerializer(data=request.data, context={'database_name': database_name})
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
        serializer = InvoiceSerializer(invoice, data=request.data, context={'database_name': database_name})
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
    logger.debug("Create Customer: Received request data: %s", request.data)
    user = request.user

    if not user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        database_name = get_user_database(user)
        ensure_database_exists(database_name)

        with db_transaction.atomic(using=database_name):
            serializer = CustomerSerializer(data=request.data, context={'database_name': database_name})
            if serializer.is_valid():
                customer = serializer.save()
                logger.debug("Customer created: %s", serializer.data)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                logger.error("Validation errors: %s", serializer.errors)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except ValueError as e:
        logger.error("ValueError in create_customer: %s", str(e))
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except IntegrityError as e:
        logger.error("IntegrityError in create_customer: %s", str(e))
        return Response({'error': 'Data integrity error occurred.'}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.exception("Unexpected error creating customer: %s", str(e))
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
        user_profile = UserProfile.objects.using('default').get(user=user)
        database_name = user_profile.database_name
        logger.debug("Database name: %s", database_name)

        router = UserDatabaseRouter()
        router.create_dynamic_database(database_name)

        with transaction.atomic(using=database_name):
            serializer = ProductSerializer(data=request.data, context={'database_name': database_name})
            logger.debug("Serializer: %s", serializer)
            if serializer.is_valid():
                product = serializer.save()
                logger.info(f"Product created: {product.id} - {product.name}")
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                logger.error("Validation errors: %s", serializer.errors)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except UserProfile.DoesNotExist:
        logger.error("UserProfile does not exist for user: %s", user)
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.exception("Error creating product: %s", str(e))
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_service(request):
    logger.debug("Create Service: Received request data: %s", request.data)
    user = request.user

    try:
        user_profile = UserProfile.objects.using('default').get(user=user)
        database_name = user_profile.database_name
        logger.debug("Database name: %s", database_name)

        router = UserDatabaseRouter()
        router.create_dynamic_database(database_name)

        with transaction.atomic(using=database_name):
            serializer = ServiceSerializer(data=request.data, context={'database_name': database_name})
            logger.debug("Serializer: %s", serializer)
            if serializer.is_valid():
                service = serializer.save()
                logger.info(f"Service created: {service.id} - {service.name}")
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                logger.error("Validation errors: %s", serializer.errors)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except UserProfile.DoesNotExist:
        logger.error("UserProfile does not exist for user: %s", user)
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.exception("Error creating service: %s", str(e))
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
            estimate = create_estimate_with_transaction(data, database_name)
            return Response(EstimateSerializer(estimate).data, status=status.HTTP_201_CREATED)
      
    except UserProfile.DoesNotExist:
        logger.error("User profile not found.")
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.exception(f"Unexpected error creating estimate: {e}")
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def create_estimate_with_transaction(data, database_name):
    logger.debug(f"Creating estimate with transaction in database: {database_name}")
    logger.debug(f"Data received: {data}")

    estimate_serializer = EstimateSerializer(data=data, context={'database_name': database_name})
    
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
    
    
