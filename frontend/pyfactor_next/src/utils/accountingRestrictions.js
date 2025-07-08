// Accounting best practices for data deletion
// Based on financial compliance and audit trail requirements

export const AccountingRestrictions = {
  // Items that should NEVER be deleted once they have transactions
  POSTED_TRANSACTIONS: {
    invoices: {
      canDelete: (invoice) => {
        // Can only delete draft invoices
        return invoice.status === 'draft' && !invoice.payment_received;
      },
      message: "Posted invoices cannot be deleted. Create a credit note or void the invoice instead.",
      alternativeAction: "void"
    },
    
    bills: {
      canDelete: (bill) => {
        // Can only delete draft bills
        return bill.status === 'draft' && !bill.payment_made;
      },
      message: "Posted bills cannot be deleted. Create a credit or void the bill instead.",
      alternativeAction: "void"
    },
    
    payments: {
      canDelete: () => false, // Payments can never be deleted
      message: "Payments cannot be deleted once recorded. Create a reversal entry instead.",
      alternativeAction: "reverse"
    },
    
    journalEntries: {
      canDelete: () => false, // Journal entries can never be deleted
      message: "Journal entries cannot be deleted. Create a reversing entry instead.",
      alternativeAction: "reverse"
    }
  },
  
  // Items that can be deleted but with warnings
  MASTER_DATA: {
    customers: {
      canDelete: (customer) => {
        // Can delete if no transactions exist
        return !customer.has_transactions;
      },
      warning: "Deleting a customer will remove all their contact information. Consider marking as inactive instead.",
      checkRelated: ["invoices", "estimates", "payments"]
    },
    
    vendors: {
      canDelete: (vendor) => {
        // Can delete if no transactions exist
        return !vendor.has_transactions;
      },
      warning: "Deleting a vendor will remove all their information. Consider marking as inactive instead.",
      checkRelated: ["bills", "purchase_orders", "payments"]
    },
    
    products: {
      canDelete: (product) => {
        // Can delete if not used in any transactions
        return !product.used_in_transactions;
      },
      warning: "Deleting a product will remove it from your catalog. Consider marking as inactive if it's no longer sold.",
      checkRelated: ["invoices", "bills", "inventory_adjustments"]
    },
    
    services: {
      canDelete: (service) => {
        // Can delete if not used in any transactions
        return !service.used_in_transactions;
      },
      warning: "Deleting a service will remove it from your catalog. Consider marking as inactive instead.",
      checkRelated: ["invoices", "estimates"]
    },
    
    chartOfAccounts: {
      canDelete: (account) => {
        // Can only delete if no transactions posted
        return account.transaction_count === 0 && !account.is_system_account;
      },
      message: "Accounts with transactions cannot be deleted. Mark as inactive instead.",
      warning: "System accounts (like Accounts Receivable) cannot be deleted."
    }
  },
  
  // Items that can be freely deleted
  DRAFT_ITEMS: {
    estimates: {
      canDelete: (estimate) => {
        // Can delete unless converted to invoice
        return !estimate.converted_to_invoice;
      },
      warning: "Accepted estimates should be kept for record-keeping purposes."
    },
    
    purchaseOrders: {
      canDelete: (po) => {
        // Can delete draft POs
        return po.status === 'draft' && !po.converted_to_bill;
      },
      warning: "Approved purchase orders should be kept for audit trail."
    }
  }
};

// Helper function to check if deletion is allowed
export const canDeleteItem = (itemType, item) => {
  // Check posted transactions first
  if (AccountingRestrictions.POSTED_TRANSACTIONS[itemType]) {
    const restriction = AccountingRestrictions.POSTED_TRANSACTIONS[itemType];
    return {
      allowed: restriction.canDelete(item),
      message: restriction.message,
      alternativeAction: restriction.alternativeAction
    };
  }
  
  // Check master data
  if (AccountingRestrictions.MASTER_DATA[itemType]) {
    const restriction = AccountingRestrictions.MASTER_DATA[itemType];
    return {
      allowed: restriction.canDelete(item),
      warning: restriction.warning,
      message: restriction.message,
      checkRelated: restriction.checkRelated
    };
  }
  
  // Check draft items
  if (AccountingRestrictions.DRAFT_ITEMS[itemType]) {
    const restriction = AccountingRestrictions.DRAFT_ITEMS[itemType];
    return {
      allowed: restriction.canDelete(item),
      warning: restriction.warning
    };
  }
  
  // Default - allow with warning
  return {
    allowed: true,
    warning: "This action cannot be undone. The record will be archived in the audit trail."
  };
};

// Best practices messages
export const AccountingBestPractices = {
  deletion: {
    title: "Accounting Data Deletion Policy",
    principles: [
      "Never delete posted financial transactions",
      "Use void or reversal entries for corrections",
      "Maintain complete audit trail for 8+ years",
      "Archive instead of delete when possible",
      "Keep all supporting documents"
    ]
  },
  
  alternatives: {
    void: "Mark the transaction as void to maintain audit trail",
    reverse: "Create a reversing entry to correct the transaction",
    inactive: "Mark as inactive to hide from active lists",
    archive: "Archive the record to maintain history"
  }
};