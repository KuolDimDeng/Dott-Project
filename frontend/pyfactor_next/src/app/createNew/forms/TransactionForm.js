import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Modal,
  Typography,
  Grid,
  Paper,
  Tooltip,
  useTheme,
  useMediaQuery,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Tabs,
  Tab,
  Card,
  CardContent,
  Divider,
  IconButton,
  Chip,
  InputAdornment,
  TextField,
  Alert
} from '@mui/material';
import AddIncomeForm from './AddIncomeForm';
import AddExpenseForm from './AddExpenseForm';
import SalesForm from './SalesForm';
import RefundForm from './RefundForm';
import { axiosInstance as useApi } from '@/lib/axiosConfig';
import { logger } from '@/utils/logger';
import { useToast } from '@/components/Toast/ToastProvider';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import RefreshIcon from '@mui/icons-material/Refresh';
import PaymentsIcon from '@mui/icons-material/Payments';
import SavingsIcon from '@mui/icons-material/Savings';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { format } from 'date-fns';
import ModernFormLayout from '@/app/components/ModernFormLayout';

const TransactionForm = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [openModal, setOpenModal] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [userDatabase, setUserDatabase] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const toast = useToast();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    logger.info('[TransactionForm] Component mounted');
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (userDatabase) {
      fetchAccounts(userDatabase);
      fetchTransactions(userDatabase);
    }
  }, [userDatabase]);

  const handleTabChange = (event, newValue) => {
    logger.debug('[TransactionForm] Tab changed to:', newValue);
    setActiveTab(newValue);
  };

  const fetchUserProfile = async () => {
    try {
      logger.info('[TransactionForm] Fetching user profile');
      const response = await useApi.get('/api/profile/');
      setUserDatabase(response.data.database_name);
      logger.info('[TransactionForm] User profile fetched:', response.data);
    } catch (error) {
      logger.error('[TransactionForm] Error fetching user profile:', error);
      toast.error('Failed to fetch user profile');
    }
  };

  const fetchAccounts = async (database_name) => {
    try {
      logger.info('[TransactionForm] Fetching accounts from database:', database_name);
      const response = await useApi.get('/api/accounts/', {
        params: { database: database_name },
      });
      logger.info('[TransactionForm] Accounts fetched successfully:', response.data.length);
      setAccounts(response.data);
    } catch (error) {
      logger.error('[TransactionForm] Error fetching accounts:', error);
      toast.error('Failed to fetch accounts');
    }
  };

  const fetchTransactions = async (database_name) => {
    setLoading(true);
    try {
      logger.info('[TransactionForm] Fetching transactions from database:', database_name);
      const response = await useApi.get('/api/transactions/', {
        params: { database: database_name },
      });
      logger.info('[TransactionForm] Transactions fetched successfully:', response.data.length);
      setTransactions(response.data);
    } catch (error) {
      logger.error('[TransactionForm] Error fetching transactions:', error);
      toast.error('Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (modalName) => {
    logger.debug('[TransactionForm] Opening modal:', modalName);
    setOpenModal(modalName);
  };
  
  const handleCloseModal = () => {
    logger.debug('[TransactionForm] Closing modal');
    setOpenModal(null);
    // Refresh transactions after modal closes
    if (userDatabase) {
      fetchTransactions(userDatabase);
    }
  };

  const handleRefresh = () => {
    logger.info('[TransactionForm] Manually refreshing transactions');
    if (userDatabase) {
      fetchTransactions(userDatabase);
    }
  };

  const handleFilterChange = (type) => {
    logger.debug('[TransactionForm] Filter changed to:', type);
    setFilterType(type);
  };

  const filteredTransactions = transactions.filter(transaction => {
    // Apply search filter
    const matchesSearch = searchQuery === '' || 
      transaction.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Apply type filter
    let matchesType = true;
    if (filterType !== 'all') {
      matchesType = transaction.type === filterType;
    }
    
    return matchesSearch && matchesType;
  });

  const renderModal = () => {
    const modalStyle = {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: isMobile ? '90%' : 600,
      maxHeight: '90vh',
      overflow: 'auto',
      bgcolor: 'background.paper',
      boxShadow: 24,
      p: 4,
      borderRadius: 2,
    };

    const modalProps = {
      onClose: handleCloseModal,
      accounts: accounts,
      userDatabase: userDatabase
    };

    switch (openModal) {
      case 'sales':
        return (
          <Modal open={true} onClose={handleCloseModal}>
            <Box sx={modalStyle}>
              <Typography variant="h6" component="h2" gutterBottom>
                Create Sale
              </Typography>
              <SalesForm {...modalProps} />
            </Box>
          </Modal>
        );
      case 'refund':
        return (
          <Modal open={true} onClose={handleCloseModal}>
            <Box sx={modalStyle}>
              <Typography variant="h6" component="h2" gutterBottom>
                Create Refund
              </Typography>
              <RefundForm {...modalProps} />
            </Box>
          </Modal>
        );
      case 'income':
        return (
          <Modal open={true} onClose={handleCloseModal}>
            <Box sx={modalStyle}>
              <Typography variant="h6" component="h2" gutterBottom>
                Add Income
              </Typography>
              <AddIncomeForm {...modalProps} />
            </Box>
          </Modal>
        );
      case 'expense':
        return (
          <Modal open={true} onClose={handleCloseModal}>
            <Box sx={modalStyle}>
              <Typography variant="h6" component="h2" gutterBottom>
                Add Expense
              </Typography>
              <AddExpenseForm {...modalProps} />
            </Box>
          </Modal>
        );
      default:
        return null;
    }
  };

  // Render the Quick Actions tab
  const renderQuickActionsTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Quick Transaction Actions
        </Typography>
      </Grid>
      
      <Grid item xs={12} sm={6} md={3}>
        <Card 
          elevation={0} 
          variant="outlined" 
          sx={{ 
            borderRadius: '12px', 
            height: '100%',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
            }
          }}
        >
          <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
            <Box 
              sx={{ 
                p: 2, 
                borderRadius: '50%', 
                bgcolor: 'primary.light', 
                color: 'primary.contrastText',
                mb: 2
              }}
            >
              <PointOfSaleIcon fontSize="large" />
            </Box>
            <Typography variant="h6" gutterBottom align="center">
              Create Sale
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2 }}>
              Record a new sale transaction
            </Typography>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={() => handleOpenModal('sales')}
              sx={{ 
                mt: 'auto', 
                borderRadius: '8px',
                textTransform: 'none'
              }}
            >
              Create Sale
            </Button>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card 
          elevation={0} 
          variant="outlined" 
          sx={{ 
            borderRadius: '12px', 
            height: '100%',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
            }
          }}
        >
          <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
            <Box 
              sx={{ 
                p: 2, 
                borderRadius: '50%', 
                bgcolor: 'secondary.light', 
                color: 'secondary.contrastText',
                mb: 2
              }}
            >
              <AssignmentReturnIcon fontSize="large" />
            </Box>
            <Typography variant="h6" gutterBottom align="center">
              Process Refund
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2 }}>
              Process customer refunds
            </Typography>
            <Button
              variant="contained"
              color="secondary"
              fullWidth
              onClick={() => handleOpenModal('refund')}
              sx={{ 
                mt: 'auto', 
                borderRadius: '8px',
                textTransform: 'none'
              }}
            >
              Create Refund
            </Button>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card 
          elevation={0} 
          variant="outlined" 
          sx={{ 
            borderRadius: '12px', 
            height: '100%',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
            }
          }}
        >
          <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
            <Box 
              sx={{ 
                p: 2, 
                borderRadius: '50%', 
                bgcolor: 'success.light', 
                color: 'success.contrastText',
                mb: 2
              }}
            >
              <AddIcon fontSize="large" />
            </Box>
            <Typography variant="h6" gutterBottom align="center">
              Add Income
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2 }}>
              Record incoming payments
            </Typography>
            <Button
              variant="contained"
              color="success"
              fullWidth
              onClick={() => handleOpenModal('income')}
              sx={{ 
                mt: 'auto', 
                borderRadius: '8px',
                textTransform: 'none'
              }}
            >
              Add Income
            </Button>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card 
          elevation={0} 
          variant="outlined" 
          sx={{ 
            borderRadius: '12px', 
            height: '100%',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
            }
          }}
        >
          <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3 }}>
            <Box 
              sx={{ 
                p: 2, 
                borderRadius: '50%', 
                bgcolor: 'error.light', 
                color: 'error.contrastText',
                mb: 2
              }}
            >
              <RemoveIcon fontSize="large" />
            </Box>
            <Typography variant="h6" gutterBottom align="center">
              Add Expense
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2 }}>
              Record business expenses
            </Typography>
            <Button
              variant="contained"
              color="error"
              fullWidth
              onClick={() => handleOpenModal('expense')}
              sx={{ 
                mt: 'auto', 
                borderRadius: '8px',
                textTransform: 'none'
              }}
            >
              Add Expense
            </Button>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  // Render the Recent Transactions tab
  const renderTransactionsTab = () => (
    <Box>
      <Box sx={{ 
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', sm: 'center' },
        mb: 3,
        gap: 2,
      }}>
        <Typography variant="h6">Recent Transactions</Typography>
        
        <Box sx={{ 
          display: 'flex', 
          gap: 1,
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
        }}>
          <TextField
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
            }}
            sx={{ minWidth: '200px' }}
          />
          
          <IconButton onClick={handleRefresh} size="small">
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ 
        display: 'flex', 
        gap: 1, 
        mb: 2,
        flexWrap: 'wrap' 
      }}>
        <Chip 
          icon={<FilterListIcon />} 
          label="All Transactions" 
          variant={filterType === 'all' ? 'filled' : 'outlined'} 
          onClick={() => handleFilterChange('all')} 
        />
        <Chip 
          icon={<ArrowUpwardIcon />} 
          label="Income" 
          variant={filterType === 'credit' ? 'filled' : 'outlined'} 
          onClick={() => handleFilterChange('credit')} 
          color="success"
        />
        <Chip 
          icon={<ArrowDownwardIcon />} 
          label="Expense" 
          variant={filterType === 'debit' ? 'filled' : 'outlined'} 
          onClick={() => handleFilterChange('debit')} 
          color="error"
        />
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" m={3}>
          <CircularProgress />
        </Box>
      ) : filteredTransactions.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          No transactions found{searchQuery ? ` matching "${searchQuery}"` : ''}
          {filterType !== 'all' ? ` with type "${filterType}"` : ''}
        </Alert>
      ) : (
        <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ borderRadius: '12px' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Type</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTransactions.slice(0, 10).map((transaction) => (
                <TableRow key={transaction.id} hover>
                  <TableCell>{format(new Date(transaction.date), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>{transaction.description}</TableCell>
                  <TableCell align="right" sx={{ 
                    color: transaction.type === 'credit' ? 'success.main' : 'error.main',
                    fontWeight: 'medium'
                  }}>
                    {transaction.type === 'credit' ? '+' : '-'}${parseFloat(transaction.amount).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={transaction.type === 'credit' ? 'Income' : 'Expense'} 
                      size="small" 
                      color={transaction.type === 'credit' ? 'success' : 'error'}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredTransactions.length > 10 && (
            <Box p={2} display="flex" justifyContent="center">
              <Typography variant="body2" color="text.secondary">
                Showing 10 of {filteredTransactions.length} transactions
              </Typography>
            </Box>
          )}
        </TableContainer>
      )}
    </Box>
  );

  // Render the Account Summary Tab
  const renderAccountSummaryTab = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Account Balances
      </Typography>
      {accounts.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          No accounts found. Add accounts to see their balances here.
        </Alert>
      ) : (
        <Grid container spacing={3} mt={1}>
          {accounts.map((account, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card variant="outlined" sx={{ borderRadius: '12px' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Box 
                      sx={{ 
                        p: 1, 
                        borderRadius: '50%', 
                        bgcolor: 'primary.light', 
                        mr: 1 
                      }}
                    >
                      {account.type === 'savings' ? (
                        <SavingsIcon fontSize="small" />
                      ) : (
                        <PaymentsIcon fontSize="small" />
                      )}
                    </Box>
                    <Typography variant="subtitle1">{account.name}</Typography>
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', my: 1 }}>
                    ${parseFloat(account.balance || 0).toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {account.description || account.type}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );

  return (
    <Box sx={{ width: '100%', maxWidth: '1200px', mx: 'auto' }}>
      <Paper 
        elevation={0} 
        sx={{ 
          mb: 3, 
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
          overflow: 'hidden',
        }}
      >
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            minHeight: '60px',
            '& .MuiTab-root': {
              fontWeight: 600,
              fontSize: '0.95rem',
              textTransform: 'none',
              minHeight: '60px',
            }
          }}
        >
          <Tab label="Quick Actions" />
          <Tab label="Transactions" />
          <Tab label="Account Summary" />
        </Tabs>
      </Paper>

      <ModernFormLayout
        title="Financial Transactions"
        subtitle="Manage your business financial activities"
        icon={<AccountBalanceIcon />}
      >
        {activeTab === 0 && renderQuickActionsTab()}
        {activeTab === 1 && renderTransactionsTab()}
        {activeTab === 2 && renderAccountSummaryTab()}
      </ModernFormLayout>

      {renderModal()}
    </Box>
  );
};

export default TransactionForm;
