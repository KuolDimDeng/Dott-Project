import React from 'react';
import { Drawer as MuiDrawer, Box } from '@mui/material';
import MainListItems from './lists/listItems';

const drawerWidth = 228;

const Drawer = ({
  drawerOpen,
  handleDrawerToggle,
  handleShowInvoiceBuilder,
  handleCloseInvoiceBuilder,
  handleShowCreateOptions,
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
}) => {

  const scrollThumbColor = '#64b5f6'; // Light blue color for the scrollbar thumb
  const scrollTrackColor = '#e3f2fd'; // Slightly lighter blue for the scrollbar track

  return (
    <MuiDrawer
      variant="persistent"
      open={drawerOpen}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          overflowX: 'hidden', // Prevent horizontal scrollbar
          overflowY: 'hidden', // Allow vertical scrollbar

        },
      }}
    >
      <Box 
        sx={{ 
          overflowY: 'hidden',
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
      >       <MainListItems
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
        />
      </Box>
    </MuiDrawer>
  );
};

export default Drawer;