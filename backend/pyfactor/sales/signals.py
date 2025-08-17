"""
Sales app signals for automated tax posting
"""
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from sales.models import Invoice, POSTransaction
from taxes.services.tax_posting_service import TaxPostingService

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Invoice)
def post_invoice_tax_entries(sender, instance, created, **kwargs):
    """
    Automatically post tax journal entries when an invoice is created.
    Only posts for new invoices with tax amounts.
    """
    if created and instance.tax_total and instance.tax_total > 0:
        try:
            tax_service = TaxPostingService()
            journal_entry = tax_service.post_invoice_tax(instance)
            
            if journal_entry:
                logger.info(f"[Invoice Tax Signal] Tax posted for invoice {instance.invoice_num} to journal entry {journal_entry.id}")
            else:
                logger.warning(f"[Invoice Tax Signal] Failed to post tax for invoice {instance.invoice_num}")
                
        except Exception as e:
            logger.error(f"[Invoice Tax Signal] Error posting tax for invoice {instance.invoice_num}: {str(e)}")
            # Don't raise exception - let invoice creation succeed even if tax posting fails


@receiver(post_save, sender=POSTransaction)
def post_pos_tax_entries(sender, instance, created, **kwargs):
    """
    Automatically post tax journal entries when a POS transaction is created.
    Only posts for new transactions with tax amounts.
    Note: This is a backup - primary tax posting happens in confirm_pos_payment
    """
    if created and instance.tax_total and instance.tax_total > 0:
        # Check if journal entry already exists (from payment confirmation)
        if instance.journal_entry:
            logger.info(f"[POS Tax Signal] Journal entry already exists for transaction {instance.transaction_number}")
            return
            
        try:
            tax_service = TaxPostingService()
            journal_entry = tax_service.post_pos_sale_tax(instance)
            
            if journal_entry:
                logger.info(f"[POS Tax Signal] Tax posted for transaction {instance.transaction_number} to journal entry {journal_entry.id}")
            else:
                logger.warning(f"[POS Tax Signal] Failed to post tax for transaction {instance.transaction_number}")
                
        except Exception as e:
            logger.error(f"[POS Tax Signal] Error posting tax for transaction {instance.transaction_number}: {str(e)}")
            # Don't raise exception - let POS transaction creation succeed even if tax posting fails