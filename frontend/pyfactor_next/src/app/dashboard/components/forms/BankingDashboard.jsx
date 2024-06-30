import React, { useState, useEffect } from 'react';
import { Button, Typography, Box, List, ListItem, ListItemText, CircularProgress } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';

const BankingDashboard = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch banking accounts from your API
    fetchBankingAccounts();
  }, []);

  const fetchBankingAccounts = async () => {
    setLoading(true);
    try {
      // Replace this with your actual API call
      const response = await fetch('/api/banking/accounts');
      const data = await response.json();
      setAccounts(data);
    } catch (error) {
      console.error('Error fetching banking accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetupBankLink = () => {
    // Implement bank account linking logic here
    console.log('Setting up bank link...');
  };

  const handleViewTransactions = (accountId) => {
    // Implement view transactions logic here
    console.log('Viewing transactions for account:', accountId);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Banking Dashboard
      </Typography>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={handleSetupBankLink}
        sx={{ mb: 3 }}
      >
        Set Up Bank Account Link
      </Button>
      {loading ? (
        <CircularProgress />
      ) : (
        <List>
          {accounts.map((account) => (
            <ListItem
              key={account.id}
              secondaryAction={
                <Button
                  startIcon={<VisibilityIcon />}
                  onClick={() => handleViewTransactions(account.id)}
                >
                  View Transactions
                </Button>
              }
            >
              <ListItemText
                primary={account.bank_name}
                secondary={`Account: ${account.account_number} | Balance: $${account.balance}`}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};

export default BankingDashboard;