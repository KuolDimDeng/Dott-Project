import React, { useState, useRef, useEffect } from 'react';
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Box,
  Paper,
  Button,
  Popover,
  Typography,
  useTheme,
} from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import PaymentsIcon from '@mui/icons-material/Payments';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import ContactsIcon from '@mui/icons-material/Contacts';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Image from 'next/image';

const MENU_WIDTH = 258; // Increased to match the drawer width (260px, leaving 2px for borders)

const MainListItems = ({
  handleMainDashboardClick,
  handleHomeClick,
  handleSalesClick,
  handlePaymentsClick,
  handlePurchasesClick,
  handleAccountingClick,
  handleBankingClick,
  handlePayrollClick,
  handleInventoryClick,
  handleReportClick,
  handleAnalysisClick,
  handleTaxesClick,
  handleCRMClick,
  handleTransportClick,
  handleHRClick,
  handleShowCreateOptions,
  borderRightColor = '#0a3977',
  borderRightWidth = '2px',
}) => {
  const [openMenu, setOpenMenu] = useState('');
  const [createAnchorEl, setCreateAnchorEl] = useState(null);
  const [buttonWidth, setButtonWidth] = useState(0);
  const paperRef = useRef(null);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [hoveredCreateOption, setHoveredCreateOption] = useState(null);

  // Custom colors for menu items
  const mainColorDark = '#041e42';    // Dark navy blue  
  const navyBlue = '#0a3977';         // Navy blue color for text
  const hoverBgColor = '#f0f3f9';     // Very light gray with slight blue tint for hover effect

  useEffect(() => {
    if (paperRef.current) {
      const paperWidth = paperRef.current.offsetWidth;
      setButtonWidth(paperWidth - 40); // 16px for left and right margin
    }
  }, []);

  const handleMenuToggle = (menuName) => {
    setOpenMenu((prevOpenMenu) => (prevOpenMenu === menuName ? '' : menuName));
    
    // Add a setTimeout to allow the DOM to update before scrolling
    setTimeout(() => {
      // Find the clicked menu item
      const menuItem = document.querySelector(`[data-menu-label="${menuName}"]`);
      if (menuItem) {
        // Scroll the menu item into view to ensure submenu is visible
        menuItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  const handleCreateClick = (event) => {
    setCreateAnchorEl(event.currentTarget);
  };

  const handleCreateClose = () => {
    setCreateAnchorEl(null);
  };

  const handleMouseEnter = (menuName) => {
    setHoveredItem(menuName);
  };

  const handleMouseLeave = () => {
    setHoveredItem(null);
  };
  const createOpen = Boolean(createAnchorEl);
  const theme = useTheme();

  const menuItems = [
    {
      icon: <DashboardCustomizeIcon />,
      label: 'Dashboard',
      onClick: handleMainDashboardClick,
    },
    {
      icon: <PointOfSaleIcon />,
      label: 'Sales',
      subItems: [
        { label: 'Dashboard', onClick: handleSalesClick, value: 'dashboard' },
        { label: 'Products', onClick: handleSalesClick, value: 'products' },
        { label: 'Services', onClick: handleSalesClick, value: 'services' },
        { label: 'Estimates', onClick: handleSalesClick, value: 'estimates' },
        { label: 'Orders', onClick: handleSalesClick, value: 'orders' },
        { label: 'Invoices', onClick: handleSalesClick, value: 'invoices' },
        { label: 'Reports', onClick: handleSalesClick, value: 'reports' },
      ],
    },
    {
      icon: <ContactsIcon />,
      label: 'CRM',
      subItems: [
        { label: 'Dashboard', onClick: handleCRMClick, value: 'dashboard' },
        { label: 'Contacts', onClick: handleCRMClick, value: 'contacts' },
        { label: 'Leads', onClick: handleCRMClick, value: 'leads' },
        { label: 'Opportunities', onClick: handleCRMClick, value: 'opportunities' },
        { label: 'Deals', onClick: handleCRMClick, value: 'deals' },
        { label: 'Activities', onClick: handleCRMClick, value: 'activities' },
        { label: 'Campaigns', onClick: handleCRMClick, value: 'campaigns' },
        { label: 'Reports', onClick: handleCRMClick, value: 'reports' },
      ],
    },
    {
      icon: <Inventory2OutlinedIcon />,
      label: 'Inventory',
      subItems: [
        { label: 'Dashboard', onClick: handleInventoryClick, value: 'inventorydashboard' },
        { label: 'Products', onClick: handleInventoryClick, value: 'items' },
        { label: 'Stock Adjustments', onClick: handleInventoryClick, value: 'stock-adjustments' },
        { label: 'Locations', onClick: handleInventoryClick, value: 'locations' },
        { label: 'Suppliers', onClick: handleInventoryClick, value: 'suppliers' },
        { label: 'Transactions', onClick: handleInventoryClick, value: 'transactions' },
        { label: 'Reports', onClick: handleInventoryClick, value: 'reports' },
      ],
    },
    {
      icon: <LocalShippingIcon />,
      label: 'Transport',
      subItems: [
        { label: 'Dashboard', onClick: handleTransportClick, value: 'dashboard' },
        { label: 'Loads/Jobs', onClick: handleTransportClick, value: 'loads' },
        { label: 'Vehicle', onClick: handleTransportClick, value: 'equipment' },
        { label: 'Routes', onClick: handleTransportClick, value: 'routes' },
        { label: 'Expenses', onClick: handleTransportClick, value: 'expenses' },
        { label: 'Maintenance', onClick: handleTransportClick, value: 'maintenance' },
        { label: 'Compliance', onClick: handleTransportClick, value: 'compliance' },
        { label: 'Reports', onClick: handleTransportClick, value: 'reports' },
      ],
    },
    {
      icon: <PaymentsIcon />,
      label: 'Payments',
      subItems: [
        { label: 'Dashboard', onClick: handlePaymentsClick, value: 'dashboard' },
        { label: 'Receive Payments', onClick: handlePaymentsClick, value: 'receive-payments' },
        { label: 'Make Payments', onClick: handlePaymentsClick, value: 'make-payments' },
        { label: 'Payment Methods', onClick: handlePaymentsClick, value: 'payment-methods' },
        { label: 'Recurring Payments', onClick: handlePaymentsClick, value: 'recurring-payments' },
        { label: 'Refunds', onClick: handlePaymentsClick, value: 'refunds' },
        { label: 'Payment Reconciliation', onClick: handlePaymentsClick, value: 'reconciliation' },
        { label: 'Payment Gateways', onClick: handlePaymentsClick, value: 'payment-gateways' },
        { label: 'Payment Plans', onClick: handlePaymentsClick, value: 'payment-plans' },
        { label: 'Reports', onClick: handlePaymentsClick, value: 'reports' },
      ],
    },
    // Add other menu items (Purchases, Accounting, Banking, Payroll, Inventory, Reports, Analytics, Taxes) similarly
    {
      icon: <ShoppingCartIcon />,
      label: 'Purchases',
      subItems: [
        { label: 'Dashboard', onClick: handlePurchasesClick, value: 'dashboard' },
        { label: 'Vendors', onClick: handlePurchasesClick, value: 'vendors' },
        { label: 'Purchase Orders', onClick: handlePurchasesClick, value: 'purchase-orders' },
        { label: 'Bills', onClick: handlePurchasesClick, value: 'bills' },
        { label: 'Expenses', onClick: handlePurchasesClick, value: 'expenses' },
        { label: 'Purchase Returns', onClick: handlePurchasesClick, value: 'purchase-returns' },
        { label: 'Procurement', onClick: handlePurchasesClick, value: 'procurement' },
        { label: 'Reports', onClick: handlePurchasesClick, value: 'reports' },
      ],
    },
    {
      icon: <AccountBalanceIcon />,
      label: 'Accounting',
      subItems: [
        { label: 'Dashboard', onClick: handleAccountingClick, value: 'dashboard' },
        { label: 'Chart of Accounts', onClick: handleAccountingClick, value: 'chart-of-accounts' },
        { label: 'Journal Entries', onClick: handleAccountingClick, value: 'journal-entries' },
        { label: 'General Ledger', onClick: handleAccountingClick, value: 'general-ledger' },
        { label: 'Reconciliation', onClick: handleAccountingClick, value: 'reconciliation' },
        {
          label: 'Financial Statements',
          onClick: handleAccountingClick,
          value: 'financial-statements',
        },
        { label: 'Fixed Assets', onClick: handleAccountingClick, value: 'fixed-assets' },
        { label: 'Reports', onClick: handleAccountingClick, value: 'reports' },
      ],
    },
    {
      icon: <AccountBalanceWalletIcon />,
      label: 'Banking',
      subItems: [
        { label: 'Dashboard', onClick: handleBankingClick, value: 'dashboard' },
        { label: 'Connect to Bank', onClick: handleBankingClick, value: 'connect' },
        { label: 'Bank Transactions', onClick: handleBankingClick, value: 'transactions' },
        { label: 'Bank Reconciliation', onClick: handleBankingClick, value: 'reconciliation' },
        { label: 'Reports', onClick: handleBankingClick, value: 'bank-reports' },
      ],
    },
    {
      icon: <PeopleOutlineIcon />,
      label: 'HR',
      subItems: [
        { label: 'Dashboard', onClick: handleHRClick, value: 'dashboard' },
        { label: 'Employees', onClick: handleHRClick, value: 'employees' },
        { label: 'Timesheets', onClick: handleHRClick, value: 'timesheets' },
        { label: 'Taxes', onClick: handleHRClick, value: 'taxes' },
        { label: 'Benefits', onClick: handleHRClick, value: 'benefits' },
        { label: 'Reports', onClick: handleHRClick, value: 'reports' },
      ],
    },
    {
      icon: <PaymentsIcon />,
      label: 'Payroll',
      subItems: [
        { label: 'Dashboard', onClick: handlePayrollClick, value: 'dashboard' },
        { label: 'Run Payroll', onClick: handlePayrollClick, value: 'run' },
        { label: 'Payroll Transactions', onClick: handlePayrollClick, value: 'transactions' },
        { label: 'Reports', onClick: handlePayrollClick, value: 'reports' },
      ],
    },

    {
      icon: <ReceiptLongIcon />,
      label: 'Taxes',
      subItems: [
        { label: 'Dashboard', onClick: handleTaxesClick, value: 'dashboard' },
        { label: 'Sales Tax', onClick: handleTaxesClick, value: 'sales-tax' },
        { label: 'Income Tax', onClick: handleTaxesClick, value: 'income-tax' },
        { label: 'Payroll Tax', onClick: handleTaxesClick, value: 'payroll-tax' },
        { label: 'Tax Payments', onClick: handleTaxesClick, value: 'tax-payments' },
        { label: 'Tax Forms', onClick: handleTaxesClick, value: 'tax-forms' },
        { label: 'Reports', onClick: handleTaxesClick, value: 'reports' },
      ],
    },

    {
      icon: <AssessmentIcon />,
      label: 'Reports',
      subItems: [
        { label: 'Profit & Loss Statement', onClick: handleReportClick, value: 'income_statement' },
        { label: 'Balance Sheet', onClick: handleReportClick, value: 'balance_sheet' },
        { label: 'Cash Flow', onClick: handleReportClick, value: 'cash_flow' },
        { label: 'Sales Tax ', onClick: handleReportClick, value: 'sales_tax_report' },
        { label: 'Payroll Wage Tax', onClick: handleReportClick, value: 'payroll_wage_tax_report' },
        { label: 'Income by Customer', onClick: handleReportClick, value: 'income_by_customer' },
        { label: 'Aged Receivables', onClick: handleReportClick, value: 'aged_receivables' },
        { label: 'Purchases by Vendor', onClick: handleReportClick, value: 'purchases_by_vendor' },
        { label: 'Aged Payables', onClick: handleReportClick, value: 'aged_payables' },
        { label: 'Account Balances', onClick: handleReportClick, value: 'account_balances' },
        { label: 'Trial Balances', onClick: handleReportClick, value: 'trial_balance' },
        { label: 'General Ledger', onClick: handleReportClick, value: 'general_ledger' },
      ],
    },

 
    {
      icon: <AnalyticsIcon />,
      label: 'Analytics',
      subItems: [
        { label: 'Dashboard', onClick: handleAnalysisClick, value: 'kpi-data' },
        { label: 'A.I Query', onClick: handleAnalysisClick, value: 'ai-query' },
      ],
    },
  ];

  const createOptions = [
    { 
      label: 'Transaction', 
      onClick: () => {
        // Use Next.js router or link to navigate
        window.location.href = '/dashboard/transactions/new';
      }, 
      value: 'Transaction' 
    },
    { 
      label: 'Product', 
      onClick: () => {
        window.location.href = '/dashboard/products/new';
      }, 
      value: 'Product' 
    },
    { 
      label: 'Service', 
      onClick: () => {
        window.location.href = '/dashboard/services/new';
      }, 
      value: 'Service' 
    },
    { 
      label: 'Invoice', 
      onClick: () => {
        window.location.href = '/dashboard/invoices/new';
      }, 
      value: 'Invoice' 
    },
    { 
      label: 'Bill', 
      onClick: () => {
        window.location.href = '/dashboard/bills/new';
      }, 
      value: 'Bill' 
    },
    { 
      label: 'Estimate', 
      onClick: () => {
        window.location.href = '/dashboard/estimates/new';
      }, 
      value: 'Estimate' 
    },
    { 
      label: 'Customer', 
      onClick: () => {
        window.location.href = '/dashboard/customers/new';
      }, 
      value: 'Customer' 
    },
    { 
      label: 'Vendor', 
      onClick: () => {
        window.location.href = '/dashboard/vendors/new';
      }, 
      value: 'Vendor' 
    },
  ];

  const menuTheme = createTheme({
    palette: {
      menu: {
        text: '#0a3977', // Navy blue text 
        textHover: '#041e42', // Dark navy blue for hover
        icon: '#1a5bc0', // Standard blue for icons
        iconHover: '#0a3977', // Navy blue for icon hover
        background: '#ffffff', // White background
        backgroundHover: '#f0f3f9', // Very light gray with slight blue tint
      },
    },
  });

  const scrollThumbColor = '#0a3977';
  const scrollTrackColor = '#f0f3f9'; // Slightly lighter than the thumb

  const renderSubMenu = (items, parentMenu) => (
    <Collapse in={openMenu === parentMenu} timeout="auto" unmountOnExit>
      <List component="div" disablePadding>
        {items.map((item, index) => (
          <ListItemButton
            key={index}
            sx={{
              pl: 4,
              '&:hover': {
                backgroundColor: hoverBgColor,
              },
              backgroundColor: hoveredItem === `${parentMenu}-${item.value}` ? hoverBgColor : 'inherit',
            }}
            onClick={() => item.onClick && item.onClick(item.value)}
            onMouseEnter={() => handleMouseEnter(`${parentMenu}-${item.value}`)}
            onMouseLeave={handleMouseLeave}
          >
            <ListItemText 
              primary={item.label} 
              primaryTypographyProps={{ 
                sx: { 
                  color: navyBlue, 
                  fontSize: '0.85rem' 
                } 
              }} 
            />
          </ListItemButton>
        ))}
      </List>
    </Collapse>
  );

  const CreateNewButton = () => {
    const isCreateOpen = Boolean(createAnchorEl);

    return (
      <ListItemButton
        onClick={handleCreateClick}
        sx={{
          justifyContent: 'flex-start',
          pl: 2.5, // Reduced left padding
          py: 0.5, // Reduced top/bottom padding
          mb: 1.5, // Reduced bottom margin
          mx: 0.5, // Reduced side margins
          textTransform: 'none',
          border: '2px solid', // Reduced from 2px to 1px
          borderColor: isCreateOpen ? navyBlue : navyBlue,
          borderRadius: '50px', // Reduced from 50px to 25px for smaller rounded corners
          maxWidth: '150px', // Widened to fit the new drawer width
          width: `${buttonWidth}px`,
          color: navyBlue,
          backgroundColor: '#ffffff', // White background
          fontSize: '18px',
          fontWeight: isCreateOpen ? 'bold' : 'normal',
          transition: 'all 0.3s ease',
          '&:hover, &.Mui-focusVisible': {
            backgroundColor: hoverBgColor,
            borderColor: navyBlue,
            color: navyBlue,
            fontWeight: 'bold',
            '& .MuiSvgIcon-root': {
              color: navyBlue,
            },
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: 25, // Reduced from 25px
            mr: 0.5, // Reduced from 1
            '& .MuiSvgIcon-root': {
              fontSize: '18px', // Smaller icon
              color: navyBlue,
              transition: 'color 0.3s ease',
            },
            '$:hover &, .Mui-focusVisible &': {
              '& .MuiSvgIcon-root': {
                color: navyBlue,
              },
            },
          }}
        >
          <AddCircleOutlineIcon />
        </ListItemIcon>
        <ListItemText
          primary="New"
          primaryTypographyProps={{
            sx: {
              color: navyBlue,
              fontWeight: 'inherit',
              fontSize: '0.9rem', // Smaller font size
            },
          }}
        />
      </ListItemButton>
    );
  };

  return (
    <ThemeProvider theme={menuTheme}>
      <Box
        sx={{
          width: '100%',
          height: '100%',
          overflowX: 'hidden',
          overflowY: 'auto',
          borderRight: `${borderRightWidth} solid ${borderRightColor}`,
          '.MuiListItemIcon-root': {
            minWidth: '36px',
            color: navyBlue, // Set icons to navy blue
          },
        }}
      >
        <Paper
          ref={paperRef}
          elevation={0}
          sx={{
            width: MENU_WIDTH,
            background: 'transparent',
          }}
        >
          <Box sx={{ pt: 2, pb: 1 }}>
            <CreateNewButton />
          </Box>
          
          <List
            component="nav"
            aria-labelledby="navigation-subheader"
            sx={{
              width: '100%',
            }}
          >
            {menuItems.map((item, index) => (
              <React.Fragment key={index}>
                <ListItemButton
                  onClick={
                    item.subItems
                      ? () => handleMenuToggle(item.label)
                      : () => item.onClick && item.onClick()
                  }
                  onMouseEnter={() => handleMouseEnter(item.label)}
                  onMouseLeave={handleMouseLeave}
                  data-menu-label={item.label}
                  sx={{
                    '&:hover': {
                      backgroundColor: hoverBgColor,
                    },
                    backgroundColor: hoveredItem === item.label ? hoverBgColor : 'inherit',
                  }}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText 
                    primary={item.label} 
                    primaryTypographyProps={{ 
                      sx: { 
                        color: navyBlue, 
                        fontWeight: openMenu === item.label ? 600 : 400 
                      } 
                    }} 
                  />
                  {item.subItems && (
                    openMenu === item.label ? 
                    <ExpandLess sx={{ color: navyBlue }} /> : 
                    <ExpandMore sx={{ color: navyBlue }} />
                  )}
                </ListItemButton>
                {item.subItems && renderSubMenu(item.subItems, item.label)}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      </Box>
      <Popover
        open={createOpen}
        anchorEl={createAnchorEl}
        onClose={handleCreateClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        slotProps={{
          paper: {
            sx: {
              marginTop: '70px',
              marginLeft: '260px', // Updated to match the new drawer width
              backgroundColor: '#ffffff', // Set the background to a solid color (white in this case)
              boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)', // Optional: Add a shadow for better visibility
              borderRadius: '8px', // Optional: Add rounded corners
            },
          },
        }}
      >
        <Box>
          <List>
            {createOptions.map((option, index) => (
              <ListItemButton
                key={index}
                onClick={() => {
                  if (typeof option.onClick === 'function') {
                    option.onClick(option.value);
                  } else {
                    console.warn(`onClick handler for option "${option.label}" is not a function`);
                  }
                  handleCreateClose();
                }}
                onMouseEnter={() => setHoveredCreateOption(option.value)}
                onMouseLeave={() => setHoveredCreateOption(null)}
                sx={{
                  py: 0.2,
                  color: navyBlue,
                  '&:hover': {
                    backgroundColor: hoverBgColor,
                    color: navyBlue,
                  },
                }}
              >
                <ListItemText
                  primary={option.label}
                  primaryTypographyProps={{
                    fontSize: '0.9rem',
                    fontWeight: hoveredCreateOption === option.value ? 'bold' : 'normal',
                    color: navyBlue,
                  }}
                />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Popover>
    </ThemeProvider>
  );
};

export default MainListItems;
