import React from 'react';
import { Drawer as MuiDrawer, Box } from '@mui/material';
import MainListItems from './lists/listItems';

const drawerWidth = 260; // Increased from 220px to 260px

const Drawer = ({
  drawerOpen,
  handleDrawerToggle,
  handleShowInvoiceBuilder,
  handleCloseInvoiceBuilder,
  handleShowCreateOptions = (option) => console.log(`Create option selected: ${option}`),
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
  const scrollThumbColor = '#64b5f6'; // Light blue color for the scrollbar thumb
  const scrollTrackColor = '#e3f2fd'; // Slightly lighter blue for the scrollbar track

  return (
    <MuiDrawer
      variant={{ xs: 'temporary', sm: 'persistent' }}
      open={drawerOpen}
      onClose={handleDrawerToggle}
      ModalProps={{
        keepMounted: true, // Better performance on mobile
      }}
      BackdropProps={{
        sx: {
          display: { xs: 'block', sm: 'none' }, // Only show backdrop on mobile
          backgroundColor: 'rgba(0, 0, 0, 0.3)', // Lighter backdrop
        }
      }}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          overflowX: 'hidden',
          overflowY: 'auto',
          display: { xs: drawerOpen ? 'block' : 'none', sm: 'block' },
          visibility: { xs: drawerOpen ? 'visible' : 'hidden', sm: 'visible' },
        },
      }}
    >
      <Box
        sx={{
          overflowY: 'auto', // Changed from 'hidden' to 'auto' to allow scrolling
          overflowX: 'hidden',
          mt: '60px',
          height: 'calc(100% - 60px)',
          '&::-webkit-scrollbar': {
            width: '5px',
          },
          '&::-webkit-scrollbar-track': {
            background: scrollTrackColor,
          },
          '&::-webkit-scrollbar-thumb': {
            background: scrollThumbColor,
            borderRadius: '5px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#81d4fa', // Slightly darker on hover for better feedback
          },
          scrollbarWidth: 'thin',
          scrollbarColor: `${scrollThumbColor} ${scrollTrackColor}`,
        }}
      >
        {' '}
        <MainListItems
          handleShowInvoiceBuilder={handleShowInvoiceBuilder}
          handleCloseInvoiceBuilder={handleCloseInvoiceBuilder}
          handleShowCreateOptions={handleShowCreateOptions}
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
        />
      </Box>
    </MuiDrawer>
  );
};

export default Drawer;
