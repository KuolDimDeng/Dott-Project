import React, { useEffect } from 'react';
import MainListItems from './lists/listItems';

const drawerWidth = 260; // Increased from 220px to 260px
const iconOnlyWidth = 60; // Width when showing only icons

const Drawer = ({
  drawerOpen,
  handleDrawerToggle,
  handleShowInvoiceBuilder,
  handleCloseInvoiceBuilder,
  handleShowCreateOptions = (option) => console.log(`Create option selected: ${option}`),
  handleShowCreateMenu,
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
}) => {
  // Add effect to handle ESC key to close drawer on mobile
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && drawerOpen) {
        handleDrawerToggle();
      }
    };
    
    // Add event listener
    window.addEventListener('keydown', handleEscKey);
    
    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [drawerOpen, handleDrawerToggle]);
  
  return (
    <>
      {/* Mobile backdrop when drawer is fully open */}
      {drawerOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-40 sm:hidden"
          onClick={handleDrawerToggle}
          aria-label="Close menu overlay"
        />
      )}

      {/* Drawer component */}
      <aside 
        key={`drawer-${drawerOpen ? 'open' : 'closed'}`} 
        className={`
          fixed top-0 left-0 z-40
          ${drawerOpen ? 'w-[260px]' : 'w-[60px]'}
          h-full box-border
          bg-white shadow-md
          overflow-x-hidden
          transition-all duration-300 ease-in-out
        `}
      >
        {/* Close button for mobile */}
        {drawerOpen && (
          <button
            className="absolute top-3 right-3 p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 sm:hidden"
            onClick={handleDrawerToggle}
            aria-label="Close menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
        
        {/* Toggle button for icon-only mode */}
        {!drawerOpen && (
          <button
            className="fixed top-3 left-3 p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 sm:hidden"
            onClick={handleDrawerToggle}
            aria-label="Expand menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        
        <div 
          className="
            mt-[60px] h-[calc(100vh-60px)]
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
            handleDrawerClose={handleDrawerToggle}
            isIconOnly={!drawerOpen}
          />
        </div>
      </aside>
    </>
  );
};

export default Drawer;
