import React, { useState, useEffect } from 'react';
import {
  Tabs, Tab, Box, Typography, Button,
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, TextField,
  Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import { Pie, Bar } from 'react-chartjs-2';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import axiosInstance from '@/lib/axiosConfig';;
import { useUserMessageContext } from '@/contexts/UserMessageContext';


function TabPanel(props) {
  const { children, value, index, ...other } = props;

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

const CostAccountingManagement = () => {
  const [value, setValue] = useState(0);
  const [costEntries, setCostEntries] = useState([]);
  const [costCategories, setCostCategories] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [formData, setFormData] = useState({
    description: '',
    category: '',
    cost_type: '',
    cost_nature: '',
    amount: '',
    date: '',
    department: '',
    project: '',
    cost_driver: '',
    job_process_id: '',
    budgeted_amount: '',
    notes: '',
    allocations: []
  });

  useEffect(() => {
    fetchCostEntries();
    fetchCostCategories();
  }, []);

  const fetchCostEntries = async () => {
    try {
      const response = await axiosInstance.get('/api/finance/cost-entries/');
      setCostEntries(response.data);
    } catch (error) {
      console.error('Error fetching cost entries:', error);
    }
  };

  const fetchCostCategories = async () => {
    try {
      const response = await axiosInstance.get('/api/finance/cost-categories/');
      setCostCategories(response.data);
    } catch (error) {
      console.error('Error fetching cost categories:', error);
    }
  };

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAllocationChange = (index, field, value) => {
    const updatedAllocations = [...formData.allocations];
    updatedAllocations[index] = { ...updatedAllocations[index], [field]: value };
    setFormData({ ...formData, allocations: updatedAllocations });
  };

  const handleAddAllocation = () => {
    setFormData({
      ...formData,
      allocations: [...formData.allocations, { allocation_base: '', allocation_percentage: '', allocated_amount: '' }]
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedEntry) {
        await axiosInstance.put(`/api/finance/cost-entries/${selectedEntry.cost_id}/`, formData);
      } else {
        await axiosInstance.post('/api/finance/cost-entries/', formData);
      }
      fetchCostEntries();
      setFormData({
        description: '',
        category: '',
        cost_type: '',
        cost_nature: '',
        amount: '',
        date: '',
        department: '',
        project: '',
        cost_driver: '',
        job_process_id: '',
        budgeted_amount: '',
        notes: '',
        allocations: []
      });
      setSelectedEntry(null);
      setValue(1); // Switch to the List tab
    } catch (error) {
      console.error('Error saving cost entry:', error);
    }
  };

  const handleEdit = (entry) => {
    setSelectedEntry(entry);
    setFormData(entry);
    setValue(0); // Switch to the Create/Edit tab
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this cost entry?')) {
      try {
        await axiosInstance.delete(`/api/finance/cost-entries/${id}/`);
        fetchCostEntries();
      } catch (error) {
        console.error('Error deleting cost entry:', error);
      }
    }
  };

  const renderCostBreakdownChart = () => {
    const data = {
      labels: ['Direct Costs', 'Indirect Costs'],
      datasets: [
        {
          data: [
            costEntries.filter(entry => entry.cost_type === 'direct').reduce((sum, entry) => sum + parseFloat(entry.amount), 0),
            costEntries.filter(entry => entry.cost_type === 'indirect').reduce((sum, entry) => sum + parseFloat(entry.amount), 0)
          ],
          backgroundColor: ['#FF6384', '#36A2EB'],
          hoverBackgroundColor: ['#FF6384', '#36A2EB']
        }
      ]
    };

    return <Pie data={data} />;
  };

  const renderCostVarianceChart = () => {
    const data = {
      labels: costEntries.map(entry => entry.description),
      datasets: [
        {
          label: 'Actual Cost',
          data: costEntries.map(entry => entry.amount),
          backgroundColor: 'rgba(255, 99, 132, 0.5)',
        },
        {
          label: 'Budgeted Cost',
          data: costEntries.map(entry => entry.budgeted_amount),
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
        }
      ]
    };

    const options = {
      scales: {
        y: {
          beginAtZero: true
        }
      }
    };

    return <Bar data={data} options={options} />;
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="cost accounting management tabs">
          <Tab label="Create/Edit Cost Entry" />
          <Tab label="Cost Entry List" />
          <Tab label="Cost Analysis" />
          <Tab label="Cost Allocation" />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        <form onSubmit={handleSubmit}>
          <TextField
            name="description"
            label="Description"
            value={formData.description}
            onChange={handleInputChange}
            fullWidth
            margin="normal"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Category</InputLabel>
            <Select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
            >
              {costCategories.map((category) => (
                <MenuItem key={category.id} value={category.id}>{category.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Cost Type</InputLabel>
            <Select
              name="cost_type"
              value={formData.cost_type}
              onChange={handleInputChange}
            >
              <MenuItem value="direct">Direct</MenuItem>
              <MenuItem value="indirect">Indirect</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Cost Nature</InputLabel>
            <Select
              name="cost_nature"
                value={formData.cost_nature}
                onChange={handleInputChange}
              >
                <MenuItem value="fixed">Fixed</MenuItem>
                <MenuItem value="variable">Variable</MenuItem>
              </Select>
            </FormControl>
            <TextField
              name="amount"
              label="Amount"
              type="number"
              value={formData.amount}
              onChange={handleInputChange}
              fullWidth
              margin="normal"
            />
            <TextField
              name="date"
              label="Date"
              type="date"
              value={formData.date}
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
              name="project"
              label="Project"
              value={formData.project}
              onChange={handleInputChange}
              fullWidth
              margin="normal"
            />
            <TextField
              name="cost_driver"
              label="Cost Driver"
              value={formData.cost_driver}
              onChange={handleInputChange}
              fullWidth
              margin="normal"
            />
            <TextField
              name="job_process_id"
              label="Job/Process ID"
              value={formData.job_process_id}
              onChange={handleInputChange}
              fullWidth
              margin="normal"
            />
            <TextField
              name="budgeted_amount"
              label="Budgeted Amount"
              type="number"
              value={formData.budgeted_amount}
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
            <Button type="submit" variant="contained" color="primary">
              {selectedEntry ? 'Update Cost Entry' : 'Create Cost Entry'}
            </Button>
          </form>
        </TabPanel>
        <TabPanel value={value} index={1}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Description</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Cost Type</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {costEntries.map((entry) => (
                  <TableRow key={entry.cost_id}>
                    <TableCell>{entry.description}</TableCell>
                    <TableCell>{costCategories.find(cat => cat.id === entry.category)?.name}</TableCell>
                    <TableCell>{entry.cost_type}</TableCell>
                    <TableCell>${entry.amount}</TableCell>
                    <TableCell>{entry.date}</TableCell>
                    <TableCell>
                      <Button onClick={() => handleEdit(entry)}>Edit</Button>
                      <Button onClick={() => handleDelete(entry.cost_id)}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
        <TabPanel value={value} index={2}>
          <Typography variant="h6" gutterBottom>Cost Breakdown</Typography>
          {renderCostBreakdownChart()}
          <Typography variant="h6" gutterBottom>Cost Variance Analysis</Typography>
          {renderCostVarianceChart()}
        </TabPanel>
        <TabPanel value={value} index={3}>
          <Typography variant="h6" gutterBottom>Cost Allocation</Typography>
          {formData.allocations.map((allocation, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                label="Allocation Base"
                value={allocation.allocation_base}
                onChange={(e) => handleAllocationChange(index, 'allocation_base', e.target.value)}
              />
              <TextField
                label="Allocation Percentage"
                type="number"
                value={allocation.allocation_percentage}
                onChange={(e) => handleAllocationChange(index, 'allocation_percentage', e.target.value)}
              />
              <TextField
                label="Allocated Amount"
                type="number"
                value={allocation.allocated_amount}
                onChange={(e) => handleAllocationChange(index, 'allocated_amount', e.target.value)}
              />
            </Box>
          ))}
          <Button onClick={handleAddAllocation} variant="outlined">
            Add Allocation
          </Button>
        </TabPanel>
      </Box>
    );
  };
  
  export default CostAccountingManagement;