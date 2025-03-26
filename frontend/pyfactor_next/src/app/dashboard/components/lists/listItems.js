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
import DescriptionIcon from '@mui/icons-material/Description';

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
    // Handle case where event is undefined (when called directly from menu item)
    if (!event || typeof event !== 'object') {
      // If no event provided, use a dummy reference element instead
      const dummyElement = document.getElementById('main-menu-container') || document.body;
      setCreateAnchorEl(dummyElement);
      return;
    }
    
    // Normal case with event
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
      icon: <AddCircleOutlineIcon />,
      label: 'Create New',
      onClick: (e) => handleCreateClick(e),
      customStyle: {
        pl: 2,
        py: 0.5,
        mb: 0.5,
        mt: 0.5,
        textTransform: 'none',
        border: 'none',
        borderRadius: 0,
        maxWidth: '100%',
        width: '100%',
        color: navyBlue,
        backgroundColor: '#e6ebf5',
        fontSize: '16px',
        fontWeight: 'bold',
        position: 'relative',
        zIndex: 10,
        boxShadow: 'none !important',
        overflow: 'visible',
        '&:hover': {
          backgroundColor: '#d8e1f3',
        },
      },
      isSpecial: true,
    },
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
      icon: <PaymentsIcon fontSize="small" />,
      onClick: () => {
        // Update state instead of navigating to a new URL
        handleShowCreateOptions('Transaction');
      }, 
      value: 'Transaction' 
    },
    { 
      label: 'Product', 
      icon: <Inventory2OutlinedIcon fontSize="small" />,
      onClick: () => {
        // Update state instead of navigating to a new URL
        handleShowCreateOptions('Product');
      }, 
      value: 'Product' 
    },
    { 
      label: 'Service', 
      icon: <ReceiptLongIcon fontSize="small" />,
      onClick: () => {
        // Update state instead of navigating to a new URL
        handleShowCreateOptions('Service');
      }, 
      value: 'Service' 
    },
    { 
      label: 'Invoice', 
      icon: <DescriptionIcon fontSize="small" />,
      onClick: () => {
        // Update state instead of navigating to a new URL
        handleShowCreateOptions('Invoice');
      }, 
      value: 'Invoice' 
    },
    { 
      label: 'Bill', 
      icon: <ShoppingCartIcon fontSize="small" />,
      onClick: () => {
        // Update state instead of navigating to a new URL
        handleShowCreateOptions('Bill');
      }, 
      value: 'Bill' 
    },
    { 
      label: 'Estimate', 
      icon: <AssessmentIcon fontSize="small" />,
      onClick: () => {
        // Update state instead of navigating to a new URL
        handleShowCreateOptions('Estimate');
      }, 
      value: 'Estimate' 
    },
    { 
      label: 'Customer', 
      icon: <PeopleOutlineIcon fontSize="small" />,
      onClick: () => {
        // Update state instead of navigating to a new URL
        handleShowCreateOptions('Customer');
      }, 
      value: 'Customer' 
    },
    { 
      label: 'Vendor', 
      icon: <ContactsIcon fontSize="small" />,
      onClick: () => {
        // Update state instead of navigating to a new URL
        handleShowCreateOptions('Vendor');
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
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            boxShadow: 'none', // Remove shadow from all Paper components
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            boxShadow: 'none', // Remove shadow from all ListItemButton components
          },
        },
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
            onClick={(event) => {
              if (item.subItems) {
                handleMenuToggle(item.label);
              } else if (item.onClick) {
                item.onClick(event);
              }
            }}
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

  return (
    <ThemeProvider theme={menuTheme}>
      <Box
        id="main-menu-container"
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
          // Remove shadows from all elements
          '& .MuiPaper-root, & .MuiList-root, & .MuiListItem-root, & .MuiListItemButton-root, & .MuiCollapse-root': {
            boxShadow: 'none !important',
          },
          position: 'relative',
          zIndex: 0,
        }}
      >
        {/* Single container for all menu items */}
        <Paper
          ref={paperRef}
          elevation={0}
          sx={{
            width: MENU_WIDTH,
            background: 'transparent',
            boxShadow: 'none',
            '&.MuiPaper-root': {
              boxShadow: 'none',
              backgroundImage: 'none',
            },
            '& > *': {
              boxShadow: 'none',
            },
            position: 'relative',
            zIndex: 1,
            pt: 2, // Add padding top to give space at the top
          }}
        >
          <List
            component="nav"
            aria-labelledby="navigation-subheader"
            sx={{
              width: '100%',
              pt: 0,
              mt: 0,
              position: 'relative',
              zIndex: 1,
              boxShadow: 'none',
              '& .MuiListItem-root, & .MuiListItemButton-root, & .MuiCollapse-root': {
                boxShadow: 'none !important'
              },
              '& .MuiListItemButton-root:last-of-type, & .MuiListItemButton-root:first-of-type': {
                boxShadow: 'none !important',
                '&::after, &::before': {
                  display: 'none',
                },
              },
            }}
          >
            {/* Regular menu items, including the New button as first item */}
            {menuItems.map((item, index) => (
              <React.Fragment key={index}>
                <ListItemButton
                  onClick={(event) => {
                    if (item.subItems) {
                      handleMenuToggle(item.label);
                    } else if (item.onClick) {
                      item.onClick(event);
                    }
                  }}
                  onMouseEnter={() => handleMouseEnter(item.label)}
                  onMouseLeave={handleMouseLeave}
                  data-menu-label={item.label}
                  sx={{
                    ...(item.isSpecial ? item.customStyle : {
                      '&:hover': {
                        backgroundColor: hoverBgColor,
                      },
                      backgroundColor: hoveredItem === item.label ? hoverBgColor : 'inherit',
                    }),
                  }}
                >
                  <ListItemIcon sx={item.isSpecial ? {
                    minWidth: '25px',
                    color: navyBlue,
                    '& .MuiSvgIcon-root': {
                      fontSize: '18px',
                    }
                  } : {}}>{item.icon}</ListItemIcon>
                  <ListItemText 
                    primary={item.label} 
                    primaryTypographyProps={{ 
                      sx: { 
                        color: navyBlue, 
                        fontWeight: item.isSpecial ? 600 : (openMenu === item.label ? 600 : 400),
                        fontSize: item.isSpecial ? '0.9rem' : 'inherit'
                      } 
                    }} 
                  />
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
        disablePortal={false}
        disableRestoreFocus
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: {
            position: 'fixed',
            left: `calc(${MENU_WIDTH}px + 40px)`, // Position it further into content area
            top: '120px', // Fixed positioning from top
            width: '280px',
            backgroundColor: '#ffffff',
            boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
            borderRadius: '12px',
            p: 1.5,
            border: '1px solid #e0e0e0',
            zIndex: 1300, // Ensure it appears above other elements
            '@media (max-width: 600px)': {
              left: '10px', // On mobile, position it differently
              width: 'calc(100% - 20px)',
            },
          },
        }}
      >
        <Box>
          <List dense>
            {createOptions.map((option, index) => (
              <ListItemButton
                key={index}
                onClick={() => {
                  if (typeof option.onClick === 'function') {
                    // Call the onClick function with the option value
                    // Don't directly pass the event since it doesn't need it
                    option.onClick();
                  } else {
                    console.warn(`onClick handler for option "${option.label}" is not a function`);
                  }
                  handleCreateClose();
                }}
                onMouseEnter={() => setHoveredCreateOption(option.value)}
                onMouseLeave={() => setHoveredCreateOption(null)}
                sx={{
                  py: 1,
                  color: navyBlue,
                  borderRadius: '8px',
                  mb: 0.5,
                  '&:hover': {
                    backgroundColor: hoverBgColor,
                    color: navyBlue,
                  },
                }}
              >
                <ListItemIcon 
                  sx={{ 
                    minWidth: '30px',
                    color: navyBlue,
                    '& .MuiSvgIcon-root': {
                      fontSize: '1.2rem',
                    }
                  }}
                >
                  {option.icon}
                </ListItemIcon>
                <ListItemText
                  primary={option.label}
                  primaryTypographyProps={{
                    fontSize: '0.95rem',
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
