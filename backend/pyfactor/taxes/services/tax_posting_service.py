"""
Tax Posting Service
Handles automatic creation of journal entries for tax transactions

Flow for POS Sales:
1. POS sale is made → tax rate is fetched from GlobalSalesTaxRate table based on location
2. Tax is calculated using that rate and stored in pos_transaction.tax_total
3. The jurisdiction info (state, county, rate) is stored in pos_transaction.tax_jurisdiction
4. When posting to accounting, this service:
   - Uses the tax rate and jurisdiction from the POS transaction
   - Creates/finds the appropriate tax liability account for that jurisdiction
   - Posts journal entries: Debit Cash, Credit Revenue, Credit Tax Payable
5. Tax transactions are tracked for reporting and filing

Flow for Invoices:
Similar to POS but tax is accrued (not yet collected) until invoice is paid
"""
import logging
from decimal import Decimal
from django.db import transaction as db_transaction
from django.utils import timezone
from finance.models import JournalEntry, JournalEntryLine, ChartOfAccount
from taxes.models import TaxAccount, TaxTransaction
from sales.models import POSTransaction, Invoice
try:
    from taxes.models import GlobalSalesTaxRate
except ImportError:
    GlobalSalesTaxRate = None

logger = logging.getLogger(__name__)


class TaxPostingService:
    """
    Service to automatically post tax transactions to the general ledger.
    Creates proper journal entries for tax collected and tax payments.
    """
    
    def __init__(self):
        self.logger = logger
    
    def post_pos_sale_tax(self, pos_transaction):
        """
        Create journal entries for POS sale with tax.
        
        Entry format:
        Debit: Cash/Bank Account (total amount)
        Credit: Sales Revenue (net amount)
        Credit: Sales Tax Payable (tax amount)
        """
        if not pos_transaction.tax_total or pos_transaction.tax_total <= 0:
            self.logger.info(f"POS transaction {pos_transaction.transaction_number} has no tax")
            return None
        
        try:
            with db_transaction.atomic():
                # Get or create default accounts
                cash_account = self._get_cash_account(pos_transaction.tenant_id)
                revenue_account = self._get_revenue_account(pos_transaction.tenant_id)
                
                # Get or create tax account based on the POS transaction's jurisdiction
                # This uses the tax rate that was already pulled from GlobalSalesTaxRate during POS sale
                tax_account = self._get_or_create_tax_account_from_pos(pos_transaction)
                
                if not all([cash_account, revenue_account, tax_account]):
                    self.logger.error(f"Missing required accounts for tenant {pos_transaction.tenant_id}")
                    return None
                
                # Create journal entry
                journal_entry = JournalEntry.objects.create(
                    tenant_id=pos_transaction.tenant_id,
                    date=pos_transaction.created_at.date(),
                    description=f"POS Sale {pos_transaction.transaction_number} with tax",
                    reference=pos_transaction.transaction_number,
                    business_id=pos_transaction.tenant_id,  # Assuming business_id matches tenant_id
                    status='draft'
                )
                
                # Debit: Cash/Bank (total amount including tax)
                JournalEntryLine.objects.create(
                    tenant_id=pos_transaction.tenant_id,
                    journal_entry=journal_entry,
                    account=cash_account,
                    debit_amount=pos_transaction.total_amount,
                    credit_amount=0,
                    description=f"Payment received - {pos_transaction.payment_method}",
                    business_id=pos_transaction.tenant_id
                )
                
                # Credit: Sales Revenue (subtotal)
                JournalEntryLine.objects.create(
                    tenant_id=pos_transaction.tenant_id,
                    journal_entry=journal_entry,
                    account=revenue_account,
                    debit_amount=0,
                    credit_amount=pos_transaction.subtotal,
                    description="Sales revenue",
                    business_id=pos_transaction.tenant_id
                )
                
                # Credit: Tax Payable (tax amount)
                if pos_transaction.tax_total > 0:
                    JournalEntryLine.objects.create(
                        tenant_id=pos_transaction.tenant_id,
                        journal_entry=journal_entry,
                        account=tax_account.chart_account,
                        debit_amount=0,
                        credit_amount=pos_transaction.tax_total,
                        description=f"Sales tax collected @ {self._get_tax_rate(pos_transaction)}%",
                        business_id=pos_transaction.tenant_id
                    )
                    
                    # Create tax transaction record
                    tax_transaction = TaxTransaction.objects.create(
                        tenant_id=pos_transaction.tenant_id,
                        transaction_date=pos_transaction.created_at,
                        source_type='POS',
                        source_id=pos_transaction.id,
                        source_reference=pos_transaction.transaction_number,
                        tax_account=tax_account,
                        tax_collected=pos_transaction.tax_total,
                        tax_rate_applied=self._get_tax_rate_decimal(pos_transaction),
                        taxable_amount=pos_transaction.subtotal,
                        customer_name=pos_transaction.customer.name if pos_transaction.customer else "Walk-in Customer",
                        customer_id=pos_transaction.customer.id if pos_transaction.customer else None,
                        customer_location=pos_transaction.tax_jurisdiction or {},
                        journal_entry=journal_entry,
                        status='COLLECTED'
                    )
                
                # Post the journal entry
                journal_entry.status = 'posted'
                journal_entry.posted_at = timezone.now()
                journal_entry.save()
                
                # Link journal entry to POS transaction
                pos_transaction.journal_entry = journal_entry
                pos_transaction.save()
                
                self.logger.info(f"Created journal entry {journal_entry.id} for POS {pos_transaction.transaction_number}")
                return journal_entry
                
        except Exception as e:
            self.logger.error(f"Error posting POS tax: {str(e)}")
            raise
    
    def post_invoice_tax(self, invoice):
        """
        Create journal entries for invoice with tax.
        
        Entry format:
        Debit: Accounts Receivable (total amount)
        Credit: Sales Revenue (net amount)
        Credit: Sales Tax Payable (tax amount)
        """
        if not invoice.tax_total or invoice.tax_total <= 0:
            self.logger.info(f"Invoice {invoice.invoice_num} has no tax")
            return None
        
        try:
            with db_transaction.atomic():
                # Get or create default accounts
                ar_account = self._get_ar_account(invoice.tenant_id)
                revenue_account = self._get_revenue_account(invoice.tenant_id)
                tax_account = self._get_default_tax_account(invoice.tenant_id)
                
                if not all([ar_account, revenue_account, tax_account]):
                    self.logger.error(f"Missing required accounts for tenant {invoice.tenant_id}")
                    return None
                
                # Create journal entry
                journal_entry = JournalEntry.objects.create(
                    tenant_id=invoice.tenant_id,
                    date=invoice.date,
                    description=f"Invoice {invoice.invoice_num} with tax",
                    reference=invoice.invoice_num,
                    business_id=invoice.tenant_id,
                    status='draft'
                )
                
                # Debit: Accounts Receivable (total amount)
                JournalEntryLine.objects.create(
                    tenant_id=invoice.tenant_id,
                    journal_entry=journal_entry,
                    account=ar_account,
                    debit_amount=invoice.total,
                    credit_amount=0,
                    description=f"Invoice to {invoice.customer.name}",
                    business_id=invoice.tenant_id
                )
                
                # Credit: Sales Revenue (subtotal)
                JournalEntryLine.objects.create(
                    tenant_id=invoice.tenant_id,
                    journal_entry=journal_entry,
                    account=revenue_account,
                    debit_amount=0,
                    credit_amount=invoice.subtotal,
                    description="Sales revenue",
                    business_id=invoice.tenant_id
                )
                
                # Credit: Tax Payable (tax amount)
                if invoice.tax_total > 0:
                    JournalEntryLine.objects.create(
                        tenant_id=invoice.tenant_id,
                        journal_entry=journal_entry,
                        account=tax_account.chart_account,
                        debit_amount=0,
                        credit_amount=invoice.tax_total,
                        description=f"Sales tax to be collected",
                        business_id=invoice.tenant_id
                    )
                    
                    # Create tax transaction record
                    tax_transaction = TaxTransaction.objects.create(
                        tenant_id=invoice.tenant_id,
                        transaction_date=invoice.created_at,
                        source_type='INVOICE',
                        source_id=invoice.id,
                        source_reference=invoice.invoice_num,
                        tax_account=tax_account,
                        tax_collected=invoice.tax_total,
                        tax_rate_applied=self._calculate_tax_rate(invoice.tax_total, invoice.subtotal),
                        taxable_amount=invoice.subtotal,
                        customer_name=invoice.customer.name,
                        customer_id=invoice.customer.id,
                        journal_entry=journal_entry,
                        status='ACCRUED'  # Not collected yet, just accrued
                    )
                
                # Post the journal entry
                journal_entry.status = 'posted'
                journal_entry.posted_at = timezone.now()
                journal_entry.save()
                
                # Link journal entry to invoice
                invoice.transaction = journal_entry
                invoice.save()
                
                self.logger.info(f"Created journal entry {journal_entry.id} for Invoice {invoice.invoice_num}")
                return journal_entry
                
        except Exception as e:
            self.logger.error(f"Error posting invoice tax: {str(e)}")
            raise
    
    def post_tax_payment(self, tax_filing):
        """
        Create journal entry for tax payment to authorities.
        
        Entry format:
        Debit: Sales Tax Payable (payment amount)
        Credit: Cash/Bank Account (payment amount)
        """
        if not tax_filing.payment_amount or tax_filing.payment_amount <= 0:
            self.logger.info(f"Tax filing {tax_filing.id} has no payment")
            return None
        
        try:
            with db_transaction.atomic():
                # Get accounts
                cash_account = self._get_cash_account(tax_filing.tenant_id)
                tax_payable_account = tax_filing.tax_account.chart_account
                
                if not all([cash_account, tax_payable_account]):
                    self.logger.error(f"Missing required accounts for tax payment")
                    return None
                
                # Create journal entry
                journal_entry = JournalEntry.objects.create(
                    tenant_id=tax_filing.tenant_id,
                    date=tax_filing.payment_date or tax_filing.filing_date,
                    description=f"Tax payment for {tax_filing.period_start} to {tax_filing.period_end}",
                    reference=tax_filing.confirmation_number or f"TAX-{tax_filing.id}",
                    business_id=tax_filing.tenant_id,
                    status='draft'
                )
                
                # Debit: Tax Payable (reduce liability)
                JournalEntryLine.objects.create(
                    tenant_id=tax_filing.tenant_id,
                    journal_entry=journal_entry,
                    account=tax_payable_account,
                    debit_amount=tax_filing.payment_amount,
                    credit_amount=0,
                    description=f"Tax payment to {tax_filing.tax_account.tax_agency_name}",
                    business_id=tax_filing.tenant_id
                )
                
                # Credit: Cash/Bank (payment made)
                JournalEntryLine.objects.create(
                    tenant_id=tax_filing.tenant_id,
                    journal_entry=journal_entry,
                    account=cash_account,
                    debit_amount=0,
                    credit_amount=tax_filing.payment_amount,
                    description=f"Payment via {tax_filing.payment_method}",
                    business_id=tax_filing.tenant_id
                )
                
                # Post the journal entry
                journal_entry.status = 'posted'
                journal_entry.posted_at = timezone.now()
                journal_entry.save()
                
                # Update tax transactions as paid
                TaxTransaction.objects.filter(
                    tenant_id=tax_filing.tenant_id,
                    tax_filing=tax_filing
                ).update(status='PAID')
                
                self.logger.info(f"Created journal entry {journal_entry.id} for tax payment")
                return journal_entry
                
        except Exception as e:
            self.logger.error(f"Error posting tax payment: {str(e)}")
            raise
    
    def reverse_tax_transaction(self, tax_transaction, reason=""):
        """
        Create reversal journal entries for a tax transaction.
        """
        try:
            with db_transaction.atomic():
                original_entry = tax_transaction.journal_entry
                if not original_entry:
                    self.logger.warning(f"No journal entry found for tax transaction {tax_transaction.id}")
                    return None
                
                # Create reversal journal entry
                reversal_entry = JournalEntry.objects.create(
                    tenant_id=original_entry.tenant_id,
                    date=timezone.now().date(),
                    description=f"Reversal: {original_entry.description}",
                    reference=f"REV-{original_entry.reference}",
                    business_id=original_entry.business_id,
                    status='draft'
                )
                
                # Reverse all lines
                for line in original_entry.lines.all():
                    JournalEntryLine.objects.create(
                        tenant_id=line.tenant_id,
                        journal_entry=reversal_entry,
                        account=line.account,
                        debit_amount=line.credit_amount,  # Swap debit and credit
                        credit_amount=line.debit_amount,
                        description=f"Reversal: {line.description}",
                        business_id=line.business_id
                    )
                
                # Post the reversal entry
                reversal_entry.status = 'posted'
                reversal_entry.posted_at = timezone.now()
                reversal_entry.save()
                
                # Reverse the tax transaction
                reversal_tax_transaction = tax_transaction.reverse(reason)
                reversal_tax_transaction.journal_entry = reversal_entry
                reversal_tax_transaction.save()
                
                self.logger.info(f"Created reversal journal entry {reversal_entry.id}")
                return reversal_entry
                
        except Exception as e:
            self.logger.error(f"Error reversing tax transaction: {str(e)}")
            raise
    
    # Helper methods
    def _get_cash_account(self, tenant_id):
        """Get the default cash account for the tenant"""
        try:
            return ChartOfAccount.objects.filter(
                tenant_id=tenant_id,
                category__code__in=['1000', '1010', '1020'],  # Common cash account codes
                is_active=True
            ).first()
        except:
            return None
    
    def _get_revenue_account(self, tenant_id):
        """Get the default sales revenue account"""
        try:
            return ChartOfAccount.objects.filter(
                tenant_id=tenant_id,
                category__code__in=['4000', '4010', '4100'],  # Common revenue account codes
                is_active=True
            ).first()
        except:
            return None
    
    def _get_ar_account(self, tenant_id):
        """Get the accounts receivable account"""
        try:
            return ChartOfAccount.objects.filter(
                tenant_id=tenant_id,
                category__code__in=['1200', '1210'],  # Common AR account codes
                is_active=True
            ).first()
        except:
            return None
    
    def _get_default_tax_account(self, tenant_id):
        """Get the default tax account for the tenant"""
        try:
            # First try to get from business settings
            from users.models import Business
            business = Business.objects.filter(tenant_id=tenant_id).first()
            if business and hasattr(business, 'tax_settings'):
                if business.tax_settings.default_sales_tax_account:
                    return business.tax_settings.default_sales_tax_account
            
            # Otherwise get the first active sales tax account
            return TaxAccount.objects.filter(
                tenant_id=tenant_id,
                tax_type='SALES_TAX',
                is_active=True
            ).first()
        except:
            return None
    
    def _get_or_create_tax_account_from_pos(self, pos_transaction):
        """
        Get or create a tax account based on the POS transaction's tax jurisdiction.
        The POS transaction already has the tax rate from GlobalSalesTaxRate.
        """
        try:
            # Extract jurisdiction info from POS transaction
            # The tax_jurisdiction field stores the location and rate used
            jurisdiction_data = pos_transaction.tax_jurisdiction or {}
            
            # Try to find existing tax account for this jurisdiction
            tax_account = TaxAccount.objects.filter(
                tenant_id=pos_transaction.tenant_id,
                tax_type='SALES_TAX',
                jurisdiction_name=jurisdiction_data.get('state', 'Default'),
                is_active=True
            ).first()
            
            if not tax_account:
                # Create a new tax account for this jurisdiction
                # Get or create the chart of accounts entry for tax payable
                tax_payable_coa = ChartOfAccount.objects.filter(
                    tenant_id=pos_transaction.tenant_id,
                    category__code__in=['2150', '2151', '2152'],  # Sales Tax Payable codes
                    is_active=True
                ).first()
                
                if not tax_payable_coa:
                    # Create a default sales tax payable account
                    from finance.models import AccountCategory
                    category = AccountCategory.objects.filter(
                        code='2150'  # Sales Tax Payable
                    ).first()
                    
                    if category:
                        tax_payable_coa = ChartOfAccount.objects.create(
                            tenant_id=pos_transaction.tenant_id,
                            account_number='2150',
                            name='Sales Tax Payable',
                            category=category,
                            is_active=True
                        )
                
                # Create the tax account
                tax_account = TaxAccount.objects.create(
                    tenant_id=pos_transaction.tenant_id,
                    name=f"Sales Tax - {jurisdiction_data.get('state', 'Default')}",
                    account_number='2150',
                    tax_type='SALES_TAX',
                    jurisdiction_level='STATE' if jurisdiction_data.get('state') else 'FEDERAL',
                    jurisdiction_name=jurisdiction_data.get('state', 'Default'),
                    jurisdiction_code=jurisdiction_data.get('state_code', ''),
                    tax_rate=self._get_tax_rate_decimal(pos_transaction),
                    effective_date=timezone.now().date(),
                    filing_frequency='MONTHLY',
                    filing_due_day=20,
                    chart_account=tax_payable_coa,
                    tax_agency_name=f"{jurisdiction_data.get('state', 'Default')} Department of Revenue",
                    is_active=True
                )
                
                self.logger.info(f"Created new tax account for {jurisdiction_data.get('state', 'Default')}")
            
            return tax_account
            
        except Exception as e:
            self.logger.error(f"Error getting/creating tax account: {str(e)}")
            # Fall back to default tax account
            return self._get_default_tax_account(pos_transaction.tenant_id)
    
    def _get_tax_rate(self, pos_transaction):
        """Get tax rate as percentage from POS transaction"""
        if pos_transaction.subtotal and pos_transaction.subtotal > 0:
            rate = (pos_transaction.tax_total / pos_transaction.subtotal) * 100
            return round(rate, 2)
        return Decimal('0')
    
    def _get_tax_rate_decimal(self, pos_transaction):
        """Get tax rate as decimal from POS transaction"""
        if pos_transaction.subtotal and pos_transaction.subtotal > 0:
            return pos_transaction.tax_total / pos_transaction.subtotal
        return Decimal('0')
    
    def _calculate_tax_rate(self, tax_amount, subtotal):
        """Calculate tax rate from amounts"""
        if subtotal and subtotal > 0:
            return tax_amount / subtotal
        return Decimal('0')