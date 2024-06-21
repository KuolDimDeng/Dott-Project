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
from pyfactor.userDatabaseRouter import UserDatabaseRouter
from .models import AccountType, Account, Transaction, Income, RevenueAccount, CashAccount, Expense
from datetime import datetime
from .serializers import AccountTypeSerializer, AccountSerializer, IncomeSerializer, SalesTaxAccountSerializer, TransactionSerializer, CashAccountSerializer, TransactionListSerializer
from users.models import UserProfile
from finance.utils import create_revenue_account
from rest_framework.exceptions import ValidationError
from django.db import DatabaseError, connection, transaction, connections, transaction as db_transaction
from finance.account_types import ACCOUNT_TYPES
from pyfactor.logging_config import setup_logging
from rest_framework import generics, status
from .utils import get_or_create_account
import traceback
import logging
logger = logging.getLogger(__name__)

logger = setup_logging()

# Create your views here.
@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def create_income(request):
    logger.debug("Create Income: Received request data: %s", request.data)
    user = request.user

    if not user.is_authenticated:
        logger.warning("Unauthenticated user attempted to create income")
        return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        # Fetch the user profile to get the dynamic database name
        logger.debug("Fetching user profile")
        user_profile = UserProfile.objects.using('default').get(user=user)
        database_name = user_profile.database_name
        logger.debug("Fetched user profile. Database name: %s", database_name)

        # Ensure the dynamic database exists
        logger.debug("Creating dynamic database if it doesn't exist: %s", database_name)
        router = UserDatabaseRouter()
        router.create_dynamic_database(database_name)

        # Use the dynamic database for this operation
        logger.debug('Using dynamic database: %s', database_name)

        # Validate input data
        logger.debug("Validating input data")
        required_fields = ['date', 'account', 'type', 'amount']
        for field in required_fields:
            if field not in request.data:
                return Response({"error": f"Missing required field: {field}"}, status=status.HTTP_400_BAD_REQUEST)

        date_string = request.data['date']
        account_name = request.data['account']
        transaction_type = request.data['type']
        amount = request.data['amount']
        sales_tax = request.data.get('sales_tax', '0')
        notes = request.data.get('notes', '')
        receipt = request.data.get('receipt')
        account_type_name = request.data.get('account_type')

        # Parse the formatted date string
        try:
            date = datetime.strptime(date_string, "%Y-%m-%d").date()
        except ValueError:
            return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

        with db_transaction.atomic(using=database_name):
            transaction = None
            if account_name == 'Cash on Hand' and account_type_name == 'Sales' and transaction_type == 'Deposit':
                logger.info('Creating a revenue account...')
                account_type_id = ACCOUNT_TYPES[account_type_name]
                transaction = create_revenue_account(database_name, date, account_name, transaction_type, amount, notes, receipt, account_type_name, account_type_id)
                logger.info('Revenue account created...')
            else:
                account = get_or_create_account(database_name, account_name, account_type_name)
                transaction_data = {
                    'date': date,
                    'description': notes,
                    'account': account.id,
                    'type': transaction_type,
                    'amount': amount,
                    'notes': notes,
                    'receipt': receipt
                }
                context = {'database_name': database_name}
                logger.debug(f"Initializing TransactionSerializer with context: {context}")
                transaction_serializer = TransactionSerializer(data=transaction_data, context=context)
                if transaction_serializer.is_valid():
                    with connections[database_name].cursor() as cursor:
                        logger.debug("Setting search path to dynamic database: %s", database_name)
                        cursor.execute("SET search_path TO public, {}".format(database_name))
                        transaction = transaction_serializer.save()
                        logger.debug("Transaction created: %s", transaction)
                    
                    income = Income.objects.using(database_name).create(transaction=transaction)
                    logger.info('Income record created: %s', income)
                else:
                    logger.error('Transaction validation errors: %s', transaction_serializer.errors)
                    return Response(transaction_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            # Create SalesTaxAccount
            logger.debug(f"Checking sales tax condition: sales_tax={sales_tax}, float(sales_tax)={float(sales_tax)}")
            if sales_tax and float(sales_tax) > 0:
                logger.debug("Sales tax condition met, proceeding with SalesTaxAccount creation")
                sales_tax_data = {
                    'date': date,
                    'debit': sales_tax,
                    'description': f'Sales Tax for transaction {transaction.id if transaction else ""}',
                    'note': notes,
                    'transaction': transaction.id if transaction else None
                }
                logger.debug(f"Prepared sales_tax_data: {sales_tax_data}")
                
                sales_tax_serializer = SalesTaxAccountSerializer(data=sales_tax_data, context={'database_name': database_name})
                if sales_tax_serializer.is_valid():
                    sales_tax_account = sales_tax_serializer.save()
                    logger.info(f"Sales Tax Account created: {sales_tax_account}")
                else:
                    logger.error(f"Sales Tax Account validation errors: {sales_tax_serializer.errors}")
                    return Response(sales_tax_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            else:
                logger.debug("Sales tax condition not met, skipping SalesTaxAccount creation")

        return Response({"message": "Income record created successfully"}, status=status.HTTP_201_CREATED)

    except UserProfile.DoesNotExist:
        logger.error("UserProfile does not exist for user: %s", user)
        return Response({"error": "UserProfile does not exist"}, status=status.HTTP_404_NOT_FOUND)
    except ValueError as e:
        logger.error("ValueError in create_income: %s", str(e))
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.exception("Unexpected error creating income: %s", e)
        return Response({'error': 'Internal server error.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AccountTypeCreateView(generics.CreateAPIView):
    queryset = AccountType.objects.all()
    serializer_class = AccountTypeSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

class AccountCreateView(generics.ListCreateAPIView):
    logger.debug('AccountCreateView')
    queryset = Account.objects.all()
    serializer_class = AccountSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        logger.debug("User: %s", user)

        user_profile = UserProfile.objects.using('default').get(user=user)
        database_name = user_profile.database_name
        logger.debug("User Profile: %s", user_profile)
        logger.debug("Database Name: %s", database_name)

        if not database_name:
            logger.error("Database name is empty.")
            return Account.objects.none()  # Return an empty queryset

        if database_name in settings.DATABASES:
            queryset = Account.objects.using(database_name).all()
            logger.debug("Queryset: %s", queryset)
            return queryset
        else:
            logger.warning("Database '%s' does not exist in settings.", database_name)
            return Account.objects.none()

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
            logger.info('Created transaction: %s', transaction)
        except Account.DoesNotExist:
            logger.error('Invalid account ID: %s', account_id)
            raise ValidationError('Invalid account ID')
        except ValidationError as e:
            logger.error('Validation errors: %s', e.detail)
            raise
        except Exception as e:
            logger.exception('Error creating transaction: %s', str(e))
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
