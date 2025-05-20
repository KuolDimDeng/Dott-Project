# payments/providers/base.py
from abc import ABC, abstractmethod

class PaymentProvider(ABC):
    """Base class for payment providers"""
    
    @abstractmethod
    def process_payroll_payment(self, employee, amount, currency, metadata=None):
        """Process a payroll payment to an employee"""
        pass
        
    @abstractmethod
    def process_tax_payment(self, tax_authority, amount, currency, metadata=None):
        """Process a tax payment to a tax authority"""
        pass
        
    @abstractmethod
    def get_employee_account_form(self):
        """Get form fields needed to set up an employee for this payment method"""
        pass
        
    @abstractmethod
    def validate_account_details(self, details):
        """Validate account details for this provider"""
        pass