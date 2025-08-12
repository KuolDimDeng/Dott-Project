# File: /Users/kuoldeng/projectx/backend/pyfactor/banking/views.py
from django.conf import settings
from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework import viewsets
from custom_auth.tenant_base_viewset import TenantIsolatedViewSet
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
import plaid
from plaid.model.transactions_get_request_options import TransactionsGetRequestOptions
from plaid.model.transactions_get_request import TransactionsGetRequest
from .utils import get_reconciliation_summary, get_payment_gateway_for_country
from rest_framework import status
from plaid.api import plaid_api
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from plaid.model.sandbox_public_token_create_request import SandboxPublicTokenCreateRequest
from plaid.configuration import Configuration
# Import models properly
from .models import PlaidItem, TinkItem, BankingRule, BankingAuditLog, BankAccount, BankTransaction
import hashlib
import io
from decimal import Decimal
from django.db import transaction as db_transaction
from .serializers import BankAccountSerializer, BankTransactionSerializer, BankingRuleSerializer
from plaid.model.accounts_get_request import AccountsGetRequest
from django.contrib.contenttypes.models import ContentType
from pyfactor.logging_config import get_logger
from datetime import datetime, timedelta  # Make sure this line is included
import csv
from django.http import HttpResponse
from .plaid_service import PlaidService
import os
import json
import certifi
import ssl
from django.db.models import Sum

plaid_service = PlaidService()

# Initialize logger
logger = get_logger()

# Initialize Plaid API configuration
configuration = Configuration(
    host=plaid.Environment.Sandbox,
    api_key={
        'clientId': settings.PLAID_CLIENT_ID,
        'secret': settings.PLAID_SECRET,
    }
)

# Create SSL context using certifi to ensure proper SSL certificate verification
ssl_context = ssl.create_default_context(cafile=certifi.where())

# Create Plaid API client
api_client = plaid.ApiClient(configuration)
plaid_client = plaid_api.PlaidApi(api_client)

# Bank Account ViewSet
class BankAccountViewSet(TenantIsolatedViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = BankAccountSerializer

    def get_queryset(self):
        return BankAccount.objects.filter(user=self.request.user)

    @action(detail=True, methods=['post'])
    def sync(self, request, pk=None):
        return Response({"message": "Sync initiated"})

# Transaction ViewSet
class TransactionViewSet(TenantIsolatedViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = BankTransactionSerializer

    def get_queryset(self):
        return BankTransaction.objects.filter(account__user=self.request.user)

    @action(detail=True, methods=['post'])
    def reconcile(self, request, pk=None):
        transaction = self.get_object()
        db_transaction.is_reconciled = True
        db_transaction.save()
        return Response({"message": "Transaction reconciled"})

# Plaid Link Token View
@method_decorator(csrf_exempt, name='dispatch')
class PlaidLinkTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            user = request.user
            logger.debug(f"Creating link token for user: {user.id}")

            link_token_request = LinkTokenCreateRequest(
                products=[Products('transactions')],
                client_name="Pyfactor",
                country_codes=[CountryCode('US')],
                language='en',
                user=LinkTokenCreateRequestUser(
                    client_user_id=str(user.id)
                )
            )

            response = plaid_client.link_token_create(link_token_request)
            logger.debug(f"Link token created: {response.link_token}")

            return JsonResponse({'link_token': response.link_token})
        except Exception as e:
            logger.error(f"Error creating link token: {str(e)}", exc_info=True)
            return JsonResponse({'error': str(e)}, status=500)

# Plaid Exchange Token View
@method_decorator(csrf_exempt, name='dispatch')
class PlaidExchangeTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            data = json.loads(request.body)
            public_token = data.get('public_token')

            exchange_request = ItemPublicTokenExchangeRequest(public_token=public_token)
            exchange_response = plaid_client.item_public_token_exchange(exchange_request)
            access_token = exchange_response.access_token
            item_id = exchange_response.item_id

            PlaidItem.objects.update_or_create(
                user=request.user,
                defaults={'access_token': access_token, 'item_id': item_id}
            )

            return JsonResponse({'success': True, 'message': 'Bank connected successfully'})
        except Exception as e:
            logger.error(f"Error exchanging public token: {str(e)}", exc_info=True)
            return JsonResponse({'success': False, 'error': 'Failed to connect bank'}, status=500)

# Plaid Accounts View
class PlaidAccountsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            plaid_item = PlaidItem.objects.get(user=request.user)
            request = AccountsGetRequest(access_token=plaid_item.access_token)
            response = plaid_client.accounts_get(request)
            
            serializable_accounts = []
            for account in response['accounts']:
                serializable_account = {
                    'account_id': account.account_id,
                    'balances': {
                        'available': account.balances.available,
                        'current': account.balances.current,
                        'limit': account.balances.limit,
                        'iso_currency_code': account.balances.iso_currency_code,
                        'unofficial_currency_code': account.balances.unofficial_currency_code,
                    },
                    'mask': account.mask,
                    'name': account.name,
                    'official_name': account.official_name,
                    'type': str(account.type),  # Convert AccountType enum to string
                    'subtype': str(account.subtype) if account.subtype else None,  # Handle potential None value
                }
                serializable_accounts.append(serializable_account)
            
            logger.debug(f"Serializable accounts: {serializable_accounts}")
            return JsonResponse({'accounts': serializable_accounts})
        except PlaidItem.DoesNotExist:
            return JsonResponse({'accounts': []})
        except Exception as e:
            logger.error(f"Error in PlaidAccountsView: {str(e)}", exc_info=True)
            return JsonResponse({'error': str(e)}, status=500)

# Plaid Transactions View
class PlaidTransactionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            plaid_item = PlaidItem.objects.get(user=request.user)
            start_date = request.GET.get('start_date')
            end_date = request.GET.get('end_date')

            if start_date:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            if end_date:
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()

            transactions = plaid_service.get_transactions(plaid_item.access_token, start_date, end_date)
            return JsonResponse({'transactions': transactions})
        except PlaidItem.DoesNotExist:
            return JsonResponse({'error': 'No Plaid item found for this user'}, status=404)
        except Exception as e:
            logger.error(f"Error in PlaidTransactionsView: {str(e)}", exc_info=True)
            return JsonResponse({'error': str(e)}, status=500)

# Sandbox Public Token Creation View
@method_decorator(csrf_exempt, name='dispatch')
class CreateSandboxPublicTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            create_request = SandboxPublicTokenCreateRequest(
                institution_id='ins_109508',
                initial_products=['transactions']
            )
            response = plaid_client.sandbox_public_token_create(create_request)
            public_token = response['public_token']
            return JsonResponse({'public_token': public_token})
        except plaid.ApiException as e:
            return JsonResponse({'error': str(e)}, status=400)


class DownloadTransactionsView(APIView):
    def get(self, request):
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        if not start_date or not end_date:
            return Response({"error": "Both start_date and end_date are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        except ValueError:
            return Response({"error": "Invalid date format. Use YYYY-MM-DD"}, status=status.HTTP_400_BAD_REQUEST)

        transactions = BankTransaction.objects.filter(date__range=[start_date, end_date])
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="transactions_{start_date}_to_{end_date}.csv"'

        writer = csv.writer(response)
        writer.writerow(['Date', 'Description', 'Amount', 'Type'])

        for transaction in transactions:
            writer.writerow([
                db_transaction.date.strftime('%Y-%m-%d'),
                db_transaction.description,
                db_transaction.amount,
                db_transaction.transaction_type
            ])

        return response
    


class RecentTransactionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            plaid_item = PlaidItem.objects.get(user=request.user)
            
            end_date = datetime.now().date()
            start_date = end_date - timedelta(days=30)
            
            request = TransactionsGetRequest(
                access_token=plaid_item.access_token,
                start_date=start_date,
                end_date=end_date,
                options=TransactionsGetRequestOptions(
                    count=10,
                    offset=0
                )
            )
            
            response = plaid_client.transactions_get(request)
            
            transactions = []
            for transaction in response['transactions']:
                transactions.append({
                    'id': db_transaction.transaction_id,
                    'date': str(db_transaction.date),
                    'description': db_transaction.name,
                    'amount': db_transaction.amount,
                    'category': db_transaction.category[0] if db_transaction.category else None
                })
            
            return Response({'transactions': transactions})
        except PlaidItem.DoesNotExist:
            return Response({'error': 'No linked bank account found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error in RecentTransactionsView: {str(e)}", exc_info=True)
            return Response(
                {"error": "An error occurred while fetching recent transactions"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            

class CreateLinkTokenView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        region = request.data.get('region')
        provider = request.data.get('provider')
        
        try:
            if provider == 'plaid':
                return self.create_plaid_link_token(request)
            elif region == 'Africa':
                sub_option = request.data.get('sub_option')
                if sub_option == 'Mobile Money':
                    return self.create_africas_talking_link(request)
                elif sub_option == 'Banks':
                    return self.create_african_bank_link(request)
            elif provider == 'tink':
                return self.create_tink_link_token(request)
            elif provider == 'setu':
                return self.create_setu_link_token(request)
            elif provider == 'salt_edge':
                return self.create_salt_edge_link_token(request)
            else:
                return Response({'error': 'Invalid region or provider'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error creating link token: {str(e)}", exc_info=True)
            return Response({'error': 'Failed to create link token'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def create_plaid_link_token(self, request):
        try:
            user = request.user
            plaid_service = PlaidService()
            link_token = plaid_service.create_link_token(str(user.id))
            return Response({'link_token': link_token})
        except Exception as e:
            logger.error(f"Error creating Plaid link token: {str(e)}", exc_info=True)
            return Response({'error': 'Failed to create Plaid link token'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def create_tink_link_token(self, request):
        # Implement Tink link token creation
        return Response({'message': 'Tink integration not implemented yet'}, status=status.HTTP_501_NOT_IMPLEMENTED)

    def create_setu_link_token(self, request):
        # Implement Setu link token creation
        return Response({'message': 'Setu integration not implemented yet'}, status=status.HTTP_501_NOT_IMPLEMENTED)

    def create_salt_edge_link_token(self, request):
        # Implement Salt Edge link token creation
        return Response({'message': 'Salt Edge integration not implemented yet'}, status=status.HTTP_501_NOT_IMPLEMENTED)

    def create_africas_talking_link(self, request):
        # Implement Africa's Talking Mobile Money integration
        return Response({
            'message': 'Africa\'s Talking Mobile Money integration initialized',
            'payment_url': '/api/initiate-mobile-money-payment/'  # Example endpoint
        })

    def create_african_bank_link(self, request):
        bank_provider = request.data.get('bank_provider')
        if bank_provider == 'Mono':
            return self.create_mono_link_token(request)
        elif bank_provider == 'Stitch':
            return self.create_stitch_link_token(request)
        else:
            return Response({'error': 'Invalid African bank provider'}, status=status.HTTP_400_BAD_REQUEST)

    def create_mono_link_token(self, request):
        # Implement Mono link token creation
        return Response({
            'message': 'Mono integration initialized',
            'auth_url': 'https://mono.co/auth?key=your_mono_public_key'  # Replace with actual Mono auth URL
        })

    def create_stitch_link_token(self, request):
        # Implement Stitch link token creation
        client_id = settings.STITCH_CLIENT_ID
        redirect_uri = settings.STITCH_REDIRECT_URI
        scope = 'transactions'  # Adjust based on Stitch's available scopes
        
        auth_url = f"https://secure.stitch.money/connect/oauth2/authorize?client_id={client_id}&scope={scope}&response_type=code&redirect_uri={redirect_uri}"
        
        return Response({'auth_url': auth_url})
    
class ConnectedAccountsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            logger.debug(f"Fetching connected accounts for user: {request.user.id}")
            accounts = BankAccount.objects.filter(user=request.user)
            logger.debug(f"Found {accounts.count()} accounts")
            serialized_accounts = [{
                'id': account.id,
                'name': account.bank_name,
                'balance': float(account.balance),  # Ensure balance is serializable
                'account_type': account.account_type or 'Unknown',
                'provider': account.integration_type.model_class().__name__
            } for account in accounts]
            logger.debug(f"Serialized accounts: {serialized_accounts}")
            return Response(serialized_accounts)
        except Exception as e:
            logger.error(f"Failed to fetch connected accounts: {str(e)}", exc_info=True)
            return Response({'error': f'Failed to fetch connected accounts: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
class ConnectBankAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        provider_data = request.data

        region = provider_data.get('region')
        provider = provider_data.get('provider')

        try:
            if provider == 'plaid':
                integration = PlaidItem.objects.create(
                    user=user,
                    access_token=provider_data['access_token'],
                    item_id=provider_data['item_id']
                )
                integration_type = ContentType.objects.get_for_model(PlaidItem)
            elif provider == 'tink':
                integration = TinkItem.objects.create(
                    user=user,
                    access_token=provider_data['access_token'],
                    item_id=provider_data['item_id']
                )
                integration_type = ContentType.objects.get_for_model(TinkItem)
            else:
                return Response({'error': 'Unsupported provider'}, status=status.HTTP_400_BAD_REQUEST)

            bank_account = BankAccount.objects.create(
                user=user,
                bank_name=provider_data['bank_name'],
                account_number=provider_data['account_number'],
                balance=provider_data['balance'],
                account_type=provider_data.get('account_type'),
                integration_type=integration_type,
                integration_id=integration.id
            )

            return Response({
                'message': 'Bank account connected successfully',
                'account_id': bank_account.id
            }, status=status.HTTP_201_CREATED)

        except KeyError as e:
            return Response({'error': f'Missing required field: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'error': f'Failed to connect bank account: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        
class BankingReportView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            account_id = request.query_params.get('account_id')
            start_date = request.query_params.get('start_date')
            end_date = request.query_params.get('end_date')

            if not account_id or not start_date or not end_date:
                return Response(
                    {"error": "account_id, start_date, and end_date are required"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            try:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            except ValueError:
                return Response({"error": "Invalid date format. Use YYYY-MM-DD"}, status=status.HTTP_400_BAD_REQUEST)

            account = BankAccount.objects.get(id=account_id, user=request.user)
            transactions = BankTransaction.objects.filter(
                account=account,
                date__range=[start_date, end_date]
            ).order_by('date')

            # Calculate balances
            beginning_balance = account.get_balance_at_date(start_date)
            ending_balance = account.get_balance_at_date(end_date)

            # Prepare transaction data
            transaction_data = BankTransactionSerializer(transactions, many=True).data

            # Calculate totals
            total_credits = transactions.filter(transaction_type='CREDIT').aggregate(Sum('amount'))['amount__sum'] or 0
            total_debits = transactions.filter(transaction_type='DEBIT').aggregate(Sum('amount'))['amount__sum'] or 0

            # Get reconciliation summary
            reconciliation_summary = get_reconciliation_summary(account, end_date)

            report_data = {
                "bank_name": account.bank_name,
                "account_number": account.account_number,
                "beginning_balance": float(beginning_balance),
                "ending_balance": float(ending_balance),
                "transactions": transaction_data,
                "total_credits": float(total_credits),
                "total_debits": float(total_debits),
                "net_change": float(ending_balance - beginning_balance),
                "outstanding_checks": reconciliation_summary['outstanding_checks'],
                "deposits_in_transit": reconciliation_summary['deposits_in_transit']
            }

            return Response(report_data)
        except BankAccount.DoesNotExist:
            return Response({"error": "Bank account not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

def get_user_country_from_cognito(request):
    """
    Extract the user's business country from Cognito attributes.
    
    Args:
        request: The HTTP request with user information
        
    Returns:
        str: Two-letter country code or None if not found
    """
    try:
        # The exact implementation will depend on how Cognito attributes are accessed
        # This assumes the attribute is available in the request or user object
        
        # Try to get from request headers first (might be set by middleware)
        country_code = request.headers.get('X-Business-Country')
        
        # If not in headers, try to get from user's attributes
        if not country_code and hasattr(request.user, 'custom_attributes'):
            country_code = request.user.custom_attributes.get('businesscountry')
            
        # If not in user's attributes directly, try other potential locations
        if not country_code and hasattr(request.user, 'userattributes'):
            # This might be a different way attributes are stored
            country_code = request.user.userattributes.get('custom:businesscountry')
        
        return country_code
    except Exception as e:
        logger.error(f"Error getting user country from Cognito: {str(e)}")
        return None

def connect_bank_account(request):
    """
    Connect a bank account using the appropriate payment gateway based on the user's country.
    
    This function:
    1. Gets the user's country from Cognito attributes
    2. Determines available payment gateways for that country
    3. Uses the gateway specified in the request (or defaults to primary)
    4. Connects to the bank using the selected gateway
    """
    try:
        # Get the user's country
        country_code = get_user_country_from_cognito(request)
        
        # Determine which payment gateways are available for this country
        available_gateways = get_payment_gateway_for_country(country_code)
        
        # Get the selected gateway from the request or default to primary
        selected_gateway = request.data.get('selected_gateway', available_gateways.get('primary', 'WISE'))
        
        # Connect using the appropriate gateway
        if selected_gateway == 'WISE':
            return connect_with_wise(request)
        elif selected_gateway == 'STRIPE':
            return connect_with_stripe(request)
        elif selected_gateway == 'PLAID':
            return connect_with_plaid(request)
        elif selected_gateway == 'DLOCAL':
            return connect_with_dlocal(request)
        elif selected_gateway == 'PAYPAL':
            return connect_with_paypal(request)
        elif selected_gateway == 'MERCADO_PAGO':
            return connect_with_mercado_pago(request)
        elif selected_gateway == 'RAZORPAY':
            return connect_with_razorpay(request)
        elif selected_gateway == 'IYZICO':
            return connect_with_iyzico(request)
        elif selected_gateway == 'M_PESA':
            return connect_with_mpesa(request)
        else:
            # Fallback to Wise
            return connect_with_wise(request)
    except Exception as e:
        logger.error(f"Error connecting bank account: {str(e)}")
        return Response(
            {"error": "Failed to connect bank account", "details": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

def connect_with_wise(request):
    """Placeholder for Wise integration"""
    return Response(
        {"message": "Wise integration not yet implemented"},
        status=status.HTTP_501_NOT_IMPLEMENTED
    )

def connect_with_stripe(request):
    """Placeholder for Stripe integration"""
    return Response(
        {"message": "Stripe integration not yet implemented"},
        status=status.HTTP_501_NOT_IMPLEMENTED
    )

def connect_with_plaid(request):
    """Connect bank account using Plaid"""
    # Existing Plaid implementation
    user = request.user
    provider_data = request.data

    try:
        integration = PlaidItem.objects.create(
            user=user,
            access_token=provider_data['access_token'],
            item_id=provider_data['item_id']
        )
        integration_type = ContentType.objects.get_for_model(PlaidItem)
        
        bank_account = BankAccount.objects.create(
            user=user,
            bank_name=provider_data['bank_name'],
            account_number=provider_data['account_number'],
            balance=provider_data['balance'],
            account_type=provider_data.get('account_type'),
            integration_type=integration_type,
            integration_id=integration.id
        )

        return Response({
            "message": "Bank account connected successfully with Plaid",
            "account_id": bank_account.id
        }, status=status.HTTP_201_CREATED)
    except KeyError as e:
        return Response(
            {"error": f"Missing required field: {str(e)}"},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {"error": f"Failed to connect bank account with Plaid: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

def connect_with_dlocal(request):
    """Placeholder for DLocal integration"""
    return Response(
        {"message": "DLocal integration not yet implemented"},
        status=status.HTTP_501_NOT_IMPLEMENTED
    )

def connect_with_paypal(request):
    """Placeholder for PayPal integration"""
    return Response(
        {"message": "PayPal integration not yet implemented"},
        status=status.HTTP_501_NOT_IMPLEMENTED
    )

def connect_with_mercado_pago(request):
    """Placeholder for Mercado Pago integration"""
    return Response(
        {"message": "Mercado Pago integration not yet implemented"},
        status=status.HTTP_501_NOT_IMPLEMENTED
    )

def connect_with_razorpay(request):
    """Placeholder for Razorpay integration"""
    return Response(
        {"message": "Razorpay integration not yet implemented"},
        status=status.HTTP_501_NOT_IMPLEMENTED
    )

def connect_with_iyzico(request):
    """Placeholder for iyzico integration"""
    return Response(
        {"message": "iyzico integration not yet implemented"},
        status=status.HTTP_501_NOT_IMPLEMENTED
    )

def connect_with_mpesa(request):
    """Placeholder for M-Pesa integration"""
    return Response(
        {"message": "M-Pesa integration not yet implemented"},
        status=status.HTTP_501_NOT_IMPLEMENTED
    )

class PaymentGatewayView(APIView):
    """
    View to retrieve the appropriate payment gateway for a country.
    Uses the country-to-gateway mapping in the database to determine 
    which gateway to use for a given country.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Get payment gateway options for a country.
        
        Query Parameters:
            country (str): Two-letter country code
            
        Returns:
            JSON response with gateway information for the country
        """
        country_code = request.query_params.get('country', None)
        
        if not country_code:
            # Try to get from user's Cognito attributes
            country_code = get_user_country_from_cognito(request)
            
        if not country_code:
            return Response(
                {"error": "Country code not provided"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Get the gateway options from our utility function
        gateway_options = get_payment_gateway_for_country(country_code)
        
        return Response(gateway_options)


# Secure CSV Import ViewSet
class BankTransactionImportView(APIView):
    """
    Secure CSV import for bank transactions with PCI DSS compliance.
    Processes files server-side with validation and duplicate detection.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Import bank transactions from CSV file"""
        start_time = timezone.now()
        audit_log = None
        
        try:
            # Validate file upload
            if 'file' not in request.FILES:
                return Response(
                    {'error': 'No file provided'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            csv_file = request.FILES['file']
            bank_name = request.data.get('bank_name', 'Unknown Bank')
            account_name = request.data.get('account_name', 'Imported Account')
            
            # File size validation (5MB limit)
            if csv_file.size > 5 * 1024 * 1024:
                return Response(
                    {'error': 'File too large. Maximum size is 5MB'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create audit log entry
            audit_log = BankingAuditLog.objects.create(
                user=request.user,
                action='import_csv',
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                details={
                    'file_name': csv_file.name,
                    'file_size': csv_file.size,
                    'bank_name': bank_name
                },
                status='processing'
            )
            
            # Process CSV
            imported_count = 0
            duplicate_count = 0
            error_count = 0
            
            # Get or create bank account
            bank_account, created = BankAccount.objects.get_or_create(
                user=request.user,
                bank_name=bank_name,
                account_number=account_name,
                defaults={'balance': 0}
            )
            
            # Parse CSV
            decoded_file = csv_file.read().decode('utf-8')
            csv_reader = csv.DictReader(io.StringIO(decoded_file))
            
            # Process transactions in batches
            batch_id = uuid.uuid4()
            transactions_to_create = []
            
            for row in csv_reader:
                try:
                    # Extract fields (handle various CSV formats)
                    date_str = self.find_field(row, ['Date', 'Transaction Date', 'Posted Date'])
                    description = self.find_field(row, ['Description', 'Details', 'Memo'])
                    amount_str = self.find_field(row, ['Amount', 'Transaction Amount'])
                    
                    # Handle separate debit/credit columns
                    if not amount_str:
                        debit = self.find_field(row, ['Debit', 'Withdrawal', 'Money Out'])
                        credit = self.find_field(row, ['Credit', 'Deposit', 'Money In'])
                        
                        debit_amount = self.parse_amount(debit) if debit else 0
                        credit_amount = self.parse_amount(credit) if credit else 0
                        amount = credit_amount - debit_amount
                    else:
                        amount = self.parse_amount(amount_str)
                    
                    # Parse date
                    transaction_date = self.parse_date(date_str)
                    if not transaction_date:
                        error_count += 1
                        continue
                    
                    # Generate import ID for duplicate detection
                    import_id = self.generate_import_id(
                        bank_account.id,
                        transaction_date,
                        description,
                        amount
                    )
                    
                    # Check for duplicates
                    if BankTransaction.objects.filter(import_id=import_id).exists():
                        duplicate_count += 1
                        continue
                    
                    # Determine transaction type
                    transaction_type = 'CREDIT' if amount >= 0 else 'DEBIT'
                    
                    # Auto-categorize
                    category = self.categorize_transaction(description)
                    
                    # Create transaction
                    transactions_to_create.append(BankTransaction(
                        account=bank_account,
                        amount=abs(amount),
                        transaction_type=transaction_type,
                        description=description[:255],
                        date=transaction_date,
                        category=category,
                        import_id=import_id,
                        import_batch=batch_id,
                        imported_at=timezone.now(),
                        imported_by=request.user
                    ))
                    
                    # Bulk create every 100 transactions
                    if len(transactions_to_create) >= 100:
                        BankTransaction.objects.bulk_create(transactions_to_create)
                        imported_count += len(transactions_to_create)
                        transactions_to_create = []
                        
                except Exception as e:
                    error_count += 1
                    logger.error(f"Error processing row: {e}")
            
            # Create remaining transactions
            if transactions_to_create:
                BankTransaction.objects.bulk_create(transactions_to_create)
                imported_count += len(transactions_to_create)
            
            # Update audit log
            audit_log.status = 'success'
            audit_log.affected_records = imported_count
            audit_log.completed_at = timezone.now()
            audit_log.duration_ms = int((timezone.now() - start_time).total_seconds() * 1000)
            audit_log.details.update({
                'imported': imported_count,
                'duplicates': duplicate_count,
                'errors': error_count
            })
            audit_log.save()
            
            return Response({
                'imported': imported_count,
                'duplicates': duplicate_count,
                'errors': error_count,
                'batch_id': str(batch_id)
            })
            
        except Exception as e:
            logger.error(f"CSV import error: {e}")
            
            if audit_log:
                audit_log.status = 'failed'
                audit_log.error_message = str(e)
                audit_log.completed_at = timezone.now()
                audit_log.save()
            
            return Response(
                {'error': 'Failed to import CSV'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def get_client_ip(self, request):
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0]
        return request.META.get('REMOTE_ADDR', '')
    
    def find_field(self, row, field_names):
        """Find field value from multiple possible column names"""
        for field in field_names:
            if field in row and row[field]:
                return row[field].strip()
        return None
    
    def parse_amount(self, amount_str):
        """Parse amount string to decimal"""
        if not amount_str:
            return 0
        # Remove currency symbols and commas
        cleaned = amount_str.replace('$', '').replace(',', '').strip()
        try:
            return Decimal(cleaned)
        except:
            return 0
    
    def parse_date(self, date_str):
        """Parse date string with multiple format support"""
        if not date_str:
            return None
        
        formats = [
            '%m/%d/%Y', '%d/%m/%Y', '%Y-%m-%d', '%Y/%m/%d',
            '%d-%b-%Y', '%d %b %Y', '%b %d, %Y', '%B %d, %Y'
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(date_str.strip(), fmt).date()
            except:
                continue
        
        return None
    
    def generate_import_id(self, account_id, date, description, amount):
        """Generate unique ID for duplicate detection"""
        data = f"{account_id}|{date}|{description}|{amount}"
        return hashlib.sha256(data.encode()).hexdigest()
    
    def categorize_transaction(self, description):
        """Auto-categorize transaction based on description"""
        description_lower = description.lower()
        
        # Define category patterns
        categories = {
            'Income': ['salary', 'payment received', 'invoice', 'sales'],
            'Office Supplies': ['staples', 'office depot', 'supplies'],
            'Utilities': ['electric', 'gas', 'water', 'internet', 'phone'],
            'Rent': ['rent', 'lease', 'property management'],
            'Payroll': ['payroll', 'wages', 'direct deposit'],
            'Software': ['software', 'subscription', 'saas'],
            'Travel': ['airline', 'hotel', 'uber', 'lyft'],
            'Meals': ['restaurant', 'cafe', 'coffee', 'lunch'],
            'Bank Fees': ['bank fee', 'service charge', 'overdraft']
        }
        
        for category, patterns in categories.items():
            if any(pattern in description_lower for pattern in patterns):
                return category
        
        return 'Uncategorized'


# Banking Rules ViewSet
class BankingRuleViewSet(TenantIsolatedViewSet):
    """Manage auto-categorization rules for bank transactions"""
    permission_classes = [IsAuthenticated]
    serializer_class = BankingRuleSerializer
    
    def get_queryset(self):
        return BankingRule.objects.all()
    
    def perform_create(self, serializer):
        serializer.save()
        
        # Log rule creation
        BankingAuditLog.objects.create(
            user=self.request.user,
            action='create_rule',
            ip_address=self.get_client_ip(),
            user_agent=self.request.META.get('HTTP_USER_AGENT', ''),
            details={
                'rule_name': serializer.instance.name,
                'rule_id': str(serializer.instance.id)
            },
            status='success',
            affected_records=1
        )
    
    def get_client_ip(self):
        """Get client IP address"""
        x_forwarded_for = self.request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0]
        return self.request.META.get('REMOTE_ADDR', '')


# New Banking Endpoints as per requirements
class SyncTransactionsView(APIView):
    """
    POST /api/banking/sync/transactions/ - Sync transactions from Plaid
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        logger.debug("🎯 [SyncTransactionsView] === START ===")
        logger.debug(f"🎯 [SyncTransactionsView] User: {request.user.id}")
        logger.debug(f"🎯 [SyncTransactionsView] Request data: {request.data}")
        
        try:
            account_id = request.data.get('account_id')
            start_date = request.data.get('start_date')
            end_date = request.data.get('end_date')
            
            logger.debug(f"🎯 [SyncTransactionsView] Params - account_id: {account_id}, start_date: {start_date}, end_date: {end_date}")
            
            # Get the user's Plaid item
            try:
                plaid_item = PlaidItem.objects.get(user=request.user)
                logger.debug(f"🎯 [SyncTransactionsView] Found Plaid item: {plaid_item.item_id}")
            except PlaidItem.DoesNotExist:
                logger.error("🎯 [SyncTransactionsView] No Plaid item found for user")
                return Response({
                    "success": False,
                    "data": {},
                    "message": "No bank account connected. Please connect a bank account first."
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Parse dates if provided
            if start_date:
                try:
                    start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
                except ValueError:
                    logger.error(f"🎯 [SyncTransactionsView] Invalid start_date format: {start_date}")
                    return Response({
                        "success": False,
                        "data": {},
                        "message": "Invalid start_date format. Use YYYY-MM-DD"
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            if end_date:
                try:
                    end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
                except ValueError:
                    logger.error(f"🎯 [SyncTransactionsView] Invalid end_date format: {end_date}")
                    return Response({
                        "success": False,
                        "data": {},
                        "message": "Invalid end_date format. Use YYYY-MM-DD"
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # Default to last 30 days if no dates provided
            if not start_date:
                start_date = (datetime.now() - timedelta(days=30)).date()
            if not end_date:
                end_date = datetime.now().date()
            
            logger.debug(f"🎯 [SyncTransactionsView] Using date range: {start_date} to {end_date}")
            
            # Fetch transactions from Plaid
            try:
                plaid_transactions = plaid_service.get_transactions(
                    plaid_item.access_token, 
                    start_date, 
                    end_date
                )
                logger.debug(f"🎯 [SyncTransactionsView] Fetched {len(plaid_transactions)} transactions from Plaid")
            except Exception as e:
                logger.error(f"🎯 [SyncTransactionsView] Error fetching from Plaid: {str(e)}")
                return Response({
                    "success": False,
                    "data": {},
                    "message": f"Failed to fetch transactions from Plaid: {str(e)}"
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Get or create bank accounts and sync transactions
            synced_count = 0
            duplicate_count = 0
            error_count = 0
            
            with db_transaction.atomic():
                for plaid_tx in plaid_transactions:
                    try:
                        # Get or create bank account
                        bank_account, created = BankAccount.objects.get_or_create(
                            user=request.user,
                            defaults={
                                'bank_name': 'Connected Bank',
                                'account_number': plaid_tx['account_id'][-4:],  # Last 4 digits
                                'balance': 0,
                                'account_type': 'checking',
                                'integration_type': ContentType.objects.get_for_model(PlaidItem),
                                'integration_id': plaid_item.id
                            }
                        )
                        
                        if created:
                            logger.debug(f"🎯 [SyncTransactionsView] Created new bank account: {bank_account.id}")
                        
                        # Generate unique transaction ID for duplicate detection
                        import_id = hashlib.sha256(
                            f"{plaid_tx['transaction_id']}|{plaid_tx['account_id']}".encode()
                        ).hexdigest()
                        
                        # Check for duplicates
                        if BankTransaction.objects.filter(import_id=import_id).exists():
                            duplicate_count += 1
                            continue
                        
                        # Create transaction
                        amount = abs(float(plaid_tx['amount']))
                        transaction_type = 'DEBIT' if float(plaid_tx['amount']) > 0 else 'CREDIT'
                        
                        BankTransaction.objects.create(
                            account=bank_account,
                            amount=amount,
                            transaction_type=transaction_type,
                            description=plaid_tx['name'][:255],
                            date=datetime.strptime(plaid_tx['date'], '%Y-%m-%d').date(),
                            reference_number=plaid_tx['transaction_id'],
                            merchant_name=plaid_tx.get('merchant_name', '')[:255] if plaid_tx.get('merchant_name') else '',
                            category=plaid_tx['category'][0] if plaid_tx.get('category') else 'Uncategorized',
                            import_id=import_id,
                            imported_at=timezone.now(),
                            imported_by=request.user
                        )
                        
                        synced_count += 1
                        
                    except Exception as e:
                        logger.error(f"🎯 [SyncTransactionsView] Error processing transaction {plaid_tx.get('transaction_id', 'unknown')}: {str(e)}")
                        error_count += 1
            
            logger.debug(f"🎯 [SyncTransactionsView] Sync completed - synced: {synced_count}, duplicates: {duplicate_count}, errors: {error_count}")
            
            # Create audit log
            BankingAuditLog.objects.create(
                user=request.user,
                action='sync_transactions',
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                details={
                    'synced_count': synced_count,
                    'duplicate_count': duplicate_count,
                    'error_count': error_count,
                    'date_range': f"{start_date} to {end_date}"
                },
                status='success',
                affected_records=synced_count,
                completed_at=timezone.now()
            )
            
            return Response({
                "success": True,
                "data": {
                    "synced_count": synced_count,
                    "duplicate_count": duplicate_count,
                    "error_count": error_count,
                    "date_range": {
                        "start_date": str(start_date),
                        "end_date": str(end_date)
                    }
                },
                "message": f"Successfully synced {synced_count} transactions"
            })
            
        except Exception as e:
            logger.error(f"🎯 [SyncTransactionsView] Unexpected error: {str(e)}", exc_info=True)
            return Response({
                "success": False,
                "data": {},
                "message": "An unexpected error occurred while syncing transactions"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get_client_ip(self, request):
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0]
        return request.META.get('REMOTE_ADDR', '')
