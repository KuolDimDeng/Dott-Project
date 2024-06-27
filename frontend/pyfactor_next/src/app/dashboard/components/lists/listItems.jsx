import * as React from 'react';
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
import AssessmentIcon from '@mui/icons-material/Assessment';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { logger, UserMessage } from '@/utils/logger';

const drawerWidth = 240;
const navyBlue = '#000080';
const textColor = navyBlue;
const iconColor = '#000080';

const listItemStyle = {
  border: 'none',
  '&::after': {
    display: 'none',
  },
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 128, 0.04)', // Light navy blue on hover
  },
};

export const MainListItems = ({ 
  showInvoiceBuilder, 
  hideInvoiceBuilder, 
  showCreateOptions, 
  showTransactionForm, 
  handleReportClick,
  drawerOpen,
  handleDrawerToggle
}) => {   
  const [showCreateOptionsMenu, setShowCreateOptionsMenu] = React.useState(false);
  const [showReportsMenu, setShowReportsMenu] = React.useState(false);
  const [createAnchorEl, setCreateAnchorEl] = React.useState(null);
  const [reportsAnchorEl, setReportsAnchorEl] = React.useState(null);

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
            <ListItemButton>
              <ListItemIcon>
                <AccountBalanceWalletIcon style={{ color: iconColor }} />
              </ListItemIcon>
              <ListItemText primary="Banking" sx={{ color: textColor }} />
            </ListItemButton>
            <ListItemButton>
              <ListItemIcon>
                <RequestPageIcon style={{ color: iconColor }} />
              </ListItemIcon>
              <ListItemText primary="Payroll" sx={{ color: textColor }} />
            </ListItemButton>
            <ListItemButton onClick={handleReportsMenuOpen}>
              <ListItemIcon>
                <AssessmentIcon style={{ color: iconColor }} />
              </ListItemIcon>
              <ListItemText primary="Reports" sx={{ color: textColor }} />
            </ListItemButton>
            <ListItemButton>
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
        anchorPosition={{ left: 160, top: createAnchorEl ? createAnchorEl.getBoundingClientRect().top : 0}}
      >
        <MenuItem onClick={() => handleCreateOptionsSelect('Transaction')}>Transaction</MenuItem>
        <MenuItem onClick={() => handleCreateOptionsSelect('Product')}>Product</MenuItem>
        <MenuItem onClick={() => handleCreateOptionsSelect('Service')}>Service</MenuItem>
        <MenuItem onClick={() => handleCreateOptionsSelect('Customer')}>Customer</MenuItem>
        <MenuItem onClick={() => handleCreateOptionsSelect('Bill')}>Bill</MenuItem>
        <MenuItem onClick={() => handleCreateOptionsSelect('Invoice')}>Invoice</MenuItem>
        <MenuItem onClick={() => handleCreateOptionsSelect('Vendor')}>Vendor</MenuItem>
        <MenuItem onClick={() => handleCreateOptionsSelect('Estimate')}>Estimate</MenuItem>
        <MenuItem onClick={() => handleCreateOptionsSelect('Sales Order')}>Sales Order</MenuItem>
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
        anchorPosition={{ left: 160, top: reportsAnchorEl ? reportsAnchorEl.getBoundingClientRect().top : 0}}
      >
        <MenuItem onClick={() => handleReportSelect('balance_sheet')}>Balance Sheet</MenuItem>
        <MenuItem onClick={() => handleReportSelect('cash_flow')}>Cash Flow</MenuItem>
        <MenuItem onClick={() => handleReportSelect('income_statement')}>Income Statement</MenuItem>
      </Menu>
    </Box>
  );
};