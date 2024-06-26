from django.conf import settings
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
from pyfactor.userDatabaseRouter import UserDatabaseRouter
from .models import AccountType, Account, Transaction, Income, RevenueAccount, CashAccount, Expense
from datetime import datetime
from .serializers import AccountTypeSerializer, AccountSerializer, IncomeSerializer, SalesTaxAccountSerializer, TransactionSerializer, CashAccountSerializer, TransactionListSerializer
from users.models import UserProfile
from finance.utils import create_revenue_account
from rest_framework.exceptions import ValidationError
from django.db import DatabaseError, connection, transaction, connections, transaction as db_transaction
from finance.account_types import ACCOUNT_TYPES
from rest_framework import generics, status
from .utils import get_or_create_account
import traceback
from pyfactor.logging_config import get_logger
from pyfactor.user_console import console  # Make sure this is importing a single instance
from rest_framework.pagination import PageNumberPagination
from django.core.paginator import Paginator
from .account_types import ACCOUNT_TYPES




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
    Transaction.objects.using(database_name).create(
        date=data['date'],
        description=f"Payment received for Invoice #{invoice.invoice_num}",
        account=cash_account,
        type='debit',
        amount=data['amount']
    )

    # Credit Accounts Receivable
    Transaction.objects.using(database_name).create(
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
    user_profile = UserProfile.objects.using('default').get(user=user)
    database_name = user_profile.database_name
    logger.debug("Fetched user profile. Database name: %s", database_name)
    router = UserDatabaseRouter()
    router.create_dynamic_database(database_name)
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
    account_type, _ = AccountType.objects.using(database_name).get_or_create(name=account_type_name)
    account, _ = Account.objects.using(database_name).get_or_create(
        name=account_name,
        account_type=account_type
    )
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
    queryset = Transaction.objects.all()
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
            with transaction.atomic():
                logger.debug("Deleting related models in user's database: %s", database_name)
                # Delete all related models in the user's database in the correct order
                RevenueAccount.objects.using(database_name).all().delete()
                Income.objects.using(database_name).all().delete()
                Expense.objects.using(database_name).all().delete()
                Transaction.objects.using(database_name).all().delete()
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
            with transaction.atomic():
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
                return Transaction.objects.none()  # Return an empty queryset

            if database_name in settings.DATABASES:
                queryset = Transaction.objects.using(database_name).all()
                logger.debug("Queryset: %s", queryset)
                return queryset
            else:
                logger.warning("Database '%s' does not exist in settings.", database_name)
                return Transaction.objects.none()
        
        except UserProfile.DoesNotExist:
            logger.error("UserProfile does not exist for user: %s", user)
            return Transaction.objects.none()
        
        except Exception as e:
            logger.exception("An error occurred while retrieving the queryset: %s", e)
            return Transaction.objects.none()
