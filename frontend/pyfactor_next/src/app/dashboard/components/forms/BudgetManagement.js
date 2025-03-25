import React, { useState, useEffect } from 'react';
import {
  Tabs,
  Tab,
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { axiosInstance } from '@/lib/axiosConfig';
import { useToast } from '@/components/Toast/ToastProvider';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  åç;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

const BudgetManagement = () => {
  const [value, setValue] = useState(0);
  const [budgets, setBudgets] = useState([]);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    period: '',
    start_date: '',
    end_date: '',
    department: '',
    notes: '',
    items: [],
  });

  useEffect(() => {
    fetchBudgets();
  }, []);

  const fetchBudgets = async () => {
    try {
      const response = await axiosInstance.get('/api/finance/budgets/');
      setBudgets(response.data);
    } catch (error) {
      console.error('Error fetching budgets:', error);
    }
  };

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setFormData({ ...formData, items: updatedItems });
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { account_code: '', account_name: '', budgeted_amount: 0 }],
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedBudget) {
        await axiosInstance.put(`/api/finance/budgets/${selectedBudget.id}/`, formData);
      } else {
        await axiosInstance.post('/api/finance/budgets/', formData);
      }
      fetchBudgets();
      setFormData({
        name: '',
        period: '',
        start_date: '',
        end_date: '',
        department: '',
        notes: '',
        items: [],
      });
      setSelectedBudget(null);
      setValue(1); // Switch to the List tab
    } catch (error) {
      console.error('Error saving budget:', error);
    }
  };

  const handleEdit = (budget) => {
    setSelectedBudget(budget);
    setFormData(budget);
    setValue(0); // Switch to the Create/Edit tab
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this budget?')) {
      try {
        await axiosInstance.delete(`/api/finance/budgets/${id}/`);
        fetchBudgets();
      } catch (error) {
        console.error('Error deleting budget:', error);
      }
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="budget management tabs">
          <Tab label="Create/Edit Budget" />
          <Tab label="Budget List" />
          <Tab label="Budget Details" />
          <Tab label="Budget vs Actual" />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        <form onSubmit={handleSubmit}>
          <TextField
            name="name"
            label="Budget Name"
            value={formData.name}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Period</InputLabel>
            <Select name="period" value={formData.period} onChange={handleInputChange}>
              <MenuItem value="monthly">Monthly</MenuItem>
              <MenuItem value="quarterly">Quarterly</MenuItem>
              <MenuItem value="annually">Annually</MenuItem>
            </Select>
          </FormControl>
          <TextField
            name="start_date"
            label="Start Date"
            type="date"
            value={formData.start_date}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            name="end_date"
            label="End Date"
            type="date"
            value={formData.end_date}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            name="department"
            label="Department"
            value={formData.department}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
          />
          <TextField
            name="notes"
            label="Notes"
            value={formData.notes}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
            multiline
            rows={4}
          />
          <Typography variant="h6" gutterBottom>
            Budget Items
          </Typography>
          {formData.items.map((item, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                label="Account Code"
                value={item.account_code}
                onChange={(e) => handleItemChange(index, 'account_code', e.target.value)}
              />
              <TextField
                label="Account Name"
                value={item.account_name}
                onChange={(e) => handleItemChange(index, 'account_name', e.target.value)}
              />
              <TextField
                label="Budgeted Amount"
                type="number"
                value={item.budgeted_amount}
                onChange={(e) => handleItemChange(index, 'budgeted_amount', e.target.value)}
              />
            </Box>
          ))}
          <Button variant="outlined" onClick={handleAddItem}>
            Add Budget Item
          </Button>
          <Box sx={{ mt: 2 }}>
            <Button type="submit" variant="contained" color="primary">
              {selectedBudget ? 'Update Budget' : 'Create Budget'}
            </Button>
          </Box>
        </form>
      </TabPanel>
      <TabPanel value={value} index={1}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Period</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>End Date</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {budgets.map((budget) => (
                <TableRow key={budget.id}>
                  <TableCell>{budget.name}</TableCell>
                  <TableCell>{budget.period}</TableCell>
                  <TableCell>{budget.start_date}</TableCell>
                  <TableCell>{budget.end_date}</TableCell>
                  <TableCell>{budget.department}</TableCell>
                  <TableCell>
                    <Button onClick={() => handleEdit(budget)}>Edit</Button>
                    <Button onClick={() => handleDelete(budget.id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>
      <TabPanel value={value} index={2}>
        <Typography>Select a budget from the list to view details.</Typography>
      </TabPanel>
      <TabPanel value={value} index={3}>
        <Typography>Budget vs Actual comparison will be shown here.</Typography>
      </TabPanel>
    </Box>
  );
};

export default BudgetManagement;
