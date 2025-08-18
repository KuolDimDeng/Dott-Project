#!/bin/bash

# Script to update Estimates, Orders, and Invoices management components
# with activate/deactivate functionality for compliance

echo "Updating Sales Modules with Activate/Deactivate functionality..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base directory
BASE_DIR="/Users/kuoldeng/projectx/frontend/pyfactor_next/src/app/dashboard/components/forms"

echo -e "${YELLOW}Starting updates for EstimateManagement, OrderManagement, and InvoiceManagement...${NC}"

# Update EstimateManagement.js
echo -e "${GREEN}Updating EstimateManagement.js...${NC}"
cat > /tmp/estimate_patch.txt << 'EOF'
// Add this function after other handlers
const handleToggleEstimateStatus = async (estimate) => {
  const newStatus = !estimate.is_active;
  const action = newStatus ? 'activate' : 'deactivate';
  
  console.log(`[EstimateManagement] ${action}ing estimate:`, estimate.id);
  
  try {
    const response = await fetch(`/api/sales/estimates/${estimate.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        is_active: newStatus
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to ${action} estimate: ${response.status}`);
    }
    
    const updatedEstimate = await response.json();
    console.log(`[EstimateManagement] Estimate ${action}d:`, updatedEstimate);
    
    toast.success(`Estimate ${newStatus ? 'activated' : 'deactivated'} successfully!`);
    
    // Update the estimate in the list
    setEstimates(estimates => 
      estimates.map(e => 
        e.id === estimate.id ? { ...e, is_active: newStatus } : e
      )
    );
    
    // Update selected estimate if it's the same
    if (selectedEstimate?.id === estimate.id) {
      setSelectedEstimate({ ...selectedEstimate, is_active: newStatus });
    }
  } catch (error) {
    console.error(`[EstimateManagement] Error ${action}ing estimate:`, error);
    toast.error(`Failed to ${action} estimate.`);
  }
};
EOF

echo -e "${GREEN}EstimateManagement.js update prepared${NC}"

# Update OrderManagement.js
echo -e "${GREEN}Updating OrderManagement.js...${NC}"
cat > /tmp/order_patch.txt << 'EOF'
// Add this function after other handlers
const handleToggleOrderStatus = async (order) => {
  const newStatus = !order.is_active;
  const action = newStatus ? 'activate' : 'deactivate';
  
  console.log(`[OrderManagement] ${action}ing order:`, order.id);
  
  try {
    const response = await fetch(`/api/sales/orders/${order.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        is_active: newStatus
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to ${action} order: ${response.status}`);
    }
    
    const updatedOrder = await response.json();
    console.log(`[OrderManagement] Order ${action}d:`, updatedOrder);
    
    toast.success(`Order ${newStatus ? 'activated' : 'deactivated'} successfully!`);
    
    // Update the order in the list
    setOrders(orders => 
      orders.map(o => 
        o.id === order.id ? { ...o, is_active: newStatus } : o
      )
    );
    
    // Update selected order if it's the same
    if (selectedOrder?.id === order.id) {
      setSelectedOrder({ ...selectedOrder, is_active: newStatus });
    }
  } catch (error) {
    console.error(`[OrderManagement] Error ${action}ing order:`, error);
    toast.error(`Failed to ${action} order.`);
  }
};
EOF

echo -e "${GREEN}OrderManagement.js update prepared${NC}"

# Update InvoiceManagement.js
echo -e "${GREEN}Updating InvoiceManagement.js...${NC}"
cat > /tmp/invoice_patch.txt << 'EOF'
// Add this function after other handlers
const handleToggleInvoiceStatus = async (invoice) => {
  const newStatus = !invoice.is_active;
  const action = newStatus ? 'activate' : 'deactivate';
  
  console.log(`[InvoiceManagement] ${action}ing invoice:`, invoice.id);
  
  try {
    const response = await fetch(`/api/sales/invoices/${invoice.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        is_active: newStatus
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to ${action} invoice: ${response.status}`);
    }
    
    const updatedInvoice = await response.json();
    console.log(`[InvoiceManagement] Invoice ${action}d:`, updatedInvoice);
    
    toast.success(`Invoice ${newStatus ? 'activated' : 'deactivated'} successfully!`);
    
    // Update the invoice in the list
    setInvoices(invoices => 
      invoices.map(i => 
        i.id === invoice.id ? { ...i, is_active: newStatus } : i
      )
    );
    
    // Update selected invoice if it's the same
    if (selectedInvoice?.id === invoice.id) {
      setSelectedInvoice({ ...selectedInvoice, is_active: newStatus });
    }
  } catch (error) {
    console.error(`[InvoiceManagement] Error ${action}ing invoice:`, error);
    toast.error(`Failed to ${action} invoice.`);
  }
};
EOF

echo -e "${GREEN}InvoiceManagement.js update prepared${NC}"

echo -e "${YELLOW}Note: The actual file updates need to be done manually as they require finding the correct locations to insert the code and update the UI buttons.${NC}"
echo -e "${YELLOW}Key changes needed:${NC}"
echo "1. Add handleToggleStatus functions to each component"
echo "2. Replace delete buttons with activate/deactivate buttons"
echo "3. Add Status column to tables"
echo "4. Add active/inactive count summary cards"
echo "5. Update button colors: orange for deactivate, green for activate"

echo -e "${GREEN}Script complete! Ready to apply changes.${NC}"