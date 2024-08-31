import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Button, TextField, Select, MenuItem, FormControl, 
  InputLabel, IconButton, Toolbar, InputAdornment, Drawer, List, ListItem, 
  ListItemText, Checkbox
} from '@mui/material';
import { 
  Add, FilterList, Search, Edit, Delete, ImportExport, Settings
} from '@mui/icons-material';
import axiosInstance from '../components/axiosConfig';

const ChartOfAccountsManagement = () => {
  const [accounts, setAccounts] = useState([]);
  const [newAccount, setNewAccount] = useState({
    account_number: '',
    name: '',
    description: '',
    category: '',
    balance: 0,
    is_active: true,
    parent: null
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [filters, setFilters] = useState({
    accountTypes: [],
    status: 'all',
    dateRange: { start: null, end: null }
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await axiosInstance.get('/api/chart-of-accounts/');
      console.log('Accounts API Response:', response.data);
      setAccounts(response.data);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewAccount({ ...newAccount, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.post('/api/chart-of-accounts/', newAccount);
      fetchAccounts();
      setNewAccount({
        account_number: '',
        name: '',
        description: '',
        category: '',
        balance: 0,
        is_active: true,
        parent: null
      });
    } catch (error) {
      console.error('Error creating account:', error);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const toggleFilterDrawer = () => {
    setFilterDrawerOpen(!filterDrawerOpen);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters({ ...filters, [filterType]: value });
  };

  const filteredAccounts = accounts ? accounts.filter(account => 
    (account.name && account.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (account.account_number && account.account_number.includes(searchTerm))
  ) : [];

  console.log('Rendering accounts:', filteredAccounts);

  return (
    <Box>
      <Toolbar>
        <Typography variant="h4" component="div" sx={{ flexGrow: 1 }}>
          Chart of Accounts
        </Typography>
        <Button startIcon={<Add />} variant="contained" color="primary" onClick={handleSubmit}>
          Add New Account
        </Button>
        <Button startIcon={<ImportExport />} sx={{ ml: 1 }}>
          Export/Import
        </Button>
        <Button startIcon={<Settings />} sx={{ ml: 1 }}>
          Settings
        </Button>
      </Toolbar>

      <Toolbar>
        <TextField
          label="Search accounts"
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={handleSearch}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
        />
        <IconButton onClick={toggleFilterDrawer} sx={{ ml: 1 }}>
          <FilterList />
        </IconButton>
      </Toolbar>

      <Drawer anchor="left" open={filterDrawerOpen} onClose={toggleFilterDrawer}>
        <Box sx={{ width: 250 }} role="presentation">
          <List>
            <ListItem>
              <Typography variant="h6">Filters</Typography>
            </ListItem>
            <ListItem>
              <FormControl fullWidth>
                <InputLabel>Account Type</InputLabel>
                <Select
                  multiple
                  value={filters.accountTypes}
                  onChange={(e) => handleFilterChange('accountTypes', e.target.value)}
                  renderValue={(selected) => selected.join(', ')}
                >
                  <MenuItem value="Asset">
                    <Checkbox checked={filters.accountTypes.indexOf('Asset') > -1} />
                    <ListItemText primary="Asset" />
                  </MenuItem>
                  <MenuItem value="Liability">
                    <Checkbox checked={filters.accountTypes.indexOf('Liability') > -1} />
                    <ListItemText primary="Liability" />
                  </MenuItem>
                </Select>
              </FormControl>
            </ListItem>
            <ListItem>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </ListItem>
          </List>
        </Box>
      </Drawer>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Account Number</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Balance</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAccounts.length > 0 ? (
              filteredAccounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>{account.account_number}</TableCell>
                  <TableCell>{account.name}</TableCell>
                  <TableCell>{account.category_name}</TableCell>
                  <TableCell>{account.balance}</TableCell>
                  <TableCell>{account.is_active ? 'Active' : 'Inactive'}</TableCell>
                  <TableCell>
                    <IconButton size="small"><Edit /></IconButton>
                    <IconButton size="small"><Delete /></IconButton>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No accounts found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper' }}>
        <Typography variant="h6">Account Summary</Typography>
        <Typography>Total Accounts: {accounts.length}</Typography>
        <Typography>Active Accounts: {accounts.filter(a => a.is_active).length}</Typography>
      </Box>
    </Box>
  );
};

export default ChartOfAccountsManagement;