import * as React from 'react';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import Collapse from '@mui/material/Collapse';
import List from '@mui/material/List';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PaymentIcon from '@mui/icons-material/Payment';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import WorkIcon from '@mui/icons-material/Work';
import InsertChartIcon from '@mui/icons-material/InsertChart';
import TaxiAlertIcon from '@mui/icons-material/TaxiAlert';
import AddIcon from '@mui/icons-material/Add';
import { Menu, MenuItem } from '@mui/material';
import { logger, UserMessage } from '@/utils/logger';


const navyBlue = '#000080';
const textColor = navyBlue;
const iconColor = '#89CFF0'; // Light blue or baby blue color

export const MainListItems = ({ showInvoiceBuilder, hideInvoiceBuilder, showCreateOptions, showTransactionForm }) => {  
  const [showSalesSubmenu, setShowSalesSubmenu] = React.useState(true);
  const [showCreateOptionsMenu, setShowCreateOptionsMenu] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleSalesSubmenuToggle = () => {
    setShowSalesSubmenu(!showSalesSubmenu);
  };

  const handleInvoicesClick = () => {
    showInvoiceBuilder();
  };

  const handleCloseInvoiceBuilder = () => {
    hideInvoiceBuilder();
  };

  const handleCreateOptionsMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
    setShowCreateOptionsMenu(true);
  };

  const handleCreateOptionsMenuClose = () => {
    setAnchorEl(null);
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
  return (
    <React.Fragment>
      <ListItemButton onClick={handleCreateOptionsMenuOpen}>
        <AddIcon style={{ color: iconColor }} />
        <ListItemText primary={<b>Create</b>} sx={{ color: textColor }} />      </ListItemButton>
      <Menu
        anchorEl={anchorEl}
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
      <ListItemButton>
        <DashboardIcon style={{ color: iconColor }} />
        <ListItemText primary="Dashboard" sx={{ color: textColor }} />
      </ListItemButton>
      <ListItemButton onClick={handleSalesSubmenuToggle}>
        <PaymentIcon style={{ color: iconColor }} />
        <ListItemText primary="Sales & Payments" sx={{ color: textColor }} />
        {showSalesSubmenu ? <ExpandLessIcon style={{ color: iconColor }} /> : <ExpandMoreIcon style={{ color: iconColor }} />}
      </ListItemButton>
      <Collapse in={showSalesSubmenu} timeout="auto" unmountOnExit>
        <List component="div" disablePadding>
          <ListItemButton sx={{ pl: 4 }} onClick={handleInvoicesClick}>
            <ReceiptIcon style={{ color: iconColor }} />
            <ListItemText primary="Invoices" sx={{ color: textColor }} />
          </ListItemButton>
          <ListItemButton sx={{ pl: 4 }}>
            <ReceiptIcon style={{ color: iconColor }} />
            <ListItemText primary="Sales Orders" sx={{ color: textColor }} />
          </ListItemButton>
          <ListItemButton sx={{ pl: 4 }}>
            <ReceiptIcon style={{ color: iconColor }} />
            <ListItemText primary="Estimates" sx={{ color: textColor }} />
          </ListItemButton>
          <ListItemButton sx={{ pl: 4 }}>
            <ReceiptIcon style={{ color: iconColor }} />
            <ListItemText primary="Products & Services" sx={{ color: textColor }} />
          </ListItemButton>
        </List>
      </Collapse>
      <ListItemButton>
        <AttachMoneyIcon style={{ color: iconColor }} />
        <ListItemText primary="Purchases" sx={{ color: textColor }} />
      </ListItemButton>
      <Collapse in={showSalesSubmenu} timeout="auto" unmountOnExit>
        <List component="div" disablePadding>
          <ListItemButton sx={{ pl: 4 }}>
            <ReceiptIcon style={{ color: iconColor }} />
            <ListItemText primary="Bills" sx={{ color: textColor }} />
          </ListItemButton>
        </List>
      </Collapse>
      <ListItemButton>
        <AccountBalanceIcon style={{ color: iconColor }} />
        <ListItemText primary="Accounting" sx={{ color: textColor }} />
      </ListItemButton>
      <ListItemButton>
        <AccountBalanceIcon style={{ color: iconColor }} />
        <ListItemText primary="Banking" sx={{ color: textColor }} />
      </ListItemButton>
      <ListItemButton>
        <WorkIcon style={{ color: iconColor }} />
        <ListItemText primary="Payroll" sx={{ color: textColor }} />
      </ListItemButton>
      <ListItemButton onClick={() => handleReportClick('reports')}>
        <InsertChartIcon style={{ color: iconColor }} />
        <ListItemText primary="Reports" sx={{ color: textColor }} />
      </ListItemButton>
      <ListItemButton>
        <InsertChartIcon style={{ color: iconColor }} />
        <ListItemText primary="Analysis" sx={{ color: textColor }} />
      </ListItemButton>
      <ListItemButton>
        <TaxiAlertIcon style={{ color: iconColor }} />
        <ListItemText primary="Taxes" sx={{ color: textColor }} />
      </ListItemButton>
    </React.Fragment>
  );
};
