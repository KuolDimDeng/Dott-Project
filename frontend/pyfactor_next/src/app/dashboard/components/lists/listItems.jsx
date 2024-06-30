import * as React from 'react';
import { useState, useCallback, useEffect } from 'react';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import { Menu, MenuItem, Box } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import PaymentsIcon from '@mui/icons-material/Payments';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import RequestPageIcon from '@mui/icons-material/RequestPage';
import PeopleIcon from '@mui/icons-material/People';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import MenuIcon from '@mui/icons-material/Menu'; 
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import Collapse from '@mui/material/Collapse';
import { logger, UserMessage } from '@/utils/logger'


const navyBlue = '#000080';
const myColor = '#1565c0';
const textColor = '#0d47a1';
const iconColor = '#1e88e5';

const listItemStyle = {
  border: 'none',
  '&::after': {
    display: 'none',
  },
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 128, 0.04)', // Light navy blue on hover
  },
};

const mainMenuItemStyle = {
  // Add the desired styles for the main menu items here
  // For example:
  backgroundColor: 'rgba(0, 0, 128, 0.04)', // Light navy blue background
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 128, 0.08)', // Slightly darker hover color
  },
};

const menuItemStyle = {
  color: navyBlue, // Default text color
  transition: 'all 0.2s ease', // Fast transition for all properties
  '&:hover': {
    backgroundColor: navyBlue,
    color: 'white',
  },
};

export const MainListItems = ({ 
  showInvoiceBuilder, 
  hideInvoiceBuilder, 
  showCreateOptions, 
  showTransactionForm, 
  handleReportClick,
  drawerOpen,
  handleDrawerToggle,
  handleBankingClick,
  handleHRClick,
  handlePayrollClick,
  handleAnalysisClick,
}) => {   
  const [showCreateOptionsMenu, setShowCreateOptionsMenu] = React.useState(false);
  const [showReportsMenu, setShowReportsMenu] = React.useState(false);
  const [createAnchorEl, setCreateAnchorEl] = React.useState(null);
  const [reportsAnchorEl, setReportsAnchorEl] = React.useState(null);
  const [openHR, setOpenHR] = useState(false);
  const [openPayroll, setOpenPayroll] = useState(false);
  const [bankingAnchorEl, setBankingAnchorEl] = React.useState(null);
  const [hrAnchorEl, setHrAnchorEl] = React.useState(null);
  const [payrollAnchorEl, setPayrollAnchorEl] = React.useState(null);

  const handleBankingMenuOpen = (event) => {
    setBankingAnchorEl(event.currentTarget);
  };

  const handleBankingMenuClose = () => {
    setBankingAnchorEl(null);
  };

  const handleHRMenuOpen = (event) => {
    setHrAnchorEl(event.currentTarget);
  };

  const handleHRMenuClose = () => {
    setHrAnchorEl(null);
  };

  const handlePayrollMenuOpen = (event) => {
    setPayrollAnchorEl(event.currentTarget);
  };

  const handlePayrollMenuClose = () => {
    setPayrollAnchorEl(null);
  };


  
  const handleCreateOptionsMenuOpen = (event) => {
    setCreateAnchorEl(event.currentTarget);
    setShowCreateOptionsMenu(true);
  };

  const handleCreateOptionsMenuClose = () => {
    setCreateAnchorEl(null);
    setShowCreateOptionsMenu(false);
  };

  const handleCreateOptionsSelect = (option) => {
    if (option === 'Transaction') {
      showTransactionForm();
    } else {
      showCreateOptions(option);
    }
    handleCreateOptionsMenuClose();
  };

  const handleReportsMenuOpen = (event) => {
    setReportsAnchorEl(event.currentTarget);
    setShowReportsMenu(true);
  };

  const handleReportsMenuClose = () => {
    setReportsAnchorEl(null);
    setShowReportsMenu(false);
  };

  const handleReportSelect = (reportType) => {
    handleReportClick(reportType);
    handleReportsMenuClose();
  };

  return (
    <Box sx={{ 
      overflow: 'auto',
      '& .MuiListItemButton-root': {
        ...listItemStyle,
        paddingLeft: 2, //padding for the main list item
        paddingRight: 2, //padding for the main list item
      },
      '& .MuiListItemButton-root:last-child': {
        marginBottom: 0,
      },
    }}>
      <List disablePadding>
        <ListItemButton onClick={handleDrawerToggle}>
          <ListItemIcon>
            {drawerOpen ? <ChevronLeftIcon style={{ color: iconColor }} /> : <MenuIcon style={{ color: iconColor }} />}
          </ListItemIcon>
          <ListItemText primary={drawerOpen ? "Close Menu" : "Open Menu"} sx={{ color: textColor }} />
        </ListItemButton>
        
        {drawerOpen && (
          <>
            <ListItemButton onClick={handleCreateOptionsMenuOpen}>
              <ListItemIcon>
                <AddCircleOutlineIcon style={{ color: iconColor }} />
              </ListItemIcon>
              <ListItemText primary={<b>Create</b>} sx={{ color: textColor }} />
            </ListItemButton>
            <ListItemButton>
              <ListItemIcon>
                <DashboardCustomizeIcon style={{ color: iconColor }} />
              </ListItemIcon>
              <ListItemText primary="Dashboard" sx={{ color: textColor }} />
            </ListItemButton>
            <ListItemButton>
              <ListItemIcon>
                <PointOfSaleIcon style={{ color: iconColor }} />
              </ListItemIcon>
              <ListItemText primary="Sales" sx={{ color: textColor }} />
            </ListItemButton>
            <ListItemButton>
              <ListItemIcon>
                <PaymentsIcon style={{ color: iconColor }} />
              </ListItemIcon>
              <ListItemText primary="Payments" sx={{ color: textColor }} />
            </ListItemButton>
            <ListItemButton>
              <ListItemIcon>
                <ShoppingCartIcon style={{ color: iconColor }} />
              </ListItemIcon>
              <ListItemText primary="Purchases" sx={{ color: textColor }} />
            </ListItemButton>
            <ListItemButton>
              <ListItemIcon>
                <AccountBalanceIcon style={{ color: iconColor }} />
              </ListItemIcon>
              <ListItemText primary="Accounting" sx={{ color: textColor }} />
            </ListItemButton>
            <ListItemButton onClick={handleBankingMenuOpen}>
              <ListItemIcon>
                <AccountBalanceWalletIcon style={{ color: iconColor }} />
              </ListItemIcon>
              <ListItemText primary="Banking" sx={{ color: textColor }} />
            </ListItemButton>
            <ListItemButton onClick={handleHRMenuOpen}>
          <ListItemIcon>
            <PeopleIcon style={{ color: iconColor }} />
          </ListItemIcon>
          <ListItemText 
            primary="Human Resources" 
            sx={{ 
              color: textColor,
              '& .MuiListItemText-primary': {
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }
            }} 
          />         
            </ListItemButton>
         
            <ListItemButton onClick={handlePayrollMenuOpen}>
          <ListItemIcon>
            <PaymentsIcon style={{ color: iconColor }} />
          </ListItemIcon>
          <ListItemText primary="Payroll" sx={{ color: textColor }} />
        </ListItemButton>
  
            <ListItemButton onClick={handleReportsMenuOpen}>
              <ListItemIcon>
                <AssessmentIcon style={{ color: iconColor }} />
              </ListItemIcon>
              <ListItemText primary="Reports" sx={{ color: textColor }} />
            </ListItemButton>
            <ListItemButton   onClick={() => {
                  console.log('Analysis button clicked');
                  handleAnalysisClick();
                }}  sx={mainMenuItemStyle}>
              <ListItemIcon>
                <AnalyticsIcon style={{ color: iconColor }} />
              </ListItemIcon>
              <ListItemText primary="Analysis" sx={{ color: textColor }} />
            </ListItemButton>
            <ListItemButton>
              <ListItemIcon>
                <ReceiptLongIcon style={{ color: iconColor }} />
              </ListItemIcon>
              <ListItemText primary="Taxes" sx={{ color: textColor }} />
            </ListItemButton>
          </>
        )}
      </List>
      <Menu
        anchorEl={createAnchorEl}
        open={showCreateOptionsMenu}
        onClose={handleCreateOptionsMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        anchorReference="anchorPosition"
        anchorPosition={{ left: 220, top: createAnchorEl ? createAnchorEl.getBoundingClientRect().top : 0}}
      >
        <MenuItem onClick={() => handleCreateOptionsSelect('Transaction')} sx={menuItemStyle}>Transaction</MenuItem>
        <MenuItem onClick={() => handleCreateOptionsSelect('Product')} sx={menuItemStyle}>Product</MenuItem>
        <MenuItem onClick={() => handleCreateOptionsSelect('Service')} sx={menuItemStyle}>Service</MenuItem>
        <MenuItem onClick={() => handleCreateOptionsSelect('Customer')} sx={menuItemStyle}>Customer</MenuItem>
        <MenuItem onClick={() => handleCreateOptionsSelect('Bill')} sx={menuItemStyle}>Bill</MenuItem>
        <MenuItem onClick={() => handleCreateOptionsSelect('Invoice')} sx={menuItemStyle}>Invoice</MenuItem>
        <MenuItem onClick={() => handleCreateOptionsSelect('Vendor')} sx={menuItemStyle}>Vendor</MenuItem>
        <MenuItem onClick={() => handleCreateOptionsSelect('Estimate')} sx={menuItemStyle}>Estimate</MenuItem>
        <MenuItem onClick={() => handleCreateOptionsSelect('Sales Order')} sx={menuItemStyle}>Sales Order</MenuItem>
      </Menu>
      <Menu
        anchorEl={reportsAnchorEl}
        open={showReportsMenu}
        onClose={handleReportsMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        anchorReference="anchorPosition"
        anchorPosition={{ left: 220, top: reportsAnchorEl ? reportsAnchorEl.getBoundingClientRect().top : 0}}
      >
        <MenuItem onClick={() => handleReportSelect('balance_sheet')} sx={menuItemStyle}>Balance Sheet</MenuItem>
        <MenuItem onClick={() => handleReportSelect('cash_flow')} sx={menuItemStyle}>Cash Flow</MenuItem>
        <MenuItem onClick={() => handleReportSelect('income_statement')} sx={menuItemStyle}>Income Statement</MenuItem>
      </Menu>
      <Menu
        anchorEl={bankingAnchorEl}
        open={Boolean(bankingAnchorEl)}
        onClose={handleBankingMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        anchorReference="anchorPosition"
        anchorPosition={{ left: 220, top: bankingAnchorEl ? bankingAnchorEl.getBoundingClientRect().top : 0}}
      >
        <MenuItem onClick={() => handleBankingClick('accounts')} sx={menuItemStyle}>Accounts</MenuItem>
        <MenuItem onClick={() => handleBankingClick('transactions')} sx={menuItemStyle}>Transactions</MenuItem>
      </Menu>

      <Menu
        anchorEl={hrAnchorEl}
        open={Boolean(hrAnchorEl)}
        onClose={handleHRMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        anchorReference="anchorPosition"
        anchorPosition={{ left: 220, top: hrAnchorEl ? hrAnchorEl.getBoundingClientRect().top : 0}}
      >
        <MenuItem onClick={() => handleHRClick('employees')} sx={menuItemStyle}>Employees</MenuItem>
      </Menu>

      <Menu
        anchorEl={payrollAnchorEl}
        open={Boolean(payrollAnchorEl)}
        onClose={handlePayrollMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        anchorReference="anchorPosition"
        anchorPosition={{ left: 220, top: payrollAnchorEl ? payrollAnchorEl.getBoundingClientRect().top : 0}}
      >
        <MenuItem onClick={() => handlePayrollClick('run')} sx={menuItemStyle}>Run Payroll</MenuItem>
        <MenuItem onClick={() => handlePayrollClick('timesheets')} sx={menuItemStyle}>Timesheets</MenuItem>
        <MenuItem onClick={() => handlePayrollClick('transactions')} sx={menuItemStyle}>Payroll Transactions</MenuItem>
        <MenuItem onClick={() => handlePayrollClick('taxes')} sx={menuItemStyle}>Taxes</MenuItem>
        <MenuItem onClick={() => handlePayrollClick('taxForms')} sx={menuItemStyle}>Tax Forms</MenuItem>
      </Menu>
    </Box>
  );
};