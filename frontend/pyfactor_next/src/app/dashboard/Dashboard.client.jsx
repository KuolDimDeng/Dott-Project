'use client';
import * as React from 'react';
import { useState, useCallback, useEffect } from 'react';
import { styled, createTheme, ThemeProvider } from '@mui/material/styles';
import { Button } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import CssBaseline from '@mui/material/CssBaseline';
import MuiDrawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import MuiAppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Link from '@mui/material/Link';
import NotificationsIcon from '@mui/icons-material/Notifications';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { MainListItems } from './components/lists/listItems';
import Chart from './Chart';
import Deposits from './Deposits';
import Orders from './Orders';
import InputBase from '@mui/material/InputBase';
import SearchIcon from '@mui/icons-material/Search';
import DateTime from './components/components/DateTime.jsx';
import ConsoleMessages from './components/components/ConsoleMessages.jsx';
import Image from 'next/image';
import logoPath from '/public/static/images/Pyfactor.png';
import InvoiceTemplateBuilder from './components/forms/InvoiceTemplateBuilder';
import ProductForm from './components/forms/ProductForm';
import ServiceForm from './components/forms/ServiceForm';
import CustomerForm from './components/forms/CustomerForm';
import BillForm from './components/forms/BillForm';
import InvoiceForm from './components/forms/InvoiceForm';
import VendorForm from './components/forms/VendorForm';
import EstimateForm from './components/forms/EstimateForm';
import SalesOrderForm from './components/forms/SalesOrderForm';
import TransactionForm from './components/forms/TransactionForm';
import TransactionList from './components/lists/TransactionList';
import ReportDisplay from './components/forms/ReportDisplay';
import MenuIcon from '@mui/icons-material/Menu';
import BankingDashboard from './components/forms/BankingDashboard';
import Reports from './components/components/Reports';
import AnalysisPage from './components/forms/AnalysisPage';
import Chatbot from './components/forms/ChatBot.jsx';


import { logger } from '@/utils/logger';
import { UserMessageProvider, useUserMessageContext } from '@/contexts/UserMessageContext';

function Copyright(props) {
  return (
    <Typography variant="body2" color="text.secondary" align="center" {...props}>
      {'Copyright © '}
      <Link color="inherit" href="#">
        PyFactor
      </Link>{' '}
      {new Date().getFullYear()}
      {'.'}
    </Typography>
  );
}

const drawerWidth = 270;

const AppBar = styled(MuiAppBar)(({ theme }) => ({
  zIndex: theme.zIndex.drawer + 1,
}));

const Drawer = styled(MuiDrawer)(({ theme }) => ({
  '& .MuiDrawer-paper': {
    position: 'relative',
    whiteSpace: 'nowrap',
    width: drawerWidth,
    boxSizing: 'border-box',
    '& .MuiListItemButton-root': {
      borderBottom: 'none',
    },
    '& .MuiListItemButton-root:last-child': {
      borderBottom: 'none',
    },
  },
}));

const theme = createTheme({
  palette: {
    primary: {
      main: '#000080', // Navy blue color
    },
    secondary: {
      main: '#8BC34A', // Light green color
    },
  },
});

const lightBlue = '#81d4fa';
const BottomAppBar = styled(MuiAppBar)(({ theme }) => ({
  top: 'auto',
  bottom: 0,
  backgroundColor: lightBlue,
  height: '60px',
  minHeight: 'unset',
  display: 'flex',
  alignItems: 'left',
  position: 'fixed',
  left: drawerWidth,
  width: `calc(100% - ${drawerWidth}px)`,
}));

const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.common.white,
  marginRight: theme.spacing(2),
  marginLeft: theme.spacing(3),
  width: 'auto',
  [theme.breakpoints.up('sm')]: {
    width: 'calc(20ch * 1.4)',
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: theme.palette.text.primary,
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: theme.palette.text.primary,
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('md')]: {
      width: 'calc(20ch * 1.4)',
    },
  },
}));

const renderForm = (option, userData) => {
  switch (option) {
    case 'Product':
      return <ProductForm />;
    case 'Service':
      return <ServiceForm />;
    case 'Customer':
      return <CustomerForm />;
    case 'Bill':
      return <BillForm />;
    case 'Invoice':
      return <InvoiceForm />;
    case 'Vendor':
      return <VendorForm />;
    case 'Estimate':
      return <EstimateForm userData={userData} />;
    case 'Sales Order':
      return <SalesOrderForm />;
    default:
      return null;
  }
};

const renderMainContent = (
  showTransactionForm,
  showInvoiceBuilder,
  showCreateOptions,
  selectedOption,
  userData,
  handleCloseInvoiceBuilder,
  showAccountPage,
  handleDeleteAccount,
  selectedReport,
  showReports,  // Add this parameter
  showBankingDashboard,
  showHRDashboard,
  hrSection,
  showPayrollDashboard,
  payrollSection,
  showAnalysisPage,


) => {
  console.log('Rendering main content. showAnalysisPage:', showAnalysisPage);
  if (showAnalysisPage) {
    console.log('Rendering AnalysisPage');
    return <AnalysisPage />;
  }
  if (showReports && selectedReport) {
    return <ReportDisplay reportType={selectedReport} />;
  }
  if (showBankingDashboard) {
    return <BankingDashboard/>;
  }
  if (showHRDashboard) {
    return <HRDashboard section={hrSection} />;
  }
  if (showPayrollDashboard) {
    return <PayrollDashboard section={payrollSection} />;
  }
  if (showAccountPage) {
    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Button variant="contained" color="error" onClick={handleDeleteAccount}>
            Delete Account
          </Button>
        </Grid>
      </Grid>
    );
  } else if (showTransactionForm) {
    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TransactionForm />
        </Grid>
        <Grid item xs={12}>
          <TransactionList />
        </Grid>
      </Grid>
    );
  } else if (showInvoiceBuilder) {
    return (
      <InvoiceTemplateBuilder
        handleClose={handleCloseInvoiceBuilder}
        userData={userData}
      />
    );
  } else if (showCreateOptions) {
    return (
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          {renderForm(selectedOption, userData)}
        </Grid>
      </Grid>
    );
  } else if (selectedReport) {
    return <ReportDisplay reportType={selectedReport} />;
  } else {
    return (
      <Grid container spacing={3}>
        <Grid item xs={12} md={8} lg={9}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 240,
            }}
          >
            <Chart />
          </Paper>
        </Grid>
        <Grid item xs={12} md={4} lg={3}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: 240,
            }}
          >
            <Deposits />
          </Paper>
        </Grid>
        <Grid item xs={12}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            <Orders />
          </Paper>
        </Grid>
      </Grid>
    );
  }
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }

    return this.props.children;
  }
}

function DashboardContent() {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const openMenu = Boolean(anchorEl);
  const [userData, setUserData] = React.useState(null);
  const [showInvoiceBuilder, setShowInvoiceBuilder] = React.useState(false);
  const [showCreateOptions, setShowCreateOptions] = React.useState(false);
  const [selectedOption, setSelectedOption] = React.useState(null);
  const [showTransactionForm, setShowTransactionForm] = React.useState(false);
  const [showAccountPage, setShowAccountPage] = React.useState(false);
  const { addMessage } = useUserMessageContext();
  const [selectedReport, setSelectedReport] = useState(null);
  const [showReports, setShowReports] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [showBankingDashboard, setShowBankingDashboard] = useState(false);
  const [showHRDashboard, setShowHRDashboard] = useState(false);
  const [showPayrollDashboard, setShowPayrollDashboard] = useState(false);
  const [hrSection, setHRSection] = useState('');
  const [payrollSection, setPayrollSection] = useState('');
  const [showAnalysisPage, setShowAnalysisPage] = useState(false);

  const handleAnalysisClick = () => {
    console.log('Before state update:', showAnalysisPage);
    setShowAnalysisPage(true);
    console.log('After state update:', showAnalysisPage);
  };

  const handleHRClick = (section) => {
    setShowHRDashboard(true);
    setHRSection(section);
    // Reset other view states
    setShowPayrollDashboard(false);
    setShowBankingDashboard(false);
    // ... (reset other states)
  };

  const handlePayrollClick = (section) => {
    setShowPayrollDashboard(true);
    setPayrollSection(section);
    // Reset other view states
    setShowHRDashboard(false);
    setShowBankingDashboard(false);
    // ... (reset other states)
  };

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleBankingClick = () => {
    setShowBankingDashboard(true);
    // Reset other view states if necessary
    setShowTransactionForm(false);
    setShowCreateOptions(false);
    setShowInvoiceBuilder(false);
    setSelectedReport(null);
  };


  const handleReportClick = (reportType) => {
    setSelectedReport(reportType);
    setShowReports(true);
    setShowCreateOptions(false);
    setShowInvoiceBuilder(false);
    setShowTransactionForm(false);
  };

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleShowInvoiceBuilder = () => {
    setShowInvoiceBuilder(true);
    setShowCreateOptions(false);
    setSelectedOption(null);
    setShowTransactionForm(false);
    setSelectedReport(null);
  };

  const handleCloseInvoiceBuilder = () => {
    setShowInvoiceBuilder(false);
  };

  const handleShowCreateOptions = (option) => {
    setShowCreateOptions(true);
    setShowInvoiceBuilder(false);
    setSelectedOption(option);
    setShowTransactionForm(false);
    setSelectedReport(null);
  };

  const handleShowTransactionForm = () => {
    setShowTransactionForm(true);
    setShowCreateOptions(false);
    setShowInvoiceBuilder(false);
    setSelectedOption(null);
    setSelectedReport(null);
  };

  const handleAccountClick = () => {
    setShowAccountPage(true);
    setAnchorEl(null);
  };

  const handleDeleteAccount = () => {
    const confirmDelete = window.confirm(
      "Are you sure you want to close your account permanently?"
    );
    if (confirmDelete) {
      deleteUserAccount();
    }
  };

  const deleteUserAccount = async () => {
    try {
      const token = localStorage.getItem('token');
      localStorage.removeItem('token');
      window.location.href = '/';
  
      const response = await fetch('http://localhost:8000/api/delete-account/', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      if (!response.ok) {
        logger.error('Error deleting account:', response.statusText);
        addMessage('error', `Error deleting account: ${response.statusText}`);
      } else {
        addMessage('info', 'Account deleted successfully');
      }
    } catch (error) {
      logger.error('Error deleting account:', error);
      addMessage('error', `Error deleting account: ${error.message}`);
    }
  };

  const fetchUserData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/profile/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
  
      if (response.ok) {
        const data = await response.json();
        logger.log('Dashboard User data:', data);
        // Add this line to ensure first_name is always set
        data.first_name = data.first_name || data.email.split('@')[0];
        data.full_name = data.full_name || `${data.first_name} ${data.last_name}`;
        console.log('first_name:', data.first_name);
        setUserData(data);
        addMessage('info', 'Welcome.');
      } else {
        logger.error('Error fetching user data:', response.statusText);
        addMessage('error', `Error fetching user data: ${response.statusText}`);
      }
    } catch (error) {
      logger.error('Error fetching user data:', error);
      addMessage('error', `Error fetching user data: ${error.message}`);
    }
  }, [addMessage]);

  React.useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);


  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex' }}>
        <CssBaseline />
        <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
              <Image
                src={logoPath}
                alt="PyFactor Logo"
                width={120}
                height={30}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Search>
                <SearchIconWrapper>
                  <SearchIcon />
                </SearchIconWrapper>
                <StyledInputBase
                  placeholder="Search…"
                  inputProps={{ 'aria-label': 'search' }}
                />
              </Search>
              <Box sx={{ ml: 2 }}>
                <DateTime />
              </Box>
              <IconButton color="inherit">
                <Badge badgeContent={4} color="secondary">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
              <IconButton color="inherit">
                <HelpOutlineIcon />
              </IconButton>
              <IconButton color="inherit">
                <SettingsIcon />
              </IconButton>
              <IconButton
                color="inherit"
                onClick={handleClick}
                aria-controls={openMenu ? 'user-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={openMenu ? 'true' : undefined}
              >
                <AccountCircleIcon />
              </IconButton>
              <Menu
                id="user-menu"
                anchorEl={anchorEl}
                open={openMenu}
                onClose={handleClose}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
              >
                {userData && (
                  <div>
                    <MenuItem disabled>{userData.full_name}</MenuItem>
                    <MenuItem disabled>{userData.occupation}</MenuItem>
                    <MenuItem disabled>{userData.business_name}</MenuItem>

                    <MenuItem onClick={handleAccountClick}>Account</MenuItem>
                  </div>
                )}
              </Menu>
            </Box>
          </Toolbar>
        </AppBar>
        <Drawer
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
          <Box sx={{ overflow: 'auto', pl: 0, pr: 0 }}> {/* Remove horizontal padding */}
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
              
            />
          </Box>
        </Drawer>
        <Box
            component="main"
            sx={{
              flexGrow: 1,
              p: 0,
              width: drawerOpen ? `calc(100% - ${drawerWidth - 150}px)` : '100%',
              marginLeft: drawerOpen ? `${drawerWidth - 150}px` : '0px' ,
          
              transition: theme.transitions.create(['margin', 'width'], {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
              }),
              pt: '64px', // Top padding for AppBar
              pb: '60px', // Bottom padding for BottomAppBar
              height: 'calc(100vh - 124px)', // Subtract AppBar and BottomAppBar heights
              overflow: 'auto',
            }}
          >
          <Box sx={{ mt: 2 }}> {/* Add this wrapper Box with margin-top */}
          <Container 
              maxWidth={false} // Change this to false to allow full width
              sx={{ 
                mt: 0, // Remove top margin
                mb: 0, // Remove bottom margin
                ml: 0, // Remove left margin
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                pl: 1, // Add minimal left padding
                pr: 1, // Add minimal right padding
              }}
            >            
            <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                {renderMainContent(
                  showTransactionForm,
                  showInvoiceBuilder,
                  showCreateOptions,
                  selectedOption,
                  userData,
                  handleCloseInvoiceBuilder,
                  showAccountPage,
                  handleDeleteAccount,
                  selectedReport,
                  showReports,
                  showBankingDashboard,
                  showHRDashboard,
                  hrSection,
                  showPayrollDashboard,
                  payrollSection,
                  showAnalysisPage,
                )}
              </Box>
            </Container>
          </Box>
          </Box>
          <AppBar 
          position="fixed" 
          sx={{ 
            top: 'auto', 
            bottom: 0, 
            left: 0,
            right: 0,
            height: '60px',
            zIndex: (theme) => theme.zIndex.drawer + 2,
            backgroundColor: lightBlue,
          }}
        >
          <Toolbar style={{ minHeight: '48px', padding: '0 16px' }}>
            <ConsoleMessages backgroundColor={lightBlue} />
          </Toolbar>
        </AppBar>
        <ErrorBoundary>
        <Chatbot useraName={userData ? userData.first_name : 'Guest'}
          backgroundColor={lightBlue} />
          </ErrorBoundary>
      </Box>
    
    </ThemeProvider>
  );

}
export default function Dashboard() {
  return (
    <UserMessageProvider>
      <DashboardContent />
    </UserMessageProvider>
  );
}