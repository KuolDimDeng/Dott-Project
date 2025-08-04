'use client';

import React from 'react';
import DashboardRouter from '../router/DashboardRouter';

/**
 * RenderMainContent - Simplified routing component
 * Reduced from 3,119 lines to ~50 lines using Router pattern
 */
const RenderMainContent = React.memo(function RenderMainContent({
  // Extract the view from props
  view = 'dashboard',
  subView,
  userData,
  // Pass through all other props to the router
  ...props
}) {
  // Determine the current view based on props
  let currentView = view;
  
  // Legacy prop mapping for backward compatibility
  if (props.showProductManagement) {
    currentView = 'products';
  } else if (props.showCustomerList) {
    currentView = 'customers';
  } else if (props.showBankingDashboard) {
    currentView = 'banking';
  } else if (props.showHRDashboard) {
    currentView = 'hr';
  } else if (props.showAnalysisPage) {
    currentView = 'analytics';
  } else if (props.showMainDashboard || !currentView) {
    currentView = 'dashboard';
  }
  
  // Add more legacy mappings as needed
  if (props.showTransactionForm) {
    currentView = 'transactions';
  }
  
  if (props.showInvoiceBuilder) {
    currentView = 'invoice-builder';
  }

  return (
    <div className="h-full">
      <DashboardRouter
        view={currentView}
        subView={subView}
        userData={userData}
        {...props}
      />
    </div>
  );
});

export default RenderMainContent;
