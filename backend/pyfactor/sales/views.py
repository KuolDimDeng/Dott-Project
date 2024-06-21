from django.shortcuts import render
from rest_framework import generics, status, serializers
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Invoice, Customer, Product, Service
from finance.models import Account, AccountType
from users.models import UserProfile
from .serializers import InvoiceSerializer, CustomerSerializer, ProductSerializer, ServiceSerializer, VendorSerializer
from finance.serializers import TransactionSerializer
from django.conf import settings
from django.db import connections, transaction as db_transaction, transaction
from finance.account_types import ACCOUNT_TYPES
import logging
from pyfactor.userDatabaseRouter import UserDatabaseRouter

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_invoice(request):
    logger.debug("Create Invoice: Received request data: %s", request.data)
    user = request.user

    if not user.is_authenticated:
        logger.warning("Unauthenticated user attempted to create invoice")
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        # Fetch the user profile to get the dynamic database name
        user_profile = UserProfile.objects.using('default').get(user=user)
        database_name = user_profile.database_name
        logger.debug("Fetched user profile. Database name: %s", database_name)

        # Ensure the dynamic database exists
        logger.debug("Creating dynamic database if it doesn't exist: %s", database_name)
        router = UserDatabaseRouter()
        router.create_dynamic_database(database_name)

        # Use the dynamic database for this operation
        logger.debug('Using dynamic database: %s', database_name)
        
        # Add this check here
        account_exists = Account.objects.using(database_name).filter(pk=1).exists()
        logger.debug(f"Account with ID 1 exists in database {database_name}: {account_exists}")

        with db_transaction.atomic(using=database_name):
            context = {'database_name': database_name}
            logger.debug(f"Initializing InvoiceSerializer with context: {context}")
            serializer = InvoiceSerializer(data=request.data, context=context)
            logger.debug("Initialized InvoiceSerializer with data: %s", request.data)
            
            if serializer.is_valid():
                logger.debug("InvoiceSerializer is valid")
                transaction_data = request.data.get('transaction')
                if transaction_data:
                    logger.debug("Transaction data received: %s", transaction_data)
                    logger.debug(f"Initializing TransactionSerializer with context: {context}")
                    transaction_serializer = TransactionSerializer(data=transaction_data, context=context)
                    if transaction_serializer.is_valid():
                        logger.debug("TransactionSerializer is valid")
                        with connections[database_name].cursor() as cursor:
                            logger.debug("Setting search path to dynamic database: %s", database_name)
                            cursor.execute("SET search_path TO public, {}".format(database_name))
                            transaction = transaction_serializer.save()
                            logger.debug("Transaction created: %s", transaction)
                    else:
                        logger.error("Transaction validation errors: %s", transaction_serializer.errors)
                        return Response(transaction_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

                    logger.debug("Fetching or creating necessary accounts")
                    accounts_receivable = get_or_create_account(database_name, 'Accounts Receivable', 'Accounts Receivable')
                    sales_revenue = get_or_create_account(database_name, 'Sales Revenue', 'Sales Revenue')
                    sales_tax_payable = get_or_create_account(database_name, 'Sales Tax Payable', 'Sales Tax Payable')
                    cost_of_goods_sold = get_or_create_account(database_name, 'Cost of Goods Sold', 'Cost of Goods Sold')
                    inventory = get_or_create_account(database_name, 'Inventory', 'Inventory')

                    logger.debug("Accounts receivable: %s", accounts_receivable)
                    logger.debug("Sales revenue: %s", sales_revenue)
                    logger.debug("Sales tax payable: %s", sales_tax_payable)
                    logger.debug("Cost of goods sold: %s", cost_of_goods_sold)
                    logger.debug("Inventory: %s", inventory)

                    invoice = serializer.save(
                        transaction=transaction,
                        accounts_receivable=accounts_receivable,
                        sales_revenue=sales_revenue,
                        sales_tax_payable=sales_tax_payable,
                        cost_of_goods_sold=cost_of_goods_sold,
                        inventory=inventory,
                    )
                else:
                    logger.debug("No transaction data provided")
                    invoice = serializer.save()

                invoice.save(using=database_name)
                logger.info("Invoice created and saved: %s", serializer.data)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                logger.error("InvoiceSerializer validation errors: %s", serializer.errors)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except UserProfile.DoesNotExist:
        logger.error("UserProfile does not exist for user: %s", user)
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    except ValueError as e:
        logger.error("ValueError in create_invoice: %s", str(e))
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.exception("Unexpected error creating invoice: %s", e)
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
def get_or_create_account(database_name, account_name, account_type_name):
    account_type_id = ACCOUNT_TYPES.get(account_type_name)
    if account_type_id is None:
        raise ValueError(f"Invalid account type: {account_type_name}")    
    logger.debug("Fetching or creating account: %s in database: %s", account_name, database_name)
    try:
        account_type = AccountType.objects.using(database_name).get(account_type_id=account_type_id)
        account, created = Account.objects.using(database_name).get_or_create(
            name=account_name,
            defaults={'account_type': account_type}
        )
        if created:
            logger.debug("Account created: %s", account)
        else:
            logger.debug("Account already exists: %s", account)
        return account
    except Exception as e:
        logger.exception("Error fetching or creating account: %s", e)
        raise
    
    
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
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                logger.error("Validation errors: %s", serializer.errors)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except UserProfile.DoesNotExist:
        logger.error("UserProfile does not exist for user: %s", user)
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.exception("Error creating customer: %s", e)
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
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        logger.exception("Error fetching customers: %s", str(e))
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
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            else:
                logger.error("Validation errors: %s", serializer.errors)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except UserProfile.DoesNotExist:
        logger.error("UserProfile does not exist for user: %s", user)
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.exception("Error creating service: %s", e)
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
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        logger.exception("Error fetching products: %s", str(e))
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
