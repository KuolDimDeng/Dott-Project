from django.shortcuts import get_object_or_404, render
from rest_framework import generics, status, serializers, viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from finance.views import get_user_database
from .models import Estimate, Invoice, Customer, Product, Service, default_due_datetime
from finance.models import Account, AccountType, Transaction as FinanceTransaction
from users.models import UserProfile
from .serializers import InvoiceSerializer, CustomerSerializer, ProductSerializer, ServiceSerializer, VendorSerializer, EstimateSerializer, EstimateAttachmentSerializer
from finance.serializers import TransactionSerializer
from django.conf import settings
from django.db import connections, transaction as db_transaction
from finance.account_types import ACCOUNT_TYPES
from pyfactor.userDatabaseRouter import UserDatabaseRouter
from pyfactor.user_console import console
from pyfactor.logging_config import get_logger
from .utils import get_or_create_account, ensure_date
from datetime import datetime
from django.db.models import Q

import uuid

logger = get_logger()

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
    """
    API view to create a new product.
    """
    logger.debug("Create Product: Received request data: %s", request.data)
    user = request.user

    if not user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        user_profile = UserProfile.objects.using('default').get(user=user)
        database_name = user_profile.database_name
        logger.debug("Database name: %s", database_name)

        logger.debug(f"Creating dynamic database: {database_name}")
        router = UserDatabaseRouter()
        router.create_dynamic_database(database_name)

        with db_transaction.atomic(using=database_name):
            serializer = ProductSerializer(data=request.data)
            logger.debug("Serializer: %s", serializer)
            if serializer.is_valid():
                product = serializer.save()
                product.product_code = Product.generate_unique_code(product.name, 'product_code')
                product.save(using=database_name)
                logger.debug("Product created: %s", serializer.data)
                console.info("Product created successfully.")
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                logger.error("Validation errors: %s", serializer.errors)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except UserProfile.DoesNotExist:
        logger.error("UserProfile does not exist for user: %s", user)
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.exception("Error creating product: %s", e)
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_service(request):
    """
    API view to create a new service.
    """
    logger.debug("Create Service: Received request data: %s", request.data)
    user = request.user

    if not user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        user_profile = UserProfile.objects.using('default').get(user=user)
        database_name = user_profile.database_name
        logger.debug("Database name: %s", database_name)

        logger.debug(f"Creating dynamic database: %s", database_name)
        router = UserDatabaseRouter()
        router.create_dynamic_database(database_name)

        with db_transaction.atomic(using=database_name):
            serializer = ServiceSerializer(data=request.data)
            logger.debug("Serializer: %s", serializer)
            if serializer.is_valid():
                service = serializer.save()
                service.service_code = Service.generate_unique_code(service.name, 'service_code')
                service.save(using=database_name)
                logger.debug("Service created: %s", serializer.data)
                console.info("Service created successfully.")
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                logger.error("Validation errors: %s", serializer.errors)
                console.error("Validation errors")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except UserProfile.DoesNotExist:
        logger.error("UserProfile does not exist for user: %s", user)
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.exception("Error creating service: %s", e)
        console.error("Error creating service")
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_vendor(request):
    """
    API view to create a new vendor.
    """
    logger.debug("Create Vendor: Received request data: %s", request.data)
    user = request.user

    if not user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        user_profile = UserProfile.objects.using('default').get(user=user)
        database_name = user_profile.database_name
        logger.debug("Database name: %s", database_name)

        logger.debug(f"Creating dynamic database: %s", database_name)
        router = UserDatabaseRouter()
        router.create_dynamic_database(database_name)

        with db_transaction.atomic(using=database_name):
            serializer = VendorSerializer(data=request.data)
            logger.debug("Serializer: %s", serializer)
            if serializer.is_valid():
                vendor = serializer.save()
                vendor.save(using=database_name)
                logger.debug("Vendor created: %s", serializer.data)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                logger.error("Validation errors: %s", serializer.errors)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except UserProfile.DoesNotExist:
        logger.error("UserProfile does not exist for user: %s", user)
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.exception("Error creating vendor: %s", e)
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
    """
    API view to create a new estimate.
    """
    logger.debug("Create Estimate: Received request data: %s", request.data)
    user = request.user

    try:
        user_profile = UserProfile.objects.using('default').get(user=user)
        database_name = user_profile.database_name
        logger.debug("Database name: %s", database_name)

        router = UserDatabaseRouter()
        router.create_dynamic_database(database_name)

        with db_transaction.atomic(using=database_name):
            serializer = EstimateSerializer(data=request.data, context={'database_name': database_name})
            if serializer.is_valid():
                estimate = serializer.save()
                logger.debug("Estimate created: %s", serializer.data)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                logger.error("Validation errors: %s", serializer.errors)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except UserProfile.DoesNotExist:
        logger.error("UserProfile does not exist for user: %s", user)
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.exception("Error creating estimate: %s", str(e))
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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