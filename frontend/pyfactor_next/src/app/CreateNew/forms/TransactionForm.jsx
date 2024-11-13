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
  CircularProgress
} from '@mui/material';
import AddIncomeForm from './AddIncomeForm';
import AddExpenseForm from './AddExpenseForm';
import SalesForm from './SalesForm';
import RefundForm from './RefundForm';
import { logger } from '@/utils/logger';
import { useUserMessageContext } from '@/contexts/UserMessageContext';
import { useApi } from '@/lib/axiosConfig';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import { format } from 'date-fns';

const TransactionForm = () => {
  const [openModal, setOpenModal] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [userDatabase, setUserDatabase] = useState('');
  const [loading, setLoading] = useState(true);
  const { addMessage } = useUserMessageContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    fetchUserProfile();
  }, []);

  useEffect(() => {
    if (userDatabase) {
      fetchAccounts(userDatabase);
      fetchTransactions(userDatabase);
    }
  }, [userDatabase]);

  const fetchUserProfile = async () => {
    try {
      const response = await useApi.get('/api/profile/');
      setUserDatabase(response.data.database_name);
      logger.log('User profile:', response.data);
    } catch (error) {
      logger.error('Error fetching user profile:', error);
      addMessage('error', 'Failed to fetch user profile');
    }
  };

  const fetchAccounts = async (database_name) => {
    try {
      const response = await useApi.get('/api/accounts/', {
        params: { database: database_name },
      });
      setAccounts(response.data);
    } catch (error) {
      logger.error('Error fetching accounts:', error);
      addMessage('error', 'Failed to fetch accounts');
    }
  };

  const fetchTransactions = async (database_name) => {
    setLoading(true);
    try {
      const response = await useApi.get('/api/transactions/', {
        params: { database: database_name },
      });
      setTransactions(response.data);
    } catch (error) {
      logger.error('Error fetching transactions:', error);
      addMessage('error', 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (modalName) => setOpenModal(modalName);
  const handleCloseModal = () => setOpenModal(null);

  const renderModal = () => {
    const modalStyle = {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: isMobile ? '90%' : 400,
      bgcolor: 'background.paper',
      boxShadow: 24,
      p: 4,
      borderRadius: 2,
    };

    switch (openModal) {
      case 'sales':
        return (
          <Modal open={true} onClose={handleCloseModal}>
            <Box sx={modalStyle}>
              <Typography variant="h6" component="h2" gutterBottom>
                Create Sale
              </Typography>
              <SalesForm onClose={handleCloseModal} accounts={accounts} />
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
              <RefundForm onClose={handleCloseModal} accounts={accounts} />
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
              <AddIncomeForm onClose={handleCloseModal} accounts={accounts} />
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
              <AddExpenseForm onClose={handleCloseModal} accounts={accounts} />
            </Box>
          </Modal>
        );
      default:
        return null;
    }
  };

  return (
    <Box sx={{ backgroundColor: theme.palette.background.default, p: 3, borderRadius: 2 }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 3, 
          backgroundColor: theme.palette.background.paper,
          borderRadius: 2,
          mb: 3
        }}
      >
        <Box display="flex" alignItems="center" mb={2}>
          <AccountBalanceIcon sx={{ fontSize: 40, color: theme.palette.primary.main, mr: 2 }} />
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Transactions
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Manage your financial activities with ease
            </Typography>
          </Box>
        </Box>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Tooltip title="Create a new sale">
              <Button
                variant="contained"
                color="primary"
                fullWidth
                startIcon={<PointOfSaleIcon />}
                onClick={() => handleOpenModal('sales')}
                sx={{ py: 2 }}
              >
                Create Sale
              </Button>
            </Tooltip>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Tooltip title="Process a refund">
              <Button
                variant="contained"
                color="secondary"
                fullWidth
                startIcon={<AssignmentReturnIcon />}
                onClick={() => handleOpenModal('refund')}
                sx={{ py: 2 }}
              >
                Create Refund
              </Button>
            </Tooltip>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Tooltip title="Record income">
              <Button
                variant="contained"
                color="success"
                fullWidth
                startIcon={<AddIcon />}
                onClick={() => handleOpenModal('income')}
                sx={{ py: 2 }}
              >
                Add Income
              </Button>
            </Tooltip>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Tooltip title="Record expense">
              <Button
                variant="contained"
                color="error"
                fullWidth
                startIcon={<RemoveIcon />}
                onClick={() => handleOpenModal('expense')}
                sx={{ py: 2 }}
              >
                Add Expense
              </Button>
            </Tooltip>
          </Grid>
        </Grid>
      </Paper>

      {/* Recent Transactions Section */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: 3, 
          backgroundColor: theme.palette.background.paper,
          borderRadius: 2
        }}
      >
        <Typography variant="h5" gutterBottom>
          Recent Transactions
        </Typography>
        {loading ? (
          <Box display="flex" justifyContent="center" m={3}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Type</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.slice(0, 10).map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{format(new Date(transaction.date), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell>{transaction.amount.toFixed(2)}</TableCell>
                    <TableCell>{transaction.type}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {renderModal()}
    </Box>
  );
};

export default TransactionForm;