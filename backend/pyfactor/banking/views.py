# File: /Users/kuoldeng/projectx/backend/pyfactor/banking/views.py
from django.conf import settings
from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework import viewsets
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
# Temporarily modified to break circular dependency
from .models import PlaidItem
# Temporary placeholders for BankAccount and BankTransaction
class BankAccountPlaceholder:
    objects = type('', (), {'filter': lambda **kwargs: []})()
    DoesNotExist = Exception

class BankTransactionPlaceholder:
    objects = type('', (), {'filter': lambda **kwargs: []})()
    DoesNotExist = Exception

# Use placeholders instead of actual models
BankAccount = BankAccountPlaceholder
BankTransaction = BankTransactionPlaceholder
from .serializers import BankAccountSerializer, BankTransactionSerializer
from plaid.model.accounts_get_request import AccountsGetRequest
from pyfactor.logging_config import get_logger
from datetime import datetime, timedelta  # Make sure this line is included
import csv
from django.http import HttpResponse
from .plaid_service import PlaidService
import os
import json
import certifi
import ssl

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
class BankAccountViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = BankAccountSerializer

    def get_queryset(self):
        return BankAccount.objects.filter(user=self.request.user)

    @action(detail=True, methods=['post'])
    def sync(self, request, pk=None):
        return Response({"message": "Sync initiated"})

# Transaction ViewSet
class TransactionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = BankTransactionSerializer

    def get_queryset(self):
        return BankTransaction.objects.filter(account__user=self.request.user)

    @action(detail=True, methods=['post'])
    def reconcile(self, request, pk=None):
        transaction = self.get_object()
        transaction.is_reconciled = True
        transaction.save()
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
                transaction.date.strftime('%Y-%m-%d'),
                transaction.description,
                transaction.amount,
                transaction.transaction_type
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
                    'id': transaction.transaction_id,
                    'date': str(transaction.date),
                    'description': transaction.name,
                    'amount': transaction.amount,
                    'category': transaction.category[0] if transaction.category else None
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
