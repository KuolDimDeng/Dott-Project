import React, { useEffect } from 'react';
import MainListItems from './lists/listItems';

const drawerWidth = 260; // Increased from 220px to 260px
const iconOnlyWidth = 60; // Width when showing only icons

const Drawer = ({
  drawerOpen,
  open,
  handleDrawerToggle,
  onClose,
  handleDrawerItemClick,
  width = drawerWidth,
  handleShowInvoiceBuilder,
  handleCloseInvoiceBuilder,
  handleShowCreateOptions = (option) => console.log(`Create option selected: ${option}`),
  handleShowCreateMenu = () => console.log('Create menu should be shown'),
  handleShowTransactionForm,
  handleReportClick,
  handleBankingClick,
  handleHRClick,
  handlePayrollClick,
  handleAnalysisClick,
  showCustomerList,
  setShowCustomerList,
  handleCreateCustomer,
  handleSalesClick,
  handleDashboardClick,
  handlePurchasesClick,
  handleAccountingClick,
  handleInventoryClick,
  handleHomeClick,
  handleCRMClick,
  handleEmployeeManagementClick,
  userData,
  resetAllStates,
  handleAddTransaction,
  handleOpenFaqDialog,
  handleOpenKnowledgebaseDialog,
  onProfileDetailsClick,
  darkMode,
  handleDrawerOpen,
  handleDrawerClose
}) => {
  // Determine if drawer is open based on either drawerOpen or open prop
  const isOpen = drawerOpen !== undefined ? drawerOpen : (open !== undefined ? open : false);
  
  // Determine drawer toggle handler using either handleDrawerToggle or onClose
  const toggleDrawer = handleDrawerToggle || onClose || (() => {});
  
  // For handleDrawerItemClick compatibility
  const handleItemClickWrapper = (callback, param) => {
    if (handleDrawerItemClick && typeof callback === 'string') {
      // If using the new API with handleDrawerItemClick
      return () => handleDrawerItemClick(callback);
    } else {
      // Use the traditional approach
      return () => {
        if (param !== undefined) {
          callback(param);
        } else if (callback) {
          callback();
        }
        
        // Close drawer on mobile
        if (window.innerWidth < 640) {
          toggleDrawer();
        }
      };
    }
  };

  // Add effect to handle ESC key to close drawer on mobile
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && isOpen) {
        toggleDrawer();
      }
    };
    
    // Add event listener
    window.addEventListener('keydown', handleEscKey);
    
    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [isOpen, toggleDrawer]);
  
  // Add effect to handle drawer state changes
  useEffect(() => {
    // Log state change with measurements
    console.log(`%c[Drawer] State changed: ${isOpen ? 'OPEN' : 'CLOSED'}`, 'background: #f3f4f6; color: #111827; padding: 2px 4px; border-radius: 2px;');
    console.log(`[Drawer] Width: ${isOpen ? drawerWidth : iconOnlyWidth}px`);
    
    // Dispatch custom event for main content to react to drawer state changes
    const detail = { isOpen, width: isOpen ? drawerWidth : iconOnlyWidth };
    console.log('[Drawer] Dispatching drawerStateChanged event:', detail);
    
    window.dispatchEvent(new CustomEvent('drawerStateChanged', { detail }));
    
    // Handle resize events
    const handleResize = () => {
      // Force a resize event when window is resized
      console.log('[Drawer] Window resize detected, dispatching resize event');
      window.dispatchEvent(new Event('resize'));
      
      // Also dispatch drawer state changed event to ensure content updates
      console.log('[Drawer] Re-dispatching drawerStateChanged on resize with state:', { isOpen, width: isOpen ? drawerWidth : iconOnlyWidth });
      window.dispatchEvent(new CustomEvent('drawerStateChanged', { 
        detail: { isOpen, width: isOpen ? drawerWidth : iconOnlyWidth } 
      }));
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, drawerWidth, iconOnlyWidth]);
  
  // Log when the toggle function is called
  const enhancedToggleDrawer = () => {
    console.log(`%c[Drawer] Toggle requested. Current state: ${isOpen ? 'OPEN' : 'CLOSED'}, will change to: ${!isOpen ? 'OPEN' : 'CLOSED'}`, 'background: #fee2e2; color: #991b1b; padding: 2px 4px; border-radius: 2px;');
    toggleDrawer();
  };
  
  return (
    <>
      {/* Mobile backdrop when drawer is fully open */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-40 sm:hidden"
          onClick={enhancedToggleDrawer}
          aria-label="Close menu overlay"
        />
      )}

      {/* Drawer component */}
      <aside 
        key={`drawer-${isOpen ? 'open' : 'closed'}`} 
        className={`
          fixed top-16 left-0 z-50
          ${isOpen ? 'w-[260px]' : 'w-[60px]'}
          h-[calc(100vh-64px)] box-border
          bg-white shadow-md
          overflow-x-hidden
          transition-all duration-300 ease-in-out
        `}
      >
        {/* Close button for mobile */}
        {isOpen && (
          <button
            className="absolute top-3 right-3 p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 sm:hidden"
            onClick={enhancedToggleDrawer}
            aria-label="Close menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
        
        {/* Toggle button for icon-only mode */}
        {!isOpen && (
          <button
            className="fixed top-20 left-3 p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 sm:hidden"
            onClick={enhancedToggleDrawer}
            aria-label="Expand menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        
        <div 
          className="
            h-full
            overflow-y-auto overflow-x-hidden
            scrollbar scrollbar-w-1 scrollbar-thumb-[#d1d5db] scrollbar-track-[#f9fafb]
            hover:scrollbar-thumb-[#9ca3af]
          "
        >
          <MainListItems
            handleShowInvoiceBuilder={handleShowInvoiceBuilder}
            handleCloseInvoiceBuilder={handleCloseInvoiceBuilder}
            handleShowCreateOptions={handleShowCreateOptions}
            handleShowCreateMenu={handleShowCreateMenu}
            handleShowTransactionForm={handleShowTransactionForm}
            handleReportClick={handleReportClick}
            handleBankingClick={handleBankingClick}
            handleHRClick={handleHRClick}
            handlePayrollClick={handlePayrollClick}
            handleAnalysisClick={handleAnalysisClick}
            showCustomerList={showCustomerList}
            setShowCustomerList={setShowCustomerList}
            handleCreateCustomer={handleCreateCustomer}
            handleSalesClick={handleSalesClick}
            handleDashboardClick={handleDashboardClick}
            handlePurchasesClick={handlePurchasesClick}
            handleAccountingClick={handleAccountingClick}
            handleInventoryClick={handleInventoryClick}
            handleHomeClick={handleHomeClick}
            handleCRMClick={handleCRMClick}
            handleEmployeeManagementClick={handleEmployeeManagementClick}
            handleDrawerClose={enhancedToggleDrawer}
            isIconOnly={!isOpen}
            handleItemClick={handleItemClickWrapper}
          />
        </div>
      </aside>
    </>
  );
};

export default Drawer;
