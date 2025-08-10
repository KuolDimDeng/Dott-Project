#/Users/kuoldeng/projectx/backend/pyfactor/finance/views.py
from django.conf import settings
from django.http import HttpRequest
from requests import Request
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.generics import CreateAPIView, ListCreateAPIView, UpdateAPIView, ListAPIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.decorators import parser_classes
from dateutil import parser as date_parser  # This is the changed line
from sales.models import Invoice
from sales.serializers import InvoiceSerializer
from inventory.models import Product
from pyfactor.userDatabaseRouter import UserDatabaseRouter
from .models import AccountReconciliation, AccountType, Account, AuditTrail, Budget, CostCategory, CostEntry, FinanceTransaction, FinancialStatement, FixedAsset, GeneralLedgerEntry, Income, IntercompanyAccount, IntercompanyTransaction, JournalEntry, MonthEndClosing, MonthEndTask, ReconciliationItem, RevenueAccount, CashAccount, AccountCategory, ChartOfAccount
from datetime import datetime
from .serializers import AccountReconciliationSerializer, AccountTypeSerializer, AccountSerializer, AuditTrailSerializer, BudgetSerializer, CostCategorySerializer, CostEntrySerializer, FinancialStatementSerializer, FixedAssetSerializer, GeneralLedgerEntrySerializer, IncomeSerializer, IntercompanyAccountSerializer, IntercompanyTransactionSerializer, JournalEntrySerializer, MonthEndClosingSerializer, MonthEndTaskSerializer, ReconciliationItemSerializer, SalesTaxAccountSerializer, TransactionSerializer, CashAccountSerializer, TransactionListSerializer, AccountCategorySerializer, ChartOfAccountSerializer
from users.models import UserProfile
from finance.utils import create_revenue_account
from rest_framework.exceptions import ValidationError
from django.db import DatabaseError, IntegrityError, connection, connections, transaction as db_transaction
from finance.account_types import ACCOUNT_TYPES
from rest_framework import generics, status
from .utils import create_general_ledger_entry, generate_financial_statements, get_or_create_account, update_chart_of_accounts
import traceback
from pyfactor.logging_config import get_logger
from pyfactor.user_console import console  # Make sure this is importing a single instance
from rest_framework.pagination import PageNumberPagination
from django.core.paginator import Paginator
from .account_types import ACCOUNT_TYPES
from django.utils import timezone
from users.utils import get_tenant_database

# views.py
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated





logger = get_logger()

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def unpaid_invoices(request):
    logger.debug("Unpaid Invoices called")
    user = request.user

    try:
        user_profile = UserProfile.objects.using('default').get(user=user)
        database_name = user_profile.database_name
        logger.debug(f"User Profile: {user_profile}")
        logger.debug(f"Database Name from UserProfile: {database_name}")

        if not database_name:
            logger.error("Database name is empty.")
            return Response({'error': 'Database name is empty.'}, status=status.HTTP_400_BAD_REQUEST)

        router = UserDatabaseRouter()
        router.create_dynamic_database(database_name)

        # Fetch all unpaid invoices
        invoices = Invoice.objects.using(database_name).filter(is_paid=False).order_by('-date')[:10]  # Get the 10 most recent unpaid invoices

        # Pagination
        page_size = int(request.GET.get('page_size', 10))  # Default to 10 items per page
        page_number = int(request.GET.get('page', 1))  # Default to first page
        paginator = Paginator(invoices, page_size)
        page_obj = paginator.get_page(page_number)

        serializer = InvoiceSerializer(page_obj, many=True)

        return Response({
            'results': serializer.data,
            'count': paginator.count,
            'next': page_obj.has_next(),
            'previous': page_obj.has_previous(),
            'num_pages': paginator.num_pages,
        })

    except UserProfile.DoesNotExist:
        logger.error(f"UserProfile does not exist for user: {user}")
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        logger.exception(f"Error fetching unpaid invoices: {str(e)}")
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Create your views here.
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def create_income(request):
    logger.debug("Create Income: Received request data: %s", request.data)
    user = request.user

    if not user.is_authenticated:
        return handle_unauthenticated_user()

    try:
        database_name = get_user_database(user)
        validate_required_fields(request.data)
        parsed_data = parse_request_data(request.data)

        with db_transaction.atomic(using=database_name):
            if is_cash_deposit_to_ar(parsed_data):
                handle_cash_deposit_to_ar(parsed_data, database_name)
            else:
                handle_other_income(parsed_data, database_name)

            handle_sales_tax(parsed_data, database_name)

            # Handle invoice payment if invoice_id is provided
            invoice_id = request.data.get('invoice_id')
            if invoice_id:
                handle_invoice_payment(invoice_id, parsed_data, database_name)

        return Response({"message": "Income record created successfully"}, status=status.HTTP_201_CREATED)

    except UserProfile.DoesNotExist:
        return handle_user_profile_not_found(user)
    except Exception as e:
        return handle_unexpected_error(e)
    
    
def handle_invoice_payment(invoice_id, data, database_name):
    invoice = Invoice.objects.using(database_name).get(id=invoice_id)
    
    if invoice.is_paid:
        raise ValueError("This invoice has already been paid")
    
    if float(data['amount']) != float(invoice.amount):
        raise ValueError(f"Payment amount ({data['amount']}) does not match invoice amount ({invoice.amount})")

    invoice.is_paid = True
    invoice.status = 'paid'
    invoice.save()
    
    create_general_ledger_entry(database_name, cash_account, data['amount'], 'debit', f"Payment received for Invoice #{invoice.invoice_num}")
    update_chart_of_accounts(database_name, cash_account.account_number, data['amount'], 'debit')
    
    create_general_ledger_entry(database_name, ar_account, data['amount'], 'credit', f"Payment received for Invoice #{invoice.invoice_num}")
    update_chart_of_accounts(database_name, ar_account.account_number, data['amount'], 'credit')


    # Get the cash account more specifically
    try:
        cash_account = Account.objects.using(database_name).get(
            name=data['account_name'],
            account_type__name='Cash'  # Assuming you have an account type for Cash
        )
    except Account.DoesNotExist:
        raise ValueError(f"Cash account '{data['account_name']}' not found")
    except Account.MultipleObjectsReturned:
        # If there are still multiple accounts, let's get the first one and log a warning
        cash_account = Account.objects.using(database_name).filter(
            name=data['account_name'],
            account_type__name='Cash'
        ).first()
        logger.warning(f"Multiple cash accounts found with name '{data['account_name']}'. Using the first one.")

    ar_account = Account.objects.using(database_name).get(name='Accounts Receivable')

    # Debit Cash account
    FinanceTransaction.objects.using(database_name).create(
        date=data['date'],
        description=f"Payment received for Invoice #{invoice.invoice_num}",
        account=cash_account,
        type='debit',
        amount=data['amount']
    )

    # Credit Accounts Receivable
    FinanceTransaction.objects.using(database_name).create(
        date=data['date'],
        description=f"Payment received for Invoice #{invoice.invoice_num}",
        account=ar_account,
        type='credit',
        amount=data['amount']
    )

    logger.info(f"Invoice {invoice.invoice_num} marked as paid and journal entries created")

def handle_unauthenticated_user():
    logger.warning("Unauthenticated user attempted to create income")
    console.error("Unauthenticated user attempted to create income")
    return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

def get_user_database(user):
    """
    Get the database associated with a user. Uses the tenant-aware function from users.utils.
    """
    database_name = get_tenant_database(user)
    
    # Make sure we log the result for debugging
    if database_name:
        logger.debug(f"Retrieved database name: {database_name} for user {user.id}")
    else:
        logger.error(f"Failed to get database name for user {user.id}")
        
    return database_name


def validate_required_fields(data):
    required_fields = ['date', 'account', 'type', 'amount', 'account_type']
    for field in required_fields:
        if field not in data:
            raise ValueError(f"Missing required field: {field}")

def parse_request_data(data):
    parsed_data = {
        'date_string': data['date'],
        'account_name': data['account'],
        'transaction_type': data['type'],
        'amount': data['amount'],
        'sales_tax_percentage': data.get('sales_tax_percentage', '0'),
        'sales_tax_amount': data.get('sales_tax_amount', '0'),
        'notes': data.get('notes', ''),
        'receipt': data.get('receipt'),
        'account_type_name': data['account_type']
    }
    parsed_data['date'] = parse_date(parsed_data['date_string'])
    return parsed_data

def parse_date(date_string):
    try:
        return date_parser.parse(date_string).date()
    except ValueError:
        raise ValueError("Invalid date format. Use YYYY-MM-DD.")

def is_cash_deposit_to_ar(data):
    return (data['account_name'] == 'Cash on Hand' and 
            data['transaction_type'] == 'Deposit' and 
            data['account_type_name'] == 'Accounts Receivable')

def handle_cash_deposit_to_ar(data, database_name):
    logger.info('Creating transactions for Cash on Hand deposit to Accounts Receivable')
    cash_account = get_or_create_account(database_name, 'Cash on Hand', 'Cash')
    ar_account = get_or_create_account(database_name, 'Accounts Receivable', 'Accounts Receivable')

    cash_transaction = create_transaction(data, database_name, cash_account, 'debit', "Cash deposit from Accounts Receivable")
    ar_transaction = create_transaction(data, database_name, ar_account, 'credit', "Payment received")

    create_income_record(database_name, cash_transaction)
    console.info('Income record created for Cash on Hand deposit to Accounts Receivable.')

def handle_other_income(data, database_name):
    account = get_or_create_account(database_name, data['account_name'], data['account_type_name'])
    transaction = create_transaction(data, database_name, account, data['transaction_type'].lower())
    create_income_record(database_name, transaction)
    console.info('Income record created.')

