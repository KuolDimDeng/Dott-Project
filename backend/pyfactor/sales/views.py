from django.shortcuts import get_object_or_404, render
from rest_framework import generics, status, serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Invoice, Customer, Product, Service
from finance.models import Account, AccountType, Transaction as FinanceTransaction
from users.models import UserProfile
from .serializers import InvoiceSerializer, CustomerSerializer, ProductSerializer, ServiceSerializer, VendorSerializer
from finance.serializers import TransactionSerializer
from django.conf import settings
from django.db import connections, transaction as db_transaction, transaction
from finance.account_types import ACCOUNT_TYPES
from pyfactor.userDatabaseRouter import UserDatabaseRouter
from pyfactor.user_console import console
from pyfactor.logging_config import get_logger


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

        with db_transaction.atomic(using=database_name):
            invoice = create_invoice_with_transaction(request.data, database_name)
            return Response(InvoiceSerializer(invoice).data, status=status.HTTP_201_CREATED)

    except UserProfile.DoesNotExist:
        logger.error("UserProfile does not exist for user: %s", user)
        console.error("UserProfile does not exist for user: %s", user)
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    except ValueError as e:
        logger.error("ValueError in create_invoice: %s", str(e))
        console.error("ValueError in create_invoice: %s", str(e))
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.exception("Unexpected error creating invoice: %s", e)
        console.error("Unexpected error creating invoice.")
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def get_user_database(user):
    user_profile = get_object_or_404(UserProfile.objects.using('default'), user=user)
    database_name = user_profile.database_name
    logger.debug("Fetched user profile. Database name: %s", database_name)
    return database_name

def ensure_database_exists(database_name):
    logger.debug("Creating dynamic database if it doesn't exist: %s", database_name)
    router = UserDatabaseRouter()
    router.create_dynamic_database(database_name)

def ensure_accounts_exist(database_name):
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

def get_or_create_account(database_name, account_name, account_type_name):
    account_type_id = ACCOUNT_TYPES.get(account_type_name)
    if account_type_id is None:
        raise ValueError(f"Invalid account type: {account_type_name}")    
    logger.debug(f"Fetching or creating account: {account_name} in database: {database_name}")
    try:
        with db_transaction.atomic(using=database_name):
            account_type, _ = AccountType.objects.using(database_name).get_or_create(
                account_type_id=account_type_id,
                defaults={'name': account_type_name}
            )
            account, created = Account.objects.using(database_name).get_or_create(
                name=account_name,
                defaults={'account_type': account_type}
            )
        if created:
            logger.debug(f"Account created: {account}")
            console.info(f"Account created: {account}")
        else:
            logger.debug(f"Account already exists: {account}")
        return account
    except Exception as e:
        logger.exception(f"Error fetching or creating account: {e}")
        console.error(f"Error fetching or creating account: {e}")
        raise

def create_invoice_with_transaction(data, database_name):
    logger.debug(f"Creating invoice with transaction in database: {database_name}")
    
    context = {'database_name': database_name}
    invoice_serializer = InvoiceSerializer(data=data, context=context)
    invoice_serializer.is_valid(raise_exception=True)

    transaction_data = data.get('transaction')
    if transaction_data:
        transaction_serializer = TransactionSerializer(data=transaction_data, context=context)
        transaction_serializer.is_valid(raise_exception=True)
        finance_transaction = transaction_serializer.save()
    else:
        finance_transaction = None

    accounts = {
        'accounts_receivable': get_or_create_account(database_name, 'Accounts Receivable', 'Accounts Receivable'),
        'sales_revenue': get_or_create_account(database_name, 'Sales Revenue', 'Sales Revenue'),
        'sales_tax_payable': get_or_create_account(database_name, 'Sales Tax Payable', 'Sales Tax Payable'),
        'cost_of_goods_sold': get_or_create_account(database_name, 'Cost of Goods Sold', 'Cost of Goods Sold'),
        'inventory': get_or_create_account(database_name, 'Inventory', 'Inventory')
    }

    with db_transaction.atomic(using=database_name):
        invoice = invoice_serializer.save(transaction=finance_transaction, **accounts)
    
    logger.info(f"Invoice created and saved: {invoice_serializer.data}")
    console.info(f"Invoice created and saved: {invoice_serializer.data}")
    return invoice
    
    
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_customer(request):
    logger.debug("Create Customer: Received request data: %s", request.data)
    user = request.user

    if not user.is_authenticated:
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        # Fetch the user profile to get the dynamic database name
        user_profile = UserProfile.objects.using('default').get(user=user)
        database_name = user_profile.database_name
        logger.debug("Database name: %s", database_name)

        # Ensure the dynamic database exists
        logger.debug(f"Creating dynamic database: {database_name}")
        router = UserDatabaseRouter()
        router.create_dynamic_database(database_name)

        # Use the dynamic database for this operation
        logger.debug(f'Using dynamic database: {database_name}')
        with transaction.atomic(using=database_name):
            serializer = CustomerSerializer(data=request.data)
            logger.debug("Serializer: %s", serializer)
            if serializer.is_valid():
                customer = serializer.save()
                customer.save(using=database_name)
                logger.debug("Customer created: %s", serializer.data)
                console.info("Customer created")
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                logger.error("Validation errors: %s", serializer.errors)
                console.error("Validation errors")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except UserProfile.DoesNotExist:
        logger.error("UserProfile does not exist for user: %s", user)
        console.error("UserProfile does not exist for user: %s", user)
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.exception("Error creating customer: %s", e)
        console.error("Error creating customer: %s", e)
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def customer_list(request):
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
        logger.debug(f"Creating dynamic database: {database_name}")
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
    logger.debug("Customer Detail called")
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

        if database_name in settings.DATABASES:
            try:
                customer = Customer.objects.using(database_name).get(pk=pk)
                logger.debug("Customer: %s", customer)
                serializer = CustomerSerializer(customer)
                return Response(serializer.data)
            except Customer.DoesNotExist:
                logger.error("Customer does not exist: %s", pk)
                return Response(status=status.HTTP_404_NOT_FOUND)
        else:
            logger.warning("Database '%s' does not exist in settings.", database_name)
            return Response({'error': 'Database does not exist.'}, status=status.HTTP_400_BAD_REQUEST)

    except UserProfile.DoesNotExist:
        logger.error("UserProfile does not exist for user: %s", user)
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        logger.exception("Error fetching customer detail: %s", str(e))
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_product(request):
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

        with transaction.atomic(using=database_name):
            serializer = ProductSerializer(data=request.data)
            logger.debug("Serializer: %s", serializer)
            if serializer.is_valid():
                product = serializer.save()
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

        with transaction.atomic(using=database_name):
            serializer = ServiceSerializer(data=request.data)
            logger.debug("Serializer: %s", serializer)
            if serializer.is_valid():
                service = serializer.save()
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

        with transaction.atomic(using=database_name):
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
        
        products = Product.objects.using(database_name).all()
        logger.debug("Fetched products: %s", products)
        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data)

    except UserProfile.DoesNotExist:
        logger.error("UserProfile does not exist for user: %s", user)
        console.error("UserProfile does not exist for user: %s", user)
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        logger.exception("Error fetching products: %s", str(e))
        console.error("Error fetching products: %s", str(e))
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def service_list(request):
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
