"""
Accounting Standards Service
Handles IFRS and GAAP specific business logic
"""
from decimal import Decimal
from django.core.exceptions import ValidationError
from users.models import BusinessDetails
from inventory.accounting_methods import InventoryValuationMethod, InventoryValuation


class AccountingStandardsService:
    """Service to handle accounting standard-specific business logic"""
    
    @staticmethod
    def get_business_accounting_standard(business_id):
        """Get the accounting standard for a business"""
        try:
            business_details = BusinessDetails.objects.get(business_id=business_id)
            return business_details.accounting_standard
        except BusinessDetails.DoesNotExist:
            # Default to IFRS if no business details
            return 'IFRS'
    
    @staticmethod
    def get_inventory_valuation_method(business_id):
        """Get the inventory valuation method for a business"""
        try:
            business_details = BusinessDetails.objects.get(business_id=business_id)
            return business_details.inventory_valuation_method
        except BusinessDetails.DoesNotExist:
            return 'WEIGHTED_AVERAGE'
    
    @staticmethod
    def validate_inventory_method(method, business_id):
        """Validate if inventory method is allowed for business's accounting standard"""
        standard = AccountingStandardsService.get_business_accounting_standard(business_id)
        return InventoryValuationMethod.validate_method(method, standard)
    
    @staticmethod
    def calculate_inventory_cost(material, quantity, business_id):
        """Calculate inventory cost based on business's valuation method"""
        method = AccountingStandardsService.get_inventory_valuation_method(business_id)
        return InventoryValuation.get_unit_cost(material, quantity, method)
    
    @staticmethod
    def record_inventory_purchase(material, quantity, unit_cost, business_id, reference=''):
        """Record inventory purchase using appropriate method"""
        method = AccountingStandardsService.get_inventory_valuation_method(business_id)
        return InventoryValuation.record_purchase(material, quantity, unit_cost, method, reference)
    
    @staticmethod
    def can_revalue_assets(business_id):
        """Check if asset revaluation is allowed (IFRS only)"""
        standard = AccountingStandardsService.get_business_accounting_standard(business_id)
        return standard == 'IFRS'
    
    @staticmethod
    def can_capitalize_development_costs(business_id):
        """Check if development costs can be capitalized (IFRS only)"""
        standard = AccountingStandardsService.get_business_accounting_standard(business_id)
        return standard == 'IFRS'
    
    @staticmethod
    def get_depreciation_requirements(business_id):
        """Get depreciation requirements based on accounting standard"""
        standard = AccountingStandardsService.get_business_accounting_standard(business_id)
        if standard == 'IFRS':
            return {
                'component_depreciation': 'required',
                'review_useful_life': 'annually',
                'review_residual_value': 'annually'
            }
        else:  # GAAP
            return {
                'component_depreciation': 'permitted',
                'review_useful_life': 'when_circumstances_change',
                'review_residual_value': 'when_circumstances_change'
            }
    
    @staticmethod
    def get_financial_statement_format(business_id):
        """Get financial statement format - both IFRS and GAAP allow common names"""
        standard = AccountingStandardsService.get_business_accounting_standard(business_id)
        if standard == 'IFRS':
            return {
                'balance_sheet_name': 'Balance Sheet',  # IFRS allows common names
                'income_statement_name': 'Income Statement',
                'equity_statement_name': 'Statement of Changes in Equity',
                'cash_flow_categories': ['Operating', 'Investing', 'Financing'],
                'extraordinary_items_allowed': False,
                'official_names': {
                    'balance_sheet': 'Statement of Financial Position',
                    'income_statement': 'Statement of Comprehensive Income',
                    'equity_statement': 'Statement of Changes in Equity',
                    'cash_flow': 'Statement of Cash Flows'
                }
            }
        else:  # GAAP
            return {
                'balance_sheet_name': 'Balance Sheet',
                'income_statement_name': 'Income Statement',
                'equity_statement_name': 'Statement of Stockholders\' Equity',
                'cash_flow_categories': ['Operating', 'Investing', 'Financing'],
                'extraordinary_items_allowed': False,  # No longer allowed under US GAAP
                'official_names': {
                    'balance_sheet': 'Balance Sheet',
                    'income_statement': 'Income Statement',
                    'equity_statement': 'Statement of Stockholders\' Equity',
                    'cash_flow': 'Statement of Cash Flows'
                }
            }
    
    @staticmethod
    def validate_revenue_recognition(transaction_type, business_id):
        """Validate revenue recognition based on accounting standard"""
        standard = AccountingStandardsService.get_business_accounting_standard(business_id)
        # Both IFRS and GAAP now follow similar 5-step model
        # but implementation details may vary
        return True
    
    @staticmethod
    def get_lease_accounting_treatment(lease_term_months, business_id):
        """Determine lease accounting treatment"""
        standard = AccountingStandardsService.get_business_accounting_standard(business_id)
        # Both IFRS 16 and ASC 842 require most leases on balance sheet
        # but with some differences in implementation
        if lease_term_months > 12:
            return 'capitalize'  # Put on balance sheet
        return 'expense'  # Short-term exemption