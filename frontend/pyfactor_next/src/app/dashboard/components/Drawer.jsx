import React from 'react';
import { Drawer as MuiDrawer, Box, List } from '@mui/material';
import { styled } from '@mui/material/styles';
import { MainListItems } from './lists/listItems';
import Search from './Search'; // Import the Search component

const drawerWidth = 270;

const Drawer = ({ drawerOpen, handleDrawerToggle, handleShowInvoiceBuilder, handleCloseInvoiceBuilder, handleShowCreateOptions, handleShowTransactionForm, handleReportClick, handleBankingClick, handleHRClick, handlePayrollClick, handleAnalysisClick, showCustomerList, setShowCustomerList, handleCreateCustomer, handleSalesClick }) => {
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
          top: '64px', // Start below AppBar
          height: 'calc(100% - 64px)', // Subtract AppBar and BottomAppBar heights
          borderRight: 'none', // Remove right border
          overflowX: 'hidden', // Hide horizontal scrollbar if any
        },
      }}
    >
      <Box sx={{ overflow: 'auto', pl: 0, pr: 0 }}>
        <MainListItems
          showInvoiceBuilder={handleShowInvoiceBuilder}
          hideInvoiceBuilder={handleCloseInvoiceBuilder}
          showCreateOptions={handleShowCreateOptions}
          showTransactionForm={handleShowTransactionForm}
          handleReportClick={handleReportClick}
          drawerOpen={drawerOpen}
          handleDrawerToggle={handleDrawerToggle}
          handleBankingClick={handleBankingClick}
          handleHRClick={handleHRClick}
          handlePayrollClick={handlePayrollClick}
          handleAnalysisClick={handleAnalysisClick}
          showCustomerList={showCustomerList}
          setShowCustomerList={setShowCustomerList}
          handleCreateCustomer={handleCreateCustomer}
          handleSalesClick={handleSalesClick}
        />
       
      </Box>
    </MuiDrawer>
  );
};

export default Drawer;