def get_or_create_account(database_name, account_name, account_type_name):
    logger.debug(f"Attempting to get or create account: {account_name} of type {account_type_name} in database {database_name}")
    
    try:
        # First, try to get the AccountType
        logger.debug(f"Trying to get AccountType: {account_type_name}")
        account_type = AccountType.objects.using(database_name).get(name=account_type_name)
        logger.debug(f"Successfully retrieved AccountType: {account_type}")
    except AccountType.DoesNotExist:
        logger.debug(f"AccountType {account_type_name} does not exist. Attempting to create.")
        # If it doesn't exist, create it
        try:
            account_type = AccountType.objects.using(database_name).create(name=account_type_name)
            logger.debug(f"Successfully created AccountType: {account_type}")
        except IntegrityError as e:
            logger.error(f"IntegrityError while creating AccountType: {e}")
            # If we get an IntegrityError, it means another process created it
            # So we try to get it one more time
            account_type = AccountType.objects.using(database_name).get(name=account_type_name)
            logger.debug(f"Retrieved AccountType after IntegrityError: {account_type}")

    # Now that we have the AccountType, get or create the Account
    logger.debug(f"Attempting to get or create Account: {account_name}")
    account, created = Account.objects.using(database_name).get_or_create(
        name=account_name,
        defaults={'account_type': account_type}
    )
    
    if created:
        logger.debug(f"Created new Account: {account}")
    else:
        logger.debug(f"Retrieved existing Account: {account}")

    return account

def create_transaction(data, database_name, account, transaction_type, description=None):
    transaction_data = {
        'date': data['date'],
        'description': description or data['notes'],
        'account': account.id,
        'type': transaction_type,
        'amount': data['amount'],
        'notes': data['notes'],
        'receipt': data['receipt']
    }
    transaction_serializer = TransactionSerializer(data=transaction_data, context={'database_name': database_name})
    if transaction_serializer.is_valid():
        transaction = transaction_serializer.save()
        logger.debug("Transaction created: %s", transaction)
        return transaction
    else:
        logger.error('Transaction validation errors: %s', transaction_serializer.errors)
        raise ValueError('Transaction validation failed')

def create_income_record(database_name, transaction):
    income = Income.objects.using(database_name).create(transaction=transaction)
    logger.info('Income record created: %s', income)

def handle_sales_tax(data, database_name):
    if data['sales_tax_percentage'] and float(data['sales_tax_percentage']) > 0:
        sales_tax_data = {
            'date': data['date'],
            'debit': data['sales_tax_amount'],
            'credit': 0,
            'percentage': data['sales_tax_percentage'],
            'description': f'Sales Tax for transaction',
            'note': data['notes'],
            'transaction': None  # This will be set after saving
        }
        sales_tax_serializer = SalesTaxAccountSerializer(data=sales_tax_data, context={'database_name': database_name})
        if sales_tax_serializer.is_valid():
            sales_tax_account = sales_tax_serializer.save()
            console.info('Sales tax account created.')
        else:
            logger.error(f"Sales Tax Account validation errors: {sales_tax_serializer.errors}")
            console.error('Sales Tax Account validation errors.')
            raise ValueError('Sales Tax Account validation failed')

def handle_user_profile_not_found(user):
    logger.error("UserProfile does not exist for user: %s", user)
    console.error('UserProfile does not exist.')
    return Response({"error": "UserProfile does not exist"}, status=status.HTTP_404_NOT_FOUND)

def handle_unexpected_error(e):
    logger.exception("Unexpected error creating income: %s", e)
    console.error('Unexpected error creating income.')
    return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AccountTypeCreateView(generics.CreateAPIView):
    queryset = AccountType.objects.all()
    serializer_class = AccountTypeSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def account_view(request):
    logger.debug('account_view called')
    user = request.user
    logger.debug("User: %s", user)

    try:
        user_profile = UserProfile.objects.using('default').get(user=user)
        database_name = user_profile.database_name
        logger.debug("User Profile: %s", user_profile)
        logger.debug("Database Name: %s", database_name)

        if not database_name:
            logger.error("Database name is empty.")
            return Response({'error': 'Database name is empty.'}, status=status.HTTP_400_BAD_REQUEST)

        if database_name not in settings.DATABASES:
            logger.warning("Database '%s' does not exist in settings.", database_name)
            return Response({'error': 'Database does not exist in settings.'}, status=status.HTTP_400_BAD_REQUEST)

        if request.method == 'GET':
            try:
                account_types = [{"id": str(id), "name": name} for name, id in ACCOUNT_TYPES.items()]
                logger.debug("Account types being returned: %s", account_types)
                return Response(account_types)
            except Exception as e:
                logger.exception("Error while fetching account types: %s", str(e))
                return Response({'error': 'Error fetching account types'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


        elif request.method == 'POST':
            # Handle POST requests as before
            serializer = AccountSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save(using=database_name)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            logger.error("Serializer errors: %s", serializer.errors)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    except UserProfile.DoesNotExist:
        logger.error("UserProfile does not exist for user: %s", user)
        return Response({'error': 'User profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        logger.exception("An error occurred while processing the request: %s", str(e))
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TransactionCreateView(generics.CreateAPIView):
    logger.debug('TransactionCreateView')
    queryset = FinanceTransaction.objects.all()
    serializer_class = TransactionSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        logger.info('TransactionCreateView - perform_create')
        user = self.request.user
        user_profile = UserProfile.objects.using('default').get(user=user)
        database_name = user_profile.database_name

        date = self.request.data.get('date')
        description = self.request.data.get('description')
        account_id = self.request.data.get('account')
        transaction_type = self.request.data.get('type')
        amount = self.request.data.get('amount')
        notes = self.request.data.get('notes')
        receipt = self.request.data.get('receipt')

        logger.debug('User: %s', user)
        logger.debug('User Profile: %s', user_profile)
        logger.debug('Database Name: %s', database_name)
        logger.debug('Request Data: %s', self.request.data)
        logger.debug('Account ID from request data: %s', account_id)

        try:
            account = Account.objects.using(database_name).get(pk=account_id)
            validated_data = {
                'date': date,
                'description': description,
                'account': account,
                'type': transaction_type,
                'amount': amount,
                'notes': notes,
                'receipt': receipt
            }
            serializer.is_valid(raise_exception=True)
            transaction = serializer.save(using=database_name, **validated_data)
            logger.info('Transaction Created Successfully')
            console.info('Transaction created successfully.')
            logger.info('Created transaction: %s', transaction)
        except Account.DoesNotExist:
            logger.error('Invalid account ID: %s', account_id)
            raise ValidationError('Invalid account ID')
        except ValidationError as e:
            logger.error('Validation errors: %s', e.detail)
            raise
        except Exception as e:
            logger.exception('Error creating transaction: %s', str(e))
            console.error('Unexpected error creating transaction.')
            raise

class IncomeUpdateView(generics.UpdateAPIView):
    logger.debug('IncomeUpdateView')
    queryset = Income.objects.all()
    serializer_class = IncomeSerializer

    def get_queryset(self):
        user = self.request.user
        user_profile = UserProfile.objects.using('default').get(user=user)
        database_name = user_profile.database_name

        return Income.objects.using(database_name).all()

class DeleteAccountView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def delete(self, request, *args, **kwargs):
        user = request.user
        logger.debug('The user we\'re deleting: %s', user)
        logger.debug('User ID: %s', user.id)
        logger.debug('User email: %s', user.email)

        try:
            logger.info("Retrieving database name from the users table...")
            with connection.cursor() as cursor:
                cursor.execute("SELECT database_name FROM users WHERE id = %s", [user.id])
                result = cursor.fetchone()
            
            logger.debug('Result: %s', result)

            if result and result[0]:
                database_name = result[0]
                logger.debug('The database name we\'re working with: %s', database_name)
            else:
                logger.warning("No database name found for the user.")
                return Response({"error": "User's database not found."}, status=status.HTTP_404_NOT_FOUND)

            logger.info("Deleting user account...")

            # Delete the user-specific database
            with db_transaction.atomic():
                logger.debug("Deleting related models in user's database: %s", database_name)
                # Delete all related models in the user's database in the correct order
                RevenueAccount.objects.using(database_name).all().delete()
                Income.objects.using(database_name).all().delete()
                FinanceTransaction.objects.using(database_name).all().delete()
                Account.objects.using(database_name).all().delete()
                AccountType.objects.using(database_name).all().delete()
                logger.info("Related models deleted")

            logger.debug("Dropping user-specific database: %s", database_name)
            # Drop the user-specific database
            if database_name:
                logger.debug("Dropping database: %s", database_name)
                try:
                    with connection.cursor() as cursor:
                        # Sanitize the database name
                        sanitized_database_name = database_name.replace("'", "").replace('"', '').strip()
                        cursor.execute(f"DROP DATABASE IF EXISTS \"{sanitized_database_name}\"")
                    logger.info("User-specific database '%s' dropped", database_name)
                except Exception as e:
                    logger.exception("Failed to drop user-specific database: %s, %s", str(e), database_name)
            else:
                logger.warning("No user-specific database found, skipping database drop")

            # Delete user-related data from the main database
            with db_transaction.atomic():
                logger.info("Deleting related data from other tables...")
                # Delete related data from other tables in the correct order
                user.socialaccount_set.all().delete()
                user.emailaddress_set.all().delete()
                user.profile.delete()
                user.delete()
                logger.info("Related data deleted")

            logger.info('Account deleted successfully')
            return Response({"message": "Account deleted successfully"}, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception("Failed to delete account: %s", str(e))
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class CashAccountCreateView(generics.CreateAPIView):
    queryset = CashAccount.objects.all()
    serializer_class = CashAccountSerializer

class TransactionListView(generics.ListAPIView):
    logger.debug('Transaction List View...')
    serializer_class = TransactionListSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        logger.info('TransactionListView - get_queryset')
        user = self.request.user
        logger.debug("User: %s", user)

        try:
            user_profile = UserProfile.objects.using('default').get(user=user)
            database_name = user_profile.database_name
            logger.debug("User Profile: %s", user_profile)
            logger.debug("Database Name from UserProfile: %s", database_name)

            if not database_name:
                logger.error("Database name is empty.")
                return FinanceTransaction.objects.none()  # Return an empty queryset

            if database_name in settings.DATABASES:
                queryset = FinanceTransaction.objects.using(database_name).all()
                logger.debug("Queryset: %s", queryset)
                return queryset
            else:
                logger.warning("Database '%s' does not exist in settings.", database_name)
                return FinanceTransaction.objects.none()
        
        except UserProfile.DoesNotExist:
            logger.error("UserProfile does not exist for user: %s", user)
            return FinanceTransaction.objects.none()
        
        except Exception as e:
            logger.exception("An error occurred while retrieving the queryset: %s", e)
            return FinanceTransaction.objects.none()

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def account_category_list(request):
    logger.debug("Fetching account categories...")
    if request.method == 'GET':
        categories = AccountCategory.objects.all()
        logger.debug(f"Categories found: {categories}")
        serializer = AccountCategorySerializer(categories, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = AccountCategorySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        logger.error(f"Serializer errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)



@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def account_category_detail(request, pk):
    try:
        category = AccountCategory.objects.get(pk=pk)
    except AccountCategory.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = AccountCategorySerializer(category)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = AccountCategorySerializer(category, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        category.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

def get_user_database(user):
    try:
        user_profile = UserProfile.objects.using('default').get(user=user)
        return user_profile.database_name
    except UserProfile.DoesNotExist:
        logger.error(f"UserProfile does not exist for user: {user}")
        return None
    
    
@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def chart_of_account_detail(request, pk):
    user = request.user
    database_name = get_user_database(user)

    try:
        account = ChartOfAccount.objects.using(database_name).get(pk=pk)
    except ChartOfAccount.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = ChartOfAccountSerializer(account, context={'database_name': database_name})
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = ChartOfAccountSerializer(account, data=request.data, context={'database_name': database_name})
        if serializer.is_valid():
            updated_account = serializer.save()
            return Response(ChartOfAccountSerializer(updated_account).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        account.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def chart_of_accounts(request):
    try:
        user = request.user
        
        # Try multiple ways to get the business/tenant ID
        business_id = getattr(user, 'business_id', None)
        if not business_id:
            business_id = getattr(user, 'tenant_id', None)
        if not business_id:
            business_id = getattr(request, 'tenant_id', None)
        if not business_id:
            # Try to get from X-Business-ID header
            business_id = request.META.get('HTTP_X_BUSINESS_ID', None)
        
        logger.debug("Chart of Accounts API called")
        logger.debug("User: %s, Business ID: %s", user.email, business_id)
        logger.debug("Request tenant_id: %s", getattr(request, 'tenant_id', None))
        logger.debug("User tenant_id: %s", getattr(user, 'tenant_id', None))

        if request.method == 'GET':
            # Filter by business for proper tenant isolation
            if business_id:
                logger.debug("Filtering ChartOfAccount by business=%s", business_id)
                chart_accounts = ChartOfAccount.objects.filter(business=business_id)
            else:
                logger.warning("No business_id found for user %s", user.email)
                chart_accounts = ChartOfAccount.objects.none()
            
            logger.debug("Chart of Accounts query result: %s", chart_accounts)
            logger.debug("Chart of Accounts count: %s", len(chart_accounts))
            
            serializer = ChartOfAccountSerializer(chart_accounts, many=True)
            logger.debug("Serializer data: %s", serializer.data)
            return Response(serializer.data)
        elif request.method == 'POST':
            if not business_id:
                return Response({"error": "No business/tenant ID found"}, status=400)
                
            data = request.data.copy()
            data['business'] = business_id  # Add business_id to data
            
            serializer = ChartOfAccountSerializer(data=data)
            if serializer.is_valid():
                account = serializer.save(business_id=business_id)
                return Response(ChartOfAccountSerializer(account).data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error("Error in chart_of_accounts view: %s", str(e))
        logger.exception("Full traceback:")
        return Response({"error": f"Internal server error: {str(e)}"}, status=500)
    

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def journal_entry_list(request):
    user = request.user
    business_id = getattr(user, 'business_id', None)
    
    if request.method == 'GET':
        # Filter by business_id for proper tenant isolation
        if business_id:
            journal_entries = JournalEntry.objects.filter(business_id=business_id)
        else:
            journal_entries = JournalEntry.objects.none()
        serializer = JournalEntrySerializer(journal_entries, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        data = request.data.copy()
        data['business'] = business_id  # Add business_id to data
        
        serializer = JournalEntrySerializer(data=data)
        if serializer.is_valid():
            with db_transaction.atomic():
                journal_entry = serializer.save(business_id=business_id)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def journal_entry_detail(request, pk):
    try:
        journal_entry = JournalEntry.objects.get(pk=pk)
    except JournalEntry.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = JournalEntrySerializer(journal_entry)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = JournalEntrySerializer(journal_entry, data=request.data)
        if serializer.is_valid():
            with db_transaction.atomic():
                journal_entry = serializer.save()
                update_account_balances(journal_entry, request.user.profile.database_name)
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        journal_entry.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def post_journal_entry(request, pk):
    try:
        journal_entry = JournalEntry.objects.get(pk=pk)
    except JournalEntry.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if not journal_entry.is_posted:
        with db_transaction.atomic():
            journal_entry.is_posted = True
            journal_entry.save()
            update_account_balances(journal_entry, request.user.profile.database_name)
            
               
            # Add general ledger entries here
            for line in journal_entry.lines.all():
                create_general_ledger_entry(request.user.profile.database_name, 
                                            line.account, 
                                            line.debit_amount, 
                                            'debit', 
                                            f"Journal Entry {journal_entry.id}: {line.description}")
                update_chart_of_accounts(request.user.profile.database_name, 
                                         line.account.account_number, 
                                         line.debit_amount, 
                                         'debit')
                
                create_general_ledger_entry(request.user.profile.database_name, 
                                            line.account, 
                                            line.credit_amount, 
                                            'credit', 
                                            f"Journal Entry {journal_entry.id}: {line.description}")
                update_chart_of_accounts(request.user.profile.database_name, 
                                         line.account.account_number, 
                                         line.credit_amount, 
                                         'credit')
                
        return Response({'status': 'Journal entry posted'})
    return Response({'status': 'Journal entry already posted'}, status=status.HTTP_400_BAD_REQUEST)

def update_account_balances(journal_entry, database_name):
    for line in journal_entry.lines.all():
        update_chart_of_accounts(database_name,
                                 line.account.account_number,
                                 line.debit_amount,
                                 'debit')
        update_chart_of_accounts(database_name,
                                 line.account.account_number,
                                 line.credit_amount,
                                 'credit')
        
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def general_ledger(request):
    logger.debug("General ledger view called")
    logger.debug(f"Request user: {request.user}")
    
    user = request.user
    business_id = getattr(user, 'business_id', None)
    
    start_date = request.query_params.get('start_date')
    end_date = request.query_params.get('end_date')
    account_id = request.query_params.get('account_id')

    # Filter by business_id for proper tenant isolation
    if business_id:
        queryset = GeneralLedgerEntry.objects.filter(business_id=business_id)
    else:
        queryset = GeneralLedgerEntry.objects.none()

    if start_date:
        queryset = queryset.filter(date__gte=start_date)
    if end_date:
        queryset = queryset.filter(date__lte=end_date)
    if account_id:
        queryset = queryset.filter(account_id=account_id)

    logger.debug(f"Query parameters: start_date={start_date}, end_date={end_date}, account_id={account_id}")
    logger.debug(f"Queryset count: {queryset.count()}")
    
    entries = queryset.order_by('date', 'id')
    serializer = GeneralLedgerEntrySerializer(entries, many=True)
    
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def general_ledger_summary(request):
    accounts = ChartOfAccount.objects.all()
    summary = []

    for account in accounts:
        latest_entry = GeneralLedgerEntry.objects.filter(account=account).order_by('-date', '-id').first()
        if latest_entry:
            summary.append({
                'account_id': account.id,
                'account_name': account.name,
                'account_number': account.account_number,
                'balance': latest_entry.balance
            })

    return Response(summary)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def account_reconciliation_list(request):
    logger.debug("Account Reconciliation view called")
    user = request.user
    database_name = get_user_database(user)
    logger.debug(f"Request user: {request.user}")
    logger.debug(f"Request query params: {request.query_params}")
    logger.debug(f"Database Name: {database_name}")
    
    if not database_name:
        return Response({"error": "User database not found"}, status=status.HTTP_400_BAD_REQUEST)

    if request.method == 'GET':
        reconciliations = AccountReconciliation.objects.using(database_name).all()
        serializer = AccountReconciliationSerializer(reconciliations, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = AccountReconciliationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(using=database_name)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def account_reconciliation_detail(request, pk):
    logger.debug("Reconciliation item detail view called")
    user = request.user
    database_name = get_user_database(user)
    logger.debug(f"Request user: {request.user}")
    logger.debug(f"Request query params: {request.query_params}")
    logger.debug(f"Database Name: {database_name}")
    
    if not database_name:
        return Response({"error": "User database not found"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        reconciliation = AccountReconciliation.objects.using(database_name).get(pk=pk)
    except AccountReconciliation.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = AccountReconciliationSerializer(reconciliation)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = AccountReconciliationSerializer(reconciliation, data=request.data)
        if serializer.is_valid():
            serializer.save(using=database_name)
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        reconciliation.delete(using=database_name)
        return Response(status=status.HTTP_204_NO_CONTENT)
    
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def reconciliation_item_list(request):
    logger.debug("Reconciliation item list view called")
    user = request.user
    database_name = get_user_database(user)
    logger.debug(f"Request user: {request.user}")
    logger.debug(f"Request query params: {request.query_params}")
    logger.debug(f"Database Name: {database_name}")
    
    if not database_name:
        return Response({"error": "User database not found"}, status=status.HTTP_400_BAD_REQUEST)

    with connection.cursor() as cursor:
        cursor.execute(f"USE {database_name}")
        
        if request.method == 'GET':
            items = ReconciliationItem.objects.all()
            serializer = ReconciliationItemSerializer(items, many=True)
            return Response(serializer.data)

        elif request.method == 'POST':
            serializer = ReconciliationItemSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def reconciliation_item_detail(request, pk):
    logger.debug("Reconciliation item detail view called")
    user = request.user
    database_name = get_user_database(user)
    logger.debug(f"Request user: {request.user}")
    logger.debug(f"Request query params: {request.query_params}")
    logger.debug(f"Database Name: {database_name}")
    
    if not database_name:
        return Response({"error": "User database not found"}, status=status.HTTP_400_BAD_REQUEST)

    with connection.cursor() as cursor:
        cursor.execute(f"USE {database_name}")
        
        try:
            item = ReconciliationItem.objects.get(pk=pk)
        except ReconciliationItem.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if request.method == 'GET':
            serializer = ReconciliationItemSerializer(item)
            return Response(serializer.data)

        elif request.method == 'PUT':
            serializer = ReconciliationItemSerializer(item, data=request.data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        elif request.method == 'DELETE':
            item.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        
        
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def month_end_closing_list(request):
    user = request.user
    database_name = get_user_database(user)

    if not database_name:
        return Response({"error": "User database not found"}, status=status.HTTP_400_BAD_REQUEST)

    with connection.cursor() as cursor:
        cursor.execute(f"USE {database_name}")

        if request.method == 'GET':
            closings = MonthEndClosing.objects.all().order_by('-year', '-month')
            serializer = MonthEndClosingSerializer(closings, many=True)
            return Response(serializer.data)

        elif request.method == 'POST':
            serializer = MonthEndClosingSerializer(data=request.data)
            if serializer.is_valid():
                closing = serializer.save()
                # Create default tasks for the month-end closing
                default_tasks = [
                    "Review and reconcile all bank accounts",
                    "Review and reconcile accounts receivable",
                    "Review and reconcile accounts payable",
                    "Review and reconcile all balance sheet accounts",
                    "Close the revenue and expense accounts",
                    "Generate financial statements",
                    "Backup financial data"
                ]
                for task_name in default_tasks:
                    MonthEndTask.objects.create(closing=closing, name=task_name)
                return Response(MonthEndClosingSerializer(closing).data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def month_end_closing_detail(request, pk):
    user = request.user
    database_name = get_user_database(user)

    if not database_name:
        return Response({"error": "User database not found"}, status=status.HTTP_400_BAD_REQUEST)

    with connection.cursor() as cursor:
        cursor.execute(f"USE {database_name}")

        try:
            closing = MonthEndClosing.objects.get(pk=pk)
        except MonthEndClosing.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if request.method == 'GET':
            serializer = MonthEndClosingSerializer(closing)
            return Response(serializer.data)

        elif request.method == 'PUT':
            serializer = MonthEndClosingSerializer(closing, data=request.data, partial=True)
            if serializer.is_valid():
                updated_closing = serializer.save()
                if updated_closing.status == 'completed' and not updated_closing.completed_at:
                    updated_closing.completed_at = timezone.now()
                    updated_closing.save()
                return Response(MonthEndClosingSerializer(updated_closing).data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        elif request.method == 'DELETE':
            closing.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_month_end_task(request, pk):
    user = request.user
    database_name = get_user_database(user)

    if not database_name:
        return Response({"error": "User database not found"}, status=status.HTTP_400_BAD_REQUEST)

    with connection.cursor() as cursor:
        cursor.execute(f"USE {database_name}")

        try:
            task = MonthEndTask.objects.get(pk=pk)
        except MonthEndTask.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = MonthEndTaskSerializer(task, data=request.data, partial=True)
        if serializer.is_valid():
            updated_task = serializer.save()
            if updated_task.is_completed and not updated_task.completed_at:
                updated_task.completed_at = timezone.now()
                updated_task.save()
            return Response(MonthEndTaskSerializer(updated_task).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    


def financial_statement_view(request, statement_type):
    logger.debug(f"Received request for {statement_type} statement")
    logger.debug(f"Request user: {request.user}")
    logger.debug(f"Request type: {type(request)}")

    # Convert DRF Request to Django HttpRequest if necessary
    if isinstance(request, Request):
        request = request._request

    date = request.GET.get('date', timezone.now().date())
    user = request.user

    logger.debug(f"Date: {date}")
    logger.debug(f"User: {user}")

    database_name = get_user_database(user)
    logger.debug(f"Database name: {database_name}")

    if not database_name:
        logger.error(f"User database not found for user: {user}")
        return Response({"error": "User database not found"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        statement = FinancialStatement.objects.using(database_name).get(statement_type=statement_type, date=date)
        serializer = FinancialStatementSerializer(statement)
        logger.info(f"Successfully retrieved {statement_type} statement for date: {date}")
        return Response(serializer.data)
    except FinancialStatement.DoesNotExist:
        logger.warning(f"Statement not found for type: {statement_type}, date: {date}")
        logger.info("Attempting to generate financial statements...")
        
        try:
            generate_financial_statements(database_name)
            logger.info("Financial statements generated successfully")
            
            # Try to fetch the statement again
            try:
                statement = FinancialStatement.objects.using(database_name).get(statement_type=statement_type, date=date)
                serializer = FinancialStatementSerializer(statement)
                logger.info(f"Successfully retrieved newly generated {statement_type} statement for date: {date}")
                return Response(serializer.data)
            except FinancialStatement.DoesNotExist:
                logger.warning(f"Statement still not found after generation attempt: {statement_type}, date: {date}")
                # If it still doesn't exist, return an empty structure
                empty_data = {
                    'statement_type': statement_type,
                    'date': str(date),
                    'data': {}
                }
                logger.info(f"Returning empty data structure for {statement_type} statement")
                return Response(empty_data)
        except Exception as generation_error:
            logger.exception(f"Error generating financial statements: {str(generation_error)}")
            return Response({"error": "Failed to generate financial statements"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        logger.exception(f"Error retrieving financial statement: {str(e)}")
        return Response({"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profit_and_loss_view(request):
    user = request.user
    business_id = getattr(user, 'business_id', None)
    
    # Generate financial statements using default database
    # The generate_financial_statements function needs to be updated to use business_id
    financial_data = generate_financial_statements('default', business_id)
    return Response(financial_data.get('profit_and_loss', {}))

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def balance_sheet_view(request):
    user = request.user
    business_id = getattr(user, 'business_id', None)
    
    # Generate financial statements using default database
    financial_data = generate_financial_statements('default', business_id)
    return Response(financial_data.get('balance_sheet', {}))

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def cash_flow_view(request):
    user = request.user
    business_id = getattr(user, 'business_id', None)
    
    # Generate financial statements using default database
    financial_data = generate_financial_statements('default', business_id)
    return Response(financial_data.get('cash_flow', {}))



@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def fixed_asset_list(request):
    user = request.user
    business_id = getattr(user, 'business_id', None)
    
    if request.method == 'GET':
        # Filter by business_id for proper tenant isolation
        if business_id:
            fixed_assets = FixedAsset.objects.filter(business_id=business_id)
        else:
            fixed_assets = FixedAsset.objects.none()
        serializer = FixedAssetSerializer(fixed_assets, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        data = request.data.copy()
        data['business'] = business_id  # Add business_id to data
        
        serializer = FixedAssetSerializer(data=data)
        if serializer.is_valid():
            serializer.save(business_id=business_id)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def fixed_asset_detail(request, pk):
    user = request.user
    business_id = getattr(user, 'business_id', None)
    
    try:
        # Filter by business_id for security
        if business_id:
            fixed_asset = FixedAsset.objects.get(pk=pk, business_id=business_id)
        else:
            raise FixedAsset.DoesNotExist
    except FixedAsset.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = FixedAssetSerializer(fixed_asset)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = FixedAssetSerializer(fixed_asset, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        fixed_asset.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    
@api_view(['GET', 'POST'])
def budget_list(request):
    if request.method == 'GET':
        budgets = Budget.objects.all()
        serializer = BudgetSerializer(budgets, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = BudgetSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
def budget_detail(request, pk):
    try:
        budget = Budget.objects.get(pk=pk)
    except Budget.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = BudgetSerializer(budget)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = BudgetSerializer(budget, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        budget.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
@api_view(['GET', 'POST'])
def cost_category_list(request):
    if request.method == 'GET':
        categories = CostCategory.objects.all()
        serializer = CostCategorySerializer(categories, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = CostCategorySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
def cost_category_detail(request, pk):
    try:
        category = CostCategory.objects.get(pk=pk)
    except CostCategory.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = CostCategorySerializer(category)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = CostCategorySerializer(category, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        category.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['GET', 'POST'])
def cost_entry_list(request):
    if request.method == 'GET':
        entries = CostEntry.objects.all()
        serializer = CostEntrySerializer(entries, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = CostEntrySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
def cost_entry_detail(request, pk):
    try:
        entry = CostEntry.objects.get(pk=pk)
    except CostEntry.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = CostEntrySerializer(entry)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = CostEntrySerializer(entry, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        entry.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    
@api_view(['GET', 'POST'])
def intercompany_transaction_list(request):
    if request.method == 'GET':
        transactions = IntercompanyTransaction.objects.all()
        serializer = IntercompanyTransactionSerializer(transactions, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = IntercompanyTransactionSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
def intercompany_transaction_detail(request, pk):
    try:
        transaction = IntercompanyTransaction.objects.get(pk=pk)
    except IntercompanyTransaction.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = IntercompanyTransactionSerializer(transaction)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = IntercompanyTransactionSerializer(transaction, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        transaction.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['GET', 'POST'])
def intercompany_account_list(request):
    if request.method == 'GET':
        accounts = IntercompanyAccount.objects.all()
        serializer = IntercompanyAccountSerializer(accounts, many=True)
        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = IntercompanyAccountSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
def intercompany_account_detail(request, pk):
    try:
        account = IntercompanyAccount.objects.get(pk=pk)
    except IntercompanyAccount.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = IntercompanyAccountSerializer(account)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = IntercompanyAccountSerializer(account, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        account.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    
@api_view(['GET'])
def audit_trail_list(request):
    audit_trails = AuditTrail.objects.all().order_by('-date_time')
    serializer = AuditTrailSerializer(audit_trails, many=True)
    return Response(serializer.data)

@api_view(['GET'])
def audit_trail_detail(request, pk):
    try:
        audit_trail = AuditTrail.objects.get(pk=pk)
    except AuditTrail.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    serializer = AuditTrailSerializer(audit_trail)
    return Response(serializer.data)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def account_balances(request):
    user = request.user
    database_name = get_user_database(user)
    
    if not database_name:
        return Response({"error": "User database not found"}, status=status.HTTP_400_BAD_REQUEST)

    accounts = ChartOfAccount.objects.using(database_name).all().order_by('account_number')
    
    account_data = []
    for account in accounts:
        account_data.append({
            'account_number': account.account_number,
            'name': account.name,
            'account_type': account.category.name,
            'balance': account.balance,
            'description': account.description
        })

    return Response(account_data)