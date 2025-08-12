"""
M-Pesa Service for processing payments via Safaricom's M-Pesa API
"""
import logging

logger = logging.getLogger(__name__)


class MpesaService:
    """Service for handling M-Pesa STK Push payments"""
    
    def __init__(self):
        """Initialize M-Pesa service"""
        logger.info("M-Pesa service initialized (stub implementation)")
    
    def stk_push(self, phone_number, amount, account_reference, transaction_desc):
        """
        Initiate STK Push payment request
        
        Args:
            phone_number (str): Customer phone number
            amount (float): Payment amount
            account_reference (str): Reference for the transaction
            transaction_desc (str): Description of the transaction
            
        Returns:
            dict: Response from M-Pesa API
        """
        logger.warning(f"M-Pesa STK Push called but not implemented: {phone_number}, {amount}")
        
        # Return a mock response indicating the service is not configured
        return {
            'ResponseCode': '1',
            'ResponseDescription': 'M-Pesa service not configured'
        }
    
    def query_stk_status(self, checkout_request_id):
        """
        Query the status of an STK Push transaction
        
        Args:
            checkout_request_id (str): Checkout request ID from initial STK push
            
        Returns:
            dict: Status response from M-Pesa API
        """
        logger.warning(f"M-Pesa status query called but not implemented: {checkout_request_id}")
        
        # Return a mock response indicating pending status
        return {
            'ResponseCode': '1',
            'ResultCode': '1037',  # Timeout
            'ResultDesc': 'M-Pesa service not configured'
        }