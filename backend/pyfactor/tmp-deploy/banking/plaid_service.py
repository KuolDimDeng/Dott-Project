import plaid
from plaid.api import plaid_api
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from plaid.model.transactions_get_request import TransactionsGetRequest
from plaid.model.transactions_get_request_options import TransactionsGetRequestOptions
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from django.conf import settings
from pyfactor.logging_config import get_logger
from datetime import datetime, timedelta

# Initialize the logger
logger = get_logger()

class PlaidService:
    def __init__(self):
        try:
            logger.debug("Initializing PlaidService...")
            # Removed sensitive credential logging
            # Removed sensitive credential logging
            logger.debug(f"PLAID_ENV: {settings.PLAID_ENV}")
            
            configuration = plaid.Configuration(
                host=plaid.Environment.Sandbox if settings.PLAID_ENV == 'sandbox' else plaid.Environment.Production,
                api_key={
                    'clientId': settings.PLAID_CLIENT_ID,
                    'secret': settings.PLAID_SECRET,
                }
            )
            self.client = plaid_api.PlaidApi(plaid.ApiClient(configuration))
            logger.info("PlaidService initialized successfully.")
        except Exception as e:
            logger.error(f"Error initializing PlaidService: {e}", exc_info=True)
            raise

    def create_link_token(self, user_id):
        try:
            logger.debug(f"Creating link token for user ID: {user_id}...")
            request = LinkTokenCreateRequest(
                products=[Products('transactions')],
                client_name="Dott",
                country_codes=[CountryCode('US')],
                language='en',
                user=LinkTokenCreateRequestUser(
                    client_user_id=str(user_id)
                )
            )
            response = self.client.link_token_create(request)
            logger.info(f"Link token created successfully for user ID: {user_id}.")
            return response['link_token']
        except Exception as e:
            logger.error(f"Error creating link token for user ID {user_id}: {e}", exc_info=True)
            raise

    def exchange_public_token(self, public_token):
        try:
            logger.debug(f"Exchanging public token: {public_token[:4]}...")  # Log only the first few characters for security
            exchange_request = ItemPublicTokenExchangeRequest(
                public_token=public_token
            )
            exchange_response = self.client.item_public_token_exchange(exchange_request)
            logger.info(f"Successfully exchanged public token for access token.")
            return exchange_response['access_token'], exchange_response['item_id']
        except Exception as e:
            logger.error(f"Error exchanging public token: {e}", exc_info=True)
            raise

    def get_transactions(self, access_token, start_date=None, end_date=None):
        try:
            if not start_date:
                start_date = (datetime.now() - timedelta(days=30)).date()
            if not end_date:
                end_date = datetime.now().date()

            logger.debug(f"Fetching transactions from {start_date} to {end_date} for access token: {access_token[:4]}...")
            
            request = TransactionsGetRequest(
                access_token=access_token,
                start_date=start_date,
                end_date=end_date,
                options=TransactionsGetRequestOptions(
                    count=100,
                    offset=0
                )
            )
            response = self.client.transactions_get(request)
            
            transactions = response['transactions']
            
            # Process transactions to make them JSON serializable
            serializable_transactions = []
            for transaction in transactions:
                serializable_transaction = {
                    'transaction_id': transaction.transaction_id,
                    'account_id': transaction.account_id,
                    'amount': transaction.amount,
                    'date': str(transaction.date),
                    'name': transaction.name,
                    'merchant_name': transaction.merchant_name,
                    'category': transaction.category,
                    'payment_channel': str(transaction.payment_channel),
                }
                serializable_transactions.append(serializable_transaction)

            logger.info(f"Fetched and processed {len(serializable_transactions)} transactions between {start_date} and {end_date}.")
            return serializable_transactions
        except Exception as e:
            logger.error(f"Error fetching transactions: {e}", exc_info=True)
            raise