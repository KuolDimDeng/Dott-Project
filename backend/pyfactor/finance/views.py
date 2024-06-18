from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.generics import CreateAPIView, ListCreateAPIView, UpdateAPIView, ListAPIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.shortcuts import get_object_or_404
from .models import AccountType, Account, Transaction, Income, RevenueAccount, CashAccount, Expense
from datetime import datetime
from .serializers import AccountTypeSerializer, AccountSerializer, IncomeSerializer, TransactionSerializer, CashAccountSerializer, TransactionListSerializer
from users.models import UserProfile
from finance.utils import create_revenue_account
from rest_framework.exceptions import ValidationError
from django.db import DatabaseError, connection, transaction
from pyfactor.logging_config import setup_logging
from rest_framework import generics, status
import traceback

logger = setup_logging()

# Create your views here.
class IncomeCreateView(APIView):
    logger.debug('IncomeCreateView...')
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        user = self.request.user
        logger.debug('User: %s', user)
        
        try:
            user_profile = UserProfile.objects.using('default').get(user=user)
            database_name = user_profile.database_name
            logger.debug('User Profile: %s', user_profile)
            logger.debug('Database Name: %s', database_name)
            logger.debug('request: %s', request)

            date_string = request.data.get('date')
            account_name = request.data.get('account')
            transaction_type = request.data.get('type')
            amount = request.data.get('amount')
            notes = request.data.get('notes')
            receipt = request.data.get('receipt')
            account_type_name = request.data.get('account_type')

            # Parse the formatted date string
            date = datetime.strptime(date_string, "%Y-%m-%d").date()

            if account_name == 'Cash on Hand' and account_type_name == 'Sales' and transaction_type == 'Deposit':
                logger.info('Creating a revenue account...')
                create_revenue_account(database_name, date, account_name, transaction_type, amount, notes, receipt, account_type_name)
                logger.info('Revenue account created...')
            else:
                pass

            logger.info('Income record created...Passed')
            return Response({"message": "Income record created successfully"}, status=status.HTTP_201_CREATED)
        
        except UserProfile.DoesNotExist:
            logger.error("UserProfile does not exist for user: %s", user)
            return Response({"error": "UserProfile does not exist"}, status=status.HTTP_404_NOT_FOUND)
        except DatabaseError as e:
            logger.error("Database error: %s", e)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            logger.exception("An error occurred while creating income %s", e)
            logger.error("Traceback:\n%s", traceback.format_exc())
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
