import React, { useState, useEffect } from 'react';
import { Box, Button, Modal, Typography, List, ListItem, ListItemText } from '@mui/material';
import AddIncomeForm from './AddIncomeForm';
import AddExpenseForm from './AddExpenseForm';
import axiosInstance from './axiosConfig';
import { logger } from '@/utils/logger';
import { useUserMessageContext } from '@/contexts/UserMessageContext';


const TransactionForm = () => {
  const [openAddIncomeModal, setOpenAddIncomeModal] = useState(false);
  const [openAddExpenseModal, setOpenAddExpenseModal] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [userDatabase, setUserDatabase] = useState('');
  const { addMessage } = useUserMessageContext();

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
      const response = await axiosInstance.get('http://localhost:8000/api/profile/');
      setUserDatabase(response.data.database_name);
      logger.log('User profile:', response.data);
      logger.log('User database:', response.data.database_name);
    } catch (error) {
      logger.error('Error fetching user profile:', error);
    }
  };

  const fetchAccounts = async (database_name) => {
    try {
      logger.log('Fetching accounts from database:', database_name);
      const response = await axiosInstance.get('http://localhost:8000/api/accounts/', {
        params: { database: database_name },
      });
      logger.log('Fetched accounts:', response.data);
      setAccounts(response.data);
    } catch (error) {
      logger.error('Error fetching accounts:', error);
    }
  };

  const fetchTransactions = async (database_name) => {
    try {
      logger.log('Fetching transactions from database:', database_name);
      const response = await axiosInstance.get('http://localhost:8000/api/transactions/', {
        params: { database: database_name },
      });
      logger.log('Fetched transactions:', response.data);
      setTransactions(response.data);
    } catch (error) {
      logger.error('Error fetching transactions:', error);
      addMessage('error', 'Error fetching transactions');
    }
  };

  const handleOpenAddIncomeModal = () => {
    setOpenAddIncomeModal(true);
  };

  const handleCloseAddIncomeModal = () => {
    setOpenAddIncomeModal(false);
  };

  const handleOpenAddExpenseModal = () => {
    setOpenAddExpenseModal(true);
  };

  const handleCloseAddExpenseModal = () => {
    setOpenAddExpenseModal(false);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="flex-end" mb={2}>
        <Button variant="contained" color="primary" sx={{ mr: 1 }} onClick={handleOpenAddIncomeModal}>
          Add Income
        </Button>
        <Button variant="contained" color="primary" sx={{ mr: 1 }} onClick={handleOpenAddExpenseModal}>
          Add Expense
        </Button>
        <Button variant="contained" color="primary" sx={{ mr: 1 }}>
          Add Journal Entry
        </Button>
        <Button variant="contained" color="primary" sx={{ mr: 1 }}>
          Upload Bank Statement
        </Button>
        <Button variant="contained" color="primary">
          Scan Receipt
        </Button>
      </Box>



      {/* Add Income Modal */}
      <Modal
        open={openAddIncomeModal}
        onClose={handleCloseAddIncomeModal}
        aria-labelledby="add-income-modal-title"
        aria-describedby="add-income-modal-description"
      >
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 400,
            bgcolor: 'background.paper',
            boxShadow: 24,
            p: 4,
          }}
        >
          <Typography id="add-income-modal-title" variant="h6" component="h2">
            Add Income
          </Typography>
          <AddIncomeForm onClose={handleCloseAddIncomeModal} accounts={accounts} />
        </Box>
      </Modal>

      {/* Add Expense Modal */}
      <Modal
        open={openAddExpenseModal}
        onClose={handleCloseAddExpenseModal}
        aria-labelledby="add-expense-modal-title"
        aria-describedby="add-expense-modal-description"
      >
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 400,
            bgcolor: 'background.paper',
            boxShadow: 24,
            p: 4,
          }}
        >
          <Typography id="add-expense-modal-title" variant="h6" component="h2">
            Add Expense
          </Typography>
          <AddExpenseForm onClose={handleCloseAddExpenseModal} accounts={accounts} />
        </Box>
      </Modal>
    </Box>
  );
};

export default TransactionForm;