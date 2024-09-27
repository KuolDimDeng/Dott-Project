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
} from '@mui/material';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
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
import { createTheme, ThemeProvider } from '@mui/material/styles';




const MENU_WIDTH = 228;

const MainListItems = ({
  handleMainDashboardClick,

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
  handleShowCreateOptions,
  borderRightColor = '#bbdefb',
  borderRightWidth = '2px',
}) => {
  const [openMenu, setOpenMenu] = useState('');
  const [createAnchorEl, setCreateAnchorEl] = useState(null);
  const [buttonWidth, setButtonWidth] = useState(0);
  const paperRef = useRef(null);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [hoveredCreateOption, setHoveredCreateOption] = useState(null);


  useEffect(() => {
    if (paperRef.current) {
      const paperWidth = paperRef.current.offsetWidth;
      setButtonWidth(paperWidth - 40); // 16px for left and right margin
    }
  }, []);


  const handleMenuToggle = (menuName) => {
    setOpenMenu(prevOpenMenu => prevOpenMenu === menuName ? '' : menuName);
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


  const menuItems = [
   
    {
      icon: <DashboardCustomizeIcon />,
      label: "Dashboard",
      onClick: handleMainDashboardClick
    },
    {
      icon: <PointOfSaleIcon />,
      label: "Sales",
      subItems: [
        { label: "Dashboard", onClick: handleSalesClick, value: 'dashboard' },
        { label: "Customers", onClick: handleSalesClick, value: 'customers' },
        { label: "Products", onClick: handleSalesClick, value: 'products' },
        { label: "Services", onClick: handleSalesClick, value: 'services' },
        { label: "Estimates", onClick: handleSalesClick, value: 'estimates' },
        { label: "Orders", onClick: handleSalesClick, value: 'orders' },
        { label: "Invoices", onClick: handleSalesClick, value: 'invoices' },
        { label: "Reports", onClick: handleSalesClick, value: 'reports' },
      ]
    },
    {
      icon: <PaymentsIcon />,
      label: "Payments",
      subItems: [
        { label: "Dashboard", onClick: handlePaymentsClick, value: 'dashboard' },
        { label: "Receive Payments", onClick: handlePaymentsClick, value: 'receive-payments' },
        { label: "Make Payments", onClick: handlePaymentsClick, value: 'make-payments' },
        { label: "Payment Methods", onClick: handlePaymentsClick, value: 'payment-methods' },
        { label: "Recurring Payments", onClick: handlePaymentsClick, value: 'recurring-payments' },
        { label: "Refunds", onClick: handlePaymentsClick, value: 'refunds' },
        { label: "Payment Reconciliation", onClick: handlePaymentsClick, value: 'reconciliation' },
        { label: "Payment Gateways", onClick: handlePaymentsClick, value: 'payment-gateways' },
        { label: "Payment Plans", onClick: handlePaymentsClick, value: 'payment-plans' },
        { label: "Reports", onClick: handlePaymentsClick, value: 'reports' },
      ]
    },
    // Add other menu items (Purchases, Accounting, Banking, Payroll, Inventory, Reports, Analytics, Taxes) similarly
      {
    icon: <ShoppingCartIcon />,
    label: "Purchases",
    subItems: [
      { label: "Dashboard", onClick: handlePurchasesClick, value: 'dashboard' },
      { label: "Vendors", onClick: handlePurchasesClick, value: 'vendors' },
      { label: "Purchase Orders", onClick: handlePurchasesClick, value: 'purchase-orders' },
      { label: "Bills", onClick: handlePurchasesClick, value: 'bills' },
      { label: "Expenses", onClick: handlePurchasesClick, value: 'expenses' },
      { label: "Purchase Returns", onClick: handlePurchasesClick, value: 'purchase-returns' },
      { label: "Procurement", onClick: handlePurchasesClick, value: 'procurement' },
      { label: "Reports", onClick: handlePurchasesClick, value: 'reports' },
    ]
  },
  {
    icon: <AccountBalanceIcon />,
    label: "Accounting",
    subItems: [
      { label: "Dashboard", onClick: handleAccountingClick, value: 'dashboard' },
      { label: "Chart of Accounts", onClick: handleAccountingClick, value: 'chart-of-accounts' },
      { label: "Journal Entries", onClick: handleAccountingClick, value: 'journal-entries' },
      { label: "General Ledger", onClick: handleAccountingClick, value: 'general-ledger' },
      { label: "Reconciliation", onClick: handleAccountingClick, value: 'reconciliation' },
      { label: "Financial Statements", onClick: handleAccountingClick, value: 'financial-statements' },
      { label: "Fixed Assets", onClick: handleAccountingClick, value: 'fixed-assets' },
      { label: "Reports", onClick: handleAccountingClick, value: 'reports' },
    ]
  },
  {
    icon: <AccountBalanceWalletIcon />,
    label: "Banking",
    subItems: [
      { label: "Dashboard", onClick: handleBankingClick, value: 'dashboard' },
      { label: "Connect to Bank", onClick: handleBankingClick, value: 'connect' },
      { label: "Bank Transactions", onClick: handleBankingClick, value: 'transactions' },
      { label: "Bank Reconciliation", onClick: handleBankingClick, value: 'reconciliation' },
      { label: "Reports", onClick: handleBankingClick, value: 'bank-reports' },
    ]
  },  
  {
    icon: <PaymentsIcon />,
    label: "Payroll",
    subItems: [
      { label: "Dashboard", onClick: handlePayrollClick, value: 'dashboard' },
      { label: "Employees", onClick: handlePayrollClick, value: 'employees' },
      { label: "Timesheets", onClick: handlePayrollClick, value: 'timesheets' },
      { label: "Taxes", onClick: handlePayrollClick, value: 'taxes' },
      { label: "Benefits", onClick: handlePayrollClick, value: 'benefits' },
      { label: "Run Payroll", onClick: handlePayrollClick, value: 'run' },
      { label: "Payroll Transactions", onClick: handlePayrollClick, value: 'transactions' },
      { label: "Reports", onClick: handlePayrollClick, value: 'reports' },
    ]
  },
  {
    icon: <Inventory2OutlinedIcon />,
    label: "Inventory",
    subItems: [
      { label: "Dashboard", onClick: handleInventoryClick, value: 'inventorydashboard' },
      { label: "Products", onClick: handleInventoryClick, value: 'items' },
      { label: "Stock Adjustments", onClick: handleInventoryClick, value: 'stock-adjustments' },
      { label: "Locations", onClick: handleInventoryClick, value: 'locations' },
      { label: "Suppliers", onClick: handleInventoryClick, value: 'suppliers' },
      { label: "Transactions", onClick: handleInventoryClick, value: 'transactions' },
      { label: "Reports", onClick: handleInventoryClick, value: 'reports' },
    ]
  },
  {
    icon: <AssessmentIcon />,
    label: "Reports",
    subItems: [
      { label: "Profit & Loss Statement", onClick: handleReportClick, value: 'income_statement' },
      { label: "Balance Sheet", onClick: handleReportClick, value: 'balance_sheet' },
      { label: "Cash Flow", onClick: handleReportClick, value: 'cash_flow' },
      { label: "Sales Tax ", onClick: handleReportClick, value: 'sales_tax_report' },
      { label: "Payroll Wage Tax", onClick: handleReportClick, value: 'payroll_wage_tax_report' },
      { label: "Income by Customer", onClick: handleReportClick, value: 'income_by_customer' },
      { label: "Aged Receivables", onClick: handleReportClick, value: 'aged_receivables' },
      { label: "Purchases by Vendor", onClick: handleReportClick, value: 'purchases_by_vendor' },
      { label: "Aged Payables", onClick: handleReportClick, value: 'aged_payables' },
      { label: "Account Balances", onClick: handleReportClick, value: 'account_balances' },
      { label: "Trial Balances", onClick: handleReportClick, value: 'trial_balance' },
      { label: "General Ledger", onClick: handleReportClick, value: 'general_ledger' },




    ]
  },
  {
    icon: <AnalyticsIcon />,
    label: "Analytics",
    subItems: [
      { label: "KPI Dashboard", onClick: handleAnalysisClick, value: 'kpi-data' },
      { label: "Sales Analysis", onClick: handleAnalysisClick, value: 'sales-analysis' },
      { label: "Expense Analysis", onClick: handleAnalysisClick, value: 'expenses-analysis' },
      { label: "Profit & Loss", onClick: handleAnalysisClick, value: 'profit-loss-analysis' },
      { label: "Cash Flow", onClick: handleAnalysisClick, value: 'cash-flow' },
      { label: "Budget vs. Actual", onClick: handleAnalysisClick, value: 'budget-vs-actual' },
    ]
  },
  {
    icon: <ReceiptLongIcon />,
    label: "Taxes",
    subItems: [
      { label: "Dashboard", onClick: handleTaxesClick, value: 'dashboard' },
      { label: "Sales Tax", onClick: handleTaxesClick, value: 'sales-tax' },
      { label: "Income Tax", onClick: handleTaxesClick, value: 'income-tax' },
      { label: "Payroll Tax", onClick: handleTaxesClick, value: 'payroll-tax' },
      { label: "Tax Payments", onClick: handleTaxesClick, value: 'tax-payments' },
      { label: "Tax Forms", onClick: handleTaxesClick, value: 'tax-forms' },
      { label: "Reports", onClick: handleTaxesClick, value: 'reports' },
    ]
  },
  ];

  const createOptions = [
    { label: "Transaction", onClick: handleShowCreateOptions, value: 'Transaction' },
    { label: "Product", onClick: handleShowCreateOptions, value: 'Product' },
    { label: "Service", onClick: handleShowCreateOptions, value: 'Service' },
    { label: "Invoice", onClick: handleShowCreateOptions, value: 'Invoice' },
    { label: "Bill", onClick: handleShowCreateOptions, value: 'Bill' },
    { label: "Estimate", onClick: handleShowCreateOptions, value: 'Estimate' },
    { label: "Customer", onClick: handleShowCreateOptions, value: 'Customer' },
    { label: "Vendor", onClick: handleShowCreateOptions, value: 'Vendor' },
  ];

  const menuTheme = createTheme({
    palette: {
      menu: {
        text: '#0d47a1', // Default text color (navy blue)
        textHover: '#0d47a1', // Text color on hover and when open (navy blue)
        icon: '#64b5f6', // Default icon color (light blue)
        iconHover: '#0d47a1', // Icon color on hover and when open (navy blue)
        background: 'transparent',
        backgroundHover: 'rgba(0, 0, 0, 0.04)', // Background color when hovered or open
      },
    },
  });


  const scrollThumbColor = '#bbdefb';
  const scrollTrackColor = '#e3f2fd'; // Slightly lighter than the thumb


    const renderSubMenu = (items, parentMenu) => (
      <Collapse in={openMenu === parentMenu} timeout="auto" unmountOnExit>
        <List component="div" disablePadding>
          {items.map((item, index) => (
            <ListItemButton
              key={index}
              sx={{ 
                pl: 8,
                color: 'menu.text',
                '&:hover': {
                  backgroundColor: 'menu.backgroundHover',
                  color: 'menu.textHover',
                  '& .MuiListItemText-primary': {
                    fontWeight: 'bold',
                  },
                },
                '& .MuiListItemText-primary': {
                  fontSize: '0.9rem',
                  fontWeight: 'normal',
                },
              }}
              onClick={() => item.onClick(item.value)}
            >
              <ListItemText primary={item.label} />
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
            pl: 2,
            py: 1,
            mb: 2,
            mx: 1,
            textTransform: 'none',
            border: '2px solid',
            borderColor: isCreateOpen ? 'primary.dark' : 'primary.main',
            borderRadius: '50px',
            maxWidth: '160px', // Adjust this value as needed
            width: `${buttonWidth}px`,
            color: isCreateOpen ? 'primary.dark' : 'menu.text',
            backgroundColor: isCreateOpen ? '#e3f2fd' : '#e3f2fd',
            fontSize: '16px',
            fontWeight: isCreateOpen ? 'bold' : 'normal',
            transition: 'all 0.3s ease',
            '&:hover, &.Mui-focusVisible': {
              backgroundColor: '#e3f2fd',
              borderColor: 'primary.dark',
              color: 'primary.dark',
              fontWeight: 'bold',
              '& .MuiSvgIcon-root': {
                color: 'primary.dark',
              },
            },
          }}
        >
            <ListItemIcon
              sx={{
                minWidth: 25,
                mr: 1,
                '& .MuiSvgIcon-root': {
                  fontSize: '24px',
                  color: isCreateOpen ? 'primary.dark' : 'menu.icon',
                  transition: 'color 0.3s ease',
                },
                '$:hover &, .Mui-focusVisible &': {
                  '& .MuiSvgIcon-root': {
                    color: 'primary.dark',
                  },
                },
              }}
            >
            <AddCircleOutlineIcon />
          </ListItemIcon>
          <ListItemText 
            primary="Create new" 
            sx={{
              '& .MuiListItemText-primary': {
                fontWeight: 'inherit',
              },
            }}
          />
        </ListItemButton>
      );
    };
  
    return (
      <ThemeProvider theme={menuTheme}>
        <Paper 
          ref={paperRef}
          elevation={0}
          sx={{ 
            width: MENU_WIDTH, 
            height: '100vh', 
            background: '#fafafa',
            borderRight: `${borderRightWidth} solid ${borderRightColor}`,

            overflowY: 'auto',
            overflowX: 'hidden',
            '&::-webkit-scrollbar': {
              width: '5px',
            },
            '&::-webkit-scrollbar-track': {
              background: scrollTrackColor
            },
            '&::-webkit-scrollbar-thumb': {
              background: scrollThumbColor,
              borderRadius: '5px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: '#81d4fa',
            },
            scrollbarWidth: 'thin',
            scrollbarColor: `${scrollThumbColor} ${scrollTrackColor}`,
          }}
        >
          <Box sx={{ overflow: 'auto', height: '100%', pt: 3 }}>
            <CreateNewButton />
            <List component="nav" aria-label="main mailbox folders">
              {menuItems.map((item, index) => (
                <React.Fragment key={index}>
                  <ListItemButton
            onClick={() => item.subItems ? handleMenuToggle(item.label) : item.onClick && item.onClick()}
            onMouseEnter={() => handleMouseEnter(item.label)}
                              onMouseLeave={handleMouseLeave}
                    sx={{
                      color: 'menu.text',
                      position: 'relative',
                      pr: 7,
                      backgroundColor: openMenu === item.label ? 'menu.backgroundHover' : 'transparent',
                      '&:hover, &.Mui-selected': {
                        backgroundColor: 'menu.backgroundHover',
                        color: 'menu.textHover',
                        '& .MuiListItemIcon-root': {
                          color: 'menu.iconHover',
                        },
                        '& .MuiListItemText-primary': {
                          fontWeight: 'bold',
                        },
                      },
                    }}
                    selected={openMenu === item.label}
                  >
                    <ListItemIcon 
                      sx={{ 
                        color: 'menu.icon', 
                        minWidth: 40,
                        '& .MuiSvgIcon-root': {
                          color: (openMenu === item.label || hoveredItem === item.label) ? 'menu.iconHover' : 'menu.icon',
                        },
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.label} 
                      sx={{ 
                        '& .MuiListItemText-primary': { 
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontWeight: (openMenu === item.label || hoveredItem === item.label) ? 'bold' : 'normal',
                        }
                      }}
                    />
                    {item.subItems && (
                      <Box
                        sx={{
                          position: 'absolute',
                          right: 16,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          opacity: hoveredItem === item.label || openMenu === item.label ? 1 : 0,
                          transition: 'opacity 0.2s',
                          color: (openMenu === item.label || hoveredItem === item.label) ? 'menu.iconHover' : 'menu.icon',
                        }}
                      >
                        {openMenu === item.label ? <ExpandLess /> : <ExpandMore />}
                      </Box>
                    )}
                  </ListItemButton>
                  {item.subItems && renderSubMenu(item.subItems, item.label)}
                </React.Fragment>
              ))}
            </List>
          </Box>
        </Paper>
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
                      marginLeft: '220px',
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
                      option.onClick(option.value);
                      handleCreateClose();
                    }}
                    onMouseEnter={() => setHoveredCreateOption(option.value)}
                    onMouseLeave={() => setHoveredCreateOption(null)}
                    sx={{
                      py: 0.2,
                      color: menuTheme.palette.menu.text,
                      '&:hover': {
                        backgroundColor: menuTheme.palette.menu.backgroundHover,
                        color: menuTheme.palette.menu.textHover,
                      },
                    }}
                  >
                    <ListItemText 
                      primary={option.label}
                      primaryTypographyProps={{
                        fontSize: '0.9rem',
                        fontWeight: hoveredCreateOption === option.value ? 'bold' : 'normal',
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