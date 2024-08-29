import React from 'react';
import { Drawer as MuiDrawer, Box, List, ListItem, ListItemIcon, ListItemText, Collapse } from '@mui/material';
import { styled } from '@mui/material/styles';
import { MainListItems } from './lists/listItems';
import Search from './Search';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import PeopleIcon from '@mui/icons-material/People';
import InventoryIcon from '@mui/icons-material/Inventory';
import ReceiptIcon from '@mui/icons-material/Receipt';


const drawerWidth = 270;

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
  handleProductsClick,
  handleServicesClick,
  handleDashboardClick,
  handlePurchasesClick,
  handleAccountingClick,
}) => {
  const [salesOpen, setSalesOpen] = React.useState(false);

  const toggleSalesMenu = () => {
    setSalesOpen(!salesOpen);
  };

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
          top: '64px',
          height: 'calc(100% - 64px)',
          borderRight: 'none',
          overflowX: 'hidden',
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
          handleDashboardClick={handleDashboardClick}
          handlePurchasesClick={handlePurchasesClick}
          handleAccountingClick={handleAccountingClick}
        />
 

      </Box>
    </MuiDrawer>
  );
};

export default Drawer;