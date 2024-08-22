from decimal import Decimal
from django.shortcuts import get_object_or_404, render
from rest_framework import generics, status, serializers, viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from finance.views import get_user_database
from .models import Estimate, EstimateItem, Invoice, Customer, Product, Service, Vendor, default_due_datetime, Bill, SalesOrder, SalesOrderItem
from finance.models import Account, AccountType, FinanceTransaction
from users.models import UserProfile
from .serializers import InvoiceSerializer, CustomerSerializer, ProductSerializer, ServiceSerializer, VendorSerializer, EstimateSerializer, EstimateAttachmentSerializer, SalesOrderSerializer, EstimateAttachmentSerializer
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
from .utils import generate_pdf
from dateutil import parser
from django.core.exceptions import ObjectDoesNotExist
from .utils import get_or_create_user_database
import traceback
from decimal import Decimal


import uuid

logger = get_logger()

def ensure_accounts_exist(database_name):
    logger.debug("Ensuring necessary accounts exist in database: %s", database_name)
    required_accounts = [
        ('Accounts Receivable', 'Accounts Receivable'),
        ('Sales Revenue', 'Sales Revenue'),
        ('Sales Tax Payable', 'Sales Tax Payable'),
        ('Cost of Goods Sold', 'Cost of Goods Sold'),
        ('Inventory', 'Inventory'),
        ('Accounts Payable', 'Accounts Payable')  # Add this line
    ]
    for account_name, account_type_name in required_accounts:
        get_or_create_account(database_name, account_name, account_type_name)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_invoice(request):
    """
    API view to create a new invoice.
    """
    logger.debug("Create Invoice: Received request data: %s", request.data)
    user = request.user

    if not user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        database_name = get_user_database(user)
        ensure_database_exists(database_name)
        ensure_accounts_exist(database_name)

        with db_transaction.atomic(using=database_name):
            data = request.data
            data['date'] = ensure_date(data.get('date', timezone.now()))
            data['due_date'] = ensure_date(data.get('due_date', default_due_datetime()))
            invoice = create_invoice_with_transaction(data, database_name)
            return Response(InvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)

    except UserProfile.DoesNotExist:
        logger.error("UserProfile does not exist for user: %s", user)
        console.error(f"UserProfile does not exist for user: {user}")
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    except ValueError as e:
        logger.error("ValueError in create_invoice: %s", str(e))
        console.error(f"ValueError in create_invoice: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.exception("Unexpected error creating invoice: %s", e)
        console.error(f"Unexpected error creating invoice: {e}")
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def ensure_database_exists(database_name):
    """
    Ensure that the dynamic database exists.
    """
    logger.debug("Creating dynamic database if it doesn't exist: %s", database_name)
    router = UserDatabaseRouter()
    router.create_dynamic_database(database_name)


def ensure_accounts_exist(database_name):
    """
    Ensure that all necessary accounts exist in the dynamic database.
    """
    logger.debug("Ensuring necessary accounts exist in database: %s", database_name)
    required_accounts = [
        ('Accounts Receivable', 'Accounts Receivable'),
        ('Sales Revenue', 'Sales Revenue'),
        ('Sales Tax Payable', 'Sales Tax Payable'),
        ('Cost of Goods Sold', 'Cost of Goods Sold'),
        ('Inventory', 'Inventory')
    ]
    for account_name, account_type_name in required_accounts:
        get_or_create_account(database_name, account_name, account_type_name)


def create_invoice_with_transaction(data, database_name):
    logger.debug(f"Creating invoice with transaction in database: {database_name}")
    
    context = {'database_name': database_name}
    
    with db_transaction.atomic(using=database_name):
        transaction_data = data.pop('transaction', None)
        finance_transaction = None
        if transaction_data:
            transaction_serializer = TransactionSerializer(data=transaction_data, context=context)
            if transaction_serializer.is_valid(raise_exception=True):
                finance_transaction = transaction_serializer.save()
                logger.debug(f"Transaction created: {finance_transaction}")
            else:
                logger.error(f"Transaction validation failed: {transaction_serializer.errors}")
                raise serializers.ValidationError(transaction_serializer.errors)

        # Ensure date is a date object
        if 'date' in data and isinstance(data['date'], str):
            data['date'] = datetime.strptime(data['date'], "%Y-%m-%d").date()

        # Remove due_date if it's in the data, let the serializer calculate it
        data.pop('due_date', None)

        # Convert customer ID to UUID
        customer_id = data.get('customer')
        try:
            data['customer'] = uuid.UUID(customer_id)
        except ValueError:
            raise serializers.ValidationError({'customer': f'Invalid UUID format for customer: {customer_id}'})

        invoice_serializer = InvoiceSerializer(data=data, context=context)
        logger.debug(f"Invoice data before validation: {data}")
        if invoice_serializer.is_valid(raise_exception=True):
            logger.debug(f"Validated invoice data: {invoice_serializer.validated_data}")
            invoice = invoice_serializer.save()
            logger.debug(f"Saved invoice: {invoice}")
            logger.debug(f"Invoice date: {invoice.date}, type: {type(invoice.date)}")
            logger.debug(f"Invoice due_date: {invoice.due_date}, type: {type(invoice.due_date)}")
            
            return invoice
        else:
            logger.error(f"Invoice validation failed: {invoice_serializer.errors}")
            raise serializers.ValidationError(invoice_serializer.errors)
        
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_customer(request):
    logger.debug("Create Customer: Received request data: %s", request.data)
    user = request.user

    if not user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        user_profile = UserProfile.objects.using('default').get(user=user)
        database_name = user_profile.database_name
        logger.debug("Database name: %s", database_name)

        # Create the dynamic database if it doesn't exist
        logger.debug(f"Creating dynamic database: {database_name}")
        router = UserDatabaseRouter()
        router.create_dynamic_database(database_name)

        with db_transaction.atomic(using=database_name):
            serializer = CustomerSerializer(data=request.data, context={'database_name': database_name})
            logger.debug("Serializer: %s", serializer)
            if serializer.is_valid():
                customer = serializer.save()
                logger.debug("Customer created: %s", serializer.data)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                logger.error("Validation errors: %s", serializer.errors)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except UserProfile.DoesNotExist:
        logger.error("UserProfile does not exist for user: %s", user)
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.exception("Error creating customer: %s", str(e))
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def customer_list(request):
    """
    API view to list all customers.
    """
    logger.debug("Customer List called")
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

        customers = Customer.objects.using(database_name).all()
        logger.debug("Fetched customers: %s", customers)
        serializer = CustomerSerializer(customers, many=True)
        return Response(serializer.data)

    except UserProfile.DoesNotExist:
        logger.error("UserProfile does not exist for user: %s", user)
        console.error("UserProfile does not exist for user: %s", user)
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        logger.exception("Error fetching customers: %s", str(e))
        console.error("Error fetching customers: %s", str(e))
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

@api_view(['PUT', 'DELETE'])
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

        product = Product.objects.using(database_name).get(pk=pk)

        if request.method == 'PUT':
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

    except Product.DoesNotExist:
        return Response({'error': 'Product not found.'}, status=status.HTTP_404_NOT_FOUND)

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
    

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_estimate(request):
    logger.debug("Create Estimate: Received request data: %s", request.data)
    user = request.user

    if not user.is_authenticated:
        logger.error("User is not authenticated")
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        # Get the dynamic database for the user
        database_name = get_user_database(user)
        logger.debug(f"Retrieved database name: {database_name}")

        ensure_database_exists(database_name)
        logger.debug(f"Ensured database exists: {database_name}")

        ensure_accounts_exist(database_name)
        logger.debug(f"Ensured necessary accounts exist in database: {database_name}")

        with db_transaction.atomic(using=database_name):
            data = request.data

            # Ensure date fields are datetime objects
            data['date'] = ensure_date(data.get('date', timezone.now()))
            data['valid_until'] = ensure_date(data.get('valid_until', timezone.now() + timedelta(days=30)))
            logger.debug(f"Processed date fields: {data['date']}, valid until: {data['valid_until']}")

            # Create the estimate with transaction handling
            estimate = create_estimate_with_transaction(data, database_name)
            return Response(EstimateSerializer(estimate).data, status=status.HTTP_201_CREATED)

    except UserProfile.DoesNotExist:
        logger.error(f"UserProfile does not exist for user: {user}")
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    except ValueError as e:
        logger.error(f"ValueError in create_estimate: {str(e)}")
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.exception(f"Unexpected error creating estimate: {e}")
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
def create_estimate_with_items(data, database_name):
    context = {'database_name': database_name}
    with db_transaction.atomic(using=database_name):
        # Validate customer UUID format
        try:
            data['customer'] = uuid.UUID(data['customer'])
        except ValueError:
            raise serializers.ValidationError({'customer': f'Invalid UUID format for customer: {data["customer"]}'})

        # Ensure dates are proper datetime objects
        data['date'] = ensure_date(data.get('date', timezone.now()))
        data['valid_until'] = ensure_date(data.get('valid_until', default_valid_until()))

        # Process and validate items
        items_data = data.pop('items', [])
        for item in items_data:
            if 'product' in item:
                try:
                    product = Product.objects.using(database_name).get(id=item['product'])
                    item['product'] = product.id
                except Product.DoesNotExist:
                    raise serializers.ValidationError(f'Product with id {item["product"]} does not exist.')

        # Validate and create estimate
        estimate_serializer = EstimateSerializer(data=data, context=context)
        if estimate_serializer.is_valid(raise_exception=True):
            estimate = estimate_serializer.save()
            # Create estimate items
            for item_data in items_data:
                EstimateItem.objects.using(database_name).create(estimate=estimate, **item_data)
            return estimate
        else:
            raise serializers.ValidationError(estimate_serializer.errors)
def create_estimate_with_transaction(data, database_name):
    logger.debug(f"Creating estimate with transaction in database: {database_name}")
    
    context = {'database_name': database_name}
    
    with db_transaction.atomic(using=database_name):
        transaction_data = data.pop('transaction', None)
        finance_transaction = None
        if transaction_data:
            logger.debug(f"Processing transaction data: {transaction_data}")
            transaction_serializer = TransactionSerializer(data=transaction_data, context=context)
            if transaction_serializer.is_valid(raise_exception=True):
                finance_transaction = transaction_serializer.save()
                logger.debug(f"Transaction created: {finance_transaction}")
            else:
                logger.error(f"Transaction validation failed: {transaction_serializer.errors}")
                raise serializers.ValidationError(transaction_serializer.errors)

        # Ensure date is a date object
        if 'date' in data and isinstance(data['date'], str):
            logger.debug(f"Parsing date from string: {data['date']}")
            data['date'] = datetime.strptime(data['date'], "%Y-%m-%d").date()

        # Remove valid_until if it's in the data, let the serializer calculate it
        if 'valid_until' in data:
            logger.debug(f"Removing 'valid_until' from data to let the serializer calculate it")
            data.pop('valid_until', None)

        # Convert customer ID to UUID and fetch the customer from the correct database
        customer_id = data.get('customer')
        logger.debug(f"Processing customer ID: {customer_id}")
        try:
            customer_uuid = uuid.UUID(customer_id)
            logger.debug(f"Converted customer ID to UUID: {customer_uuid}")
            customer = Customer.objects.using(database_name).filter(pk=customer_uuid).first()
            if not customer:
                logger.error(f"Customer with id {customer_id} does not exist in database {database_name}")
                raise serializers.ValidationError({'customer': f'Customer with id {customer_id} does not exist in database {database_name}'})
            data['customer'] = customer.id  # Set the correct customer ID in the data
            logger.debug(f"Customer found and set in data: {customer.id}")
        except ValueError:
            logger.error(f"Invalid UUID format for customer: {customer_id}")
            raise serializers.ValidationError({'customer': f'Invalid UUID format for customer: {customer_id}'})

        estimate_serializer = EstimateSerializer(data=data, context=context)
        logger.debug(f"Estimate data before validation: {data}")
        if estimate_serializer.is_valid(raise_exception=True):
            logger.debug(f"Validated estimate data: {estimate_serializer.validated_data}")
            estimate = estimate_serializer.save()
            logger.debug(f"Saved estimate: {estimate}")
            
            # If finance_transaction exists, link it to the estimate (if required)
            if finance_transaction:
                logger.debug(f"Linking finance transaction to estimate: {finance_transaction}")
                estimate.transaction = finance_transaction
                estimate.save()

            return estimate
        else:
            logger.error(f"Estimate validation failed: {estimate_serializer.errors}")
            raise serializers.ValidationError(estimate_serializer.errors)



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
def estimate_list(request):
    """
    API view to list all estimates.
    """
    logger.debug("Estimate List called")
    user = request.user

    try:
        user_profile = UserProfile.objects.using('default').get(user=user)
        database_name = user_profile.database_name
        logger.debug("Database Name from UserProfile: %s", database_name)

        if not database_name:
            logger.error("Database name is empty.")
            return Response({'error': 'Database name is empty.'}, status=status.HTTP_400_BAD_REQUEST)

        router = UserDatabaseRouter()
        router.create_dynamic_database(database_name)

        estimates = Estimate.objects.using(database_name).all()
        logger.debug("Fetched estimates: %s", estimates)
        serializer = EstimateSerializer(estimates, many=True)
        return Response(serializer.data)

    except UserProfile.DoesNotExist:
        logger.error("UserProfile does not exist for user: %s", user)
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.exception("Error fetching estimates: %s", str(e))
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def estimate_detail(request, pk):
    """
    API view to get estimate details by ID.
    """
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
        
        estimate = get_object_or_404(Estimate.objects.using(database_name), pk=pk)
        logger.debug(f"Fetched estimate: {estimate}")
        serializer = EstimateSerializer(estimate)
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
    
@api_view(['POST'])
@transaction.atomic
def create_bill(request):
    user = request.user
    database_name = get_user_database(user)
    
    try:
        ensure_accounts_exist(database_name)
        
        # Extract data from request
        bill_data = request.data
        
        # Validate required fields
        required_fields = ['vendor', 'bill_date', 'due_date', 'items']
        for field in required_fields:
            if field not in bill_data:
                return Response({'error': f'Missing required field: {field}'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the vendor
        try:
            vendor = Vendor.objects.using(database_name).get(id=bill_data['vendor'])
        except Vendor.DoesNotExist:
            return Response({'error': 'Vendor not found'}, status=status.HTTP_400_BAD_REQUEST)
        
      # Calculate the total amount
        total_amount = sum(Decimal(item['amount']) for item in bill_data['items'])
        
        # Create the bill
        bill = Bill.objects.using(database_name).create(
            vendor=vendor,
            bill_date=bill_data['bill_date'],
            due_date=bill_data['due_date'],
            total_amount=total_amount  # Set the total amount here
        )
        bill.save(using=database_name)
        
        # Get or create the Accounts Payable account
        accounts_payable, _ = Account.objects.using(database_name).get_or_create(
            name='Accounts Payable',
            defaults={'account_type': AccountType.objects.using(database_name).get(name='Current Liabilities')}
        )
        
        # Get or create the Expense AccountType
        expense_account_type, _ = AccountType.objects.using(database_name).get_or_create(name='Expense')
        
        # Create the accounting entries
        for item in bill_data['items']:
            # Validate item data
            if 'category' not in item or 'amount' not in item:
                raise ValueError(f"Invalid item data: {item}")
            
            # Get or create the expense account
            expense_account, _ = Account.objects.using(database_name).get_or_create(
                name=item['category'],
                defaults={'account_type': expense_account_type}
            )
            
            # Create the debit transaction
            FinanceTransaction.objects.using(database_name).create(
                account=expense_account,
                amount=Decimal(item['amount']),
                type='debit',
                bill=bill,
                description=f"Expense for {item['category']}"
            )
        
        # Create the credit transaction for Accounts Payable
        FinanceTransaction.objects.using(database_name).create(
            account=accounts_payable,
            amount=bill.total_amount,
            type='credit',
            bill=bill,
            description="Credit to Accounts Payable for bill"
        )
        
        console.info(f"Bill created successfully.")
        
        return Response({
            'message': 'Bill created successfully',
            'bill_id': str(bill.id),
            'total_amount': str(bill.total_amount)
        }, status=status.HTTP_201_CREATED)
       

    except Exception as e:
        logger.exception(f"Unexpected error in create_bill: {str(e)}")
        console.error(f"Unexpected error in create_bill: {str(e)}")
        return Response({'error': 'An unexpected error occurred'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_vendor(request):
    logger.debug("Create Vendor: Received request data: %s", request.data)
    user = request.user

    try:
        user_profile = UserProfile.objects.using('default').get(user=user)
        database_name = user_profile.database_name
        logger.debug("Database name: %s", database_name)

        router = UserDatabaseRouter()
        router.create_dynamic_database(database_name)

        with transaction.atomic(using=database_name):
            serializer = VendorSerializer(data=request.data, context={'database_name': database_name})
            if serializer.is_valid():
                vendor = serializer.save()
                logger.debug("Vendor created: %s", serializer.data)
                transaction.on_commit(lambda: logger.debug("Transaction committed"))
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                logger.error("Validation errors: %s", serializer.errors)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.exception("Error creating vendor: %s", e)
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_list(request):
    logger.debug("Vendor List called")
    user = request.user

    try:
        user_profile = UserProfile.objects.using('default').get(user=user)
        database_name = user_profile.database_name

        if not database_name:
            logger.error("Database name is empty.")
            return Response({'error': 'Database name is empty.'}, status=status.HTTP_400_BAD_REQUEST)

        router = UserDatabaseRouter()
        router.create_dynamic_database(database_name)

        vendors = Vendor.objects.using(database_name).all()
        serializer = VendorSerializer(vendors, many=True)
        return Response(serializer.data)

    except Exception as e:
        logger.exception(f"Error fetching vendors: {str(e)}")
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


def create_sales_order_with_transaction(data, database_name):
    logger.debug(f"Creating sales order with transaction in database: {database_name}")
    logger.debug(f"Data received: {data}")
    
    try:
        with transaction.atomic(using=database_name):
            items_data = data.pop('items', [])
            logger.debug(f"Items data: {items_data}")
            
            # Create SalesOrder
            logger.debug(f"Creating SalesOrder with data: {data}")
            sales_order = SalesOrder.objects.using(database_name).create(**data)
            logger.debug(f"SalesOrder created with ID: {sales_order.id}")
            
            # Create SalesOrderItems
            total_amount = Decimal('0.00')
            for item_data in items_data:
                logger.debug(f"Creating SalesOrderItem with data: {item_data}")
                # Calculate the amount for the item
                item_amount = item_data['quantity'] * item_data['unit_price']
                item_data['amount'] = item_amount
                item = SalesOrderItem.objects.using(database_name).create(sales_order=sales_order, **item_data)
                logger.debug(f"SalesOrderItem created with ID: {item.id}")
                total_amount += item_amount
            
            # Update SalesOrder with total amount
            sales_order.amount = total_amount - sales_order.discount
            logger.debug(f"Updating SalesOrder {sales_order.id} with total amount: {sales_order.amount}")
            sales_order.save(using=database_name)
            logger.debug(f"SalesOrder {sales_order.id} updated successfully")
            
            # Fetch the saved object to ensure it exists
            logger.debug(f"Fetching saved SalesOrder with ID: {sales_order.id}")
            saved_sales_order = SalesOrder.objects.using(database_name).get(pk=sales_order.id)
            logger.debug(f"SalesOrder retrieved after save: {saved_sales_order.id}")
            
            return saved_sales_order
    except Exception as e:
        logger.error(f"Error in create_sales_order_with_transaction: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise
    
@api_view(['POST', 'GET'])
@permission_classes([IsAuthenticated])
def sales_order_list_create(request):
    user = request.user

    try:
        database_name = get_or_create_user_database(user)
    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Unexpected error getting user database: {str(e)}")
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    if request.method == 'POST':
        return create_sales_order(request, database_name)
    elif request.method == 'GET':
        return list_sales_orders(request, database_name)

def create_sales_order(request, database_name):
    logger.debug("Create Sales Order: Received request data: %s", request.data)

    # Log all existing products
    all_products = Product.objects.using(database_name).all()
    logger.debug(f"All products in database {database_name}: {[f'{p.id}: {p.name}' for p in all_products]}")

    # Check if the specific product exists
    product_id = request.data['items'][0]['product']
    try:
        product = Product.objects.using(database_name).get(pk=product_id)
        logger.debug(f"Product found: {product.id}: {product.name}")
    except Product.DoesNotExist:
        logger.error(f"Product with id {product_id} not found in database {database_name}")

    context = {'database_name': database_name, 'request': request}
    serializer = SalesOrderSerializer(data=request.data, context=context)

    logger.debug(f"Serializer initialized with context: {serializer.context}")

    if serializer.is_valid():
        try:
            with transaction.atomic(using=database_name):
                sales_order = create_sales_order_with_transaction(serializer.validated_data, database_name)
            logger.debug(f"Sales order created: {sales_order}")
            return Response(SalesOrderSerializer(sales_order).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            logger.exception(f"Unexpected error creating sales order: {str(e)}")
            return Response({'error': 'Failed to create sales order', 'details': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    else:
        logger.error(f"Sales order validation failed: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
def list_sales_orders(request, database_name):
    sales_orders = SalesOrder.objects.using(database_name).all()
    serializer = SalesOrderSerializer(sales_orders, many=True, context={'database_name': database_name})
    return Response(serializer.data)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def sales_order_detail(request, pk):
    user = request.user

    try:
        database_name = get_or_create_user_database(user)
    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Unexpected error getting user database: {str(e)}")
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        sales_order = SalesOrder.objects.using(database_name).get(pk=pk)
    except SalesOrder.DoesNotExist:
        logger.warning(f"Sales order with id {pk} not found in database {database_name}")
        return Response({'error': 'Sales order not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = SalesOrderSerializer(sales_order, context={'database_name': database_name})
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = SalesOrderSerializer(sales_order, data=request.data, context={'database_name': database_name})
        if serializer.is_valid():
            try:
                with transaction.atomic(using=database_name):
                    serializer.save()
                logger.info(f"Sales order {pk} updated by user {request.user.id} in database {database_name}")
                return Response(serializer.data)
            except Exception as e:
                logger.error(f"Error updating sales order {pk} in database {database_name}: {str(e)}")
                return Response({'error': 'Failed to update sales order'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        logger.warning(f"Invalid data for updating sales order {pk} in database {database_name}: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        try:
            with transaction.atomic(using=database_name):
                sales_order.delete()
            logger.info(f"Sales order {pk} deleted by user {request.user.id} from database {database_name}")
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            logger.error(f"Error deleting sales order {pk} from database {database_name}: {str(e)}")
            return Response({'error': 'Failed to delete sales order'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)