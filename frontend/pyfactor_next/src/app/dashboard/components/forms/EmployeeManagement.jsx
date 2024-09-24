import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  Grid,
  IconButton,
  InputAdornment,
  LinearProgress,
  Alert,
  Snackbar,


} from '@mui/material';
import { styled } from '@mui/material/styles';
import { countries } from 'countries-list';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import axiosInstance from '../components/axiosConfig';
import { format, parseISO } from 'date-fns'; // Add this import

const EmployeeManagement = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [payrollProgress, setPayrollProgress] = useState(10);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });


  const [newEmployee, setNewEmployee] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    dob: null,
    gender: '',
    marital_status: '',
    nationality: '',
    street: '',
    postcode: '',
    city: '',
    country: '',
    email: '',
    security_number_type: 'SSN',
    security_number: '',
    invite_to_onboard: false,
    date_joined: null,
    wage_type: 'salary',
    salary: '',
    wage_rate: '',
    direct_deposit: false,
    department: '',
    job_title: '',
  });


  const countryList = Object.entries(countries).map(([code, country]) => ({
    code,
    name: country.name,
  }));

  const getSecurityNumberType = (countryCode) => {
    switch (countryCode) {
      case 'US':
        return 'SSN';
      case 'UK':
        return 'NIN';
      case 'CA':
        return 'SIN';
      // Add more countries and their respective security number types
      default:
        return 'Other';
    }
  };


  useEffect(() => {
    fetchEmployees();
  }, []);

  // Custom styled LinearProgress
  const GreenLinearProgress = styled(LinearProgress)(({ theme }) => ({
    height: 10,
    borderRadius: 5,
    [`&.MuiLinearProgress-colorPrimary`]: {
      backgroundColor: theme.palette.grey[300],
    },
    [`& .MuiLinearProgress-bar`]: {
        borderRadius: 5,
        backgroundColor: '#4caf50', // green color
      },
  }));

  const fetchEmployees = async () => {
    try {
      const response = await axiosInstance.get(`/api/hr/employees/?q=${searchQuery}`);
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    if (name === 'country') {
      const securityNumberType = getSecurityNumberType(value);
      setNewEmployee(prev => ({
        ...prev,
        [name]: value,
        security_number_type: securityNumberType,
      }));
    } else {
      setNewEmployee(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleDateChange = (name, date) => {
    setNewEmployee(prev => ({
      ...prev,
      [name]: date
    }));
  };

  const formatDate = (date) => {
    if (!date) return null;
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    return format(parsedDate, 'yyyy-MM-dd');
  };


  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    setSnackbar({ open: false, message: '', severity: 'success' });
    try {
      const formattedEmployee = {
        ...newEmployee,
        dob: formatDate(newEmployee.dob),
        date_joined: formatDate(newEmployee.date_joined),
      };
  
      console.log('Sending employee data:', formattedEmployee);
      const response = await axiosInstance.post('/api/hr/employees/create/', formattedEmployee);
      console.log('Employee created:', response.data);
      
      fetchEmployees();
      setActiveTab(2);
      setPayrollProgress(20); // Increase progress when employee is added
      setSnackbar({ open: true, message: 'Employee created successfully', severity: 'success' });
      
      // Reset the form
      setNewEmployee({
        first_name: '',
        middle_name: '',
        last_name: '',
        email: '',
        dob: null,
        gender: '',
        marital_status: '',
        nationality: '',
        street: '',
        postcode: '',
        city: '',
        country: '',
        security_number_type: 'SSN',
        security_number: '',
        invite_to_onboard: false,
        date_joined: null,
        wage_type: 'salary',
        salary: '',
        wage_rate: '',
        direct_deposit: false,
        department: '',
        job_title: '',
      });
    } catch (error) {
      console.error('Error creating employee:', error);
      let errorMessage = 'Failed to create employee. Please try again.';
      if (error.response && error.response.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (typeof error.response.data === 'object') {
          errorMessage = Object.entries(error.response.data)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ');
        }
      }
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    }
  };

  const handleEmployeeSelect = (employee) => {
    setSelectedEmployee(employee);
    setActiveTab(1);
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleSearch = () => {
    fetchEmployees();
  };

  const validateForm = () => {
    const requiredFields = ['first_name', 'last_name', 'email', 'dob', 'date_joined', 'email'];
    const missingFields = requiredFields.filter(field => !newEmployee[field]);
    if (missingFields.length > 0) {
      setSnackbar({ 
        open: true, 
        message: `Please fill in the following required fields: ${missingFields.join(', ')}`, 
        severity: 'error' 
      });
      return false;
    }
    return true;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ flexGrow: 1, bgcolor: 'background.paper' }}>
      <Box sx={{ position: 'relative', mt: 2, mb: 2 }}>
  {/* Progress Bar Section */}
  <Box sx={{ width: '50%' }}>
    <GreenLinearProgress variant="determinate" value={payrollProgress} />
  </Box>
  <Typography variant="body2" color="text.secondary" align="left" sx={{ mt: 1 }}>
    Payroll setup {payrollProgress}% completed
  </Typography>

  {/* Image Section */}
  <Box sx={{ position: 'absolute', right: 0, top: 0 }}>
    <img
      src="/static/images/good4.png"
      alt="Good icon"
      style={{ width: 100, height: 100, // Adjust the size as needed
      borderRadius: '50%', // If the image is circular
      imageRendering: 'auto', // For smooth scaling
      objectFit: 'contain', // Adjust how the image fits in the space
    }}
  />
</Box>
</Box>

        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              color: 'blue',
              opacity: 0.7,
              '&.Mui-selected': {
                color: 'blue',
                opacity: 1,
              },
            },
          }}
        >
          <Tab label="Add Employee" />
          <Tab label="Employee Details" />
          <Tab label="View Employees" />
        </Tabs>
  
        <Box sx={{ flexGrow: 1, mt: 2, overflow: 'auto' }}>
          {activeTab === 0 && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PersonAddIcon sx={{ fontSize: 30, mr: 1, color: '#000080' }} />
                <Typography variant="h5" gutterBottom sx={{ mb: 0 }}>
                  Add Employee
                </Typography>
              </Box>
              <Typography variant="h8" gutterBottom sx={{ mb: 0 }}>Add basic information about the employee.</Typography>

              <form onSubmit={handleCreateEmployee}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Paper elevation={3} sx={{ p: 3 }}>
                      <Typography variant="h6" gutterBottom>Personal Information</Typography>
                      <TextField label="First Name" name="first_name" value={newEmployee.first_name} onChange={handleInputChange} fullWidth margin="normal" />
                      <TextField label="Middle Name" name="middle_name" value={newEmployee.middle_name} onChange={handleInputChange} fullWidth margin="normal" />
                      <TextField label="Last Name" name="last_name" value={newEmployee.last_name} onChange={handleInputChange} fullWidth margin="normal" />
                      <TextField 
                            label="Email" 
                            name="email" 
                            type="email"
                            value={newEmployee.email} 
                            onChange={handleInputChange} 
                            fullWidth 
                            margin="normal" 
                            required
                          />
                      <DatePicker
                        label="Date of Birth"
                        value={newEmployee.dob}
                        onChange={(date) => handleDateChange('dob', date)}
                        renderInput={(params) => <TextField {...params} fullWidth margin="normal" />}
                      />
                      <TextField
                        select
                        label="Gender"
                        name="gender"
                        value={newEmployee.gender}
                        onChange={handleInputChange}
                        fullWidth
                        margin="normal"
                      >
                        <MenuItem value="M">Male</MenuItem>
                        <MenuItem value="F">Female</MenuItem>
                        <MenuItem value="O">Other</MenuItem>
                        <MenuItem value="N">Prefer not to say</MenuItem>
                      </TextField>
                      <TextField
                        select
                        label="Marital Status"
                        name="marital_status"
                        value={newEmployee.marital_status}
                        onChange={handleInputChange}
                        fullWidth
                        margin="normal"
                      >
                        <MenuItem value="S">Single</MenuItem>
                        <MenuItem value="M">Married</MenuItem>
                        <MenuItem value="D">Divorced</MenuItem>
                        <MenuItem value="W">Widowed</MenuItem>
                      </TextField>
                      <TextField label="Nationality" name="nationality" value={newEmployee.nationality} onChange={handleInputChange} fullWidth margin="normal" />
                      <TextField label="Street" name="street" value={newEmployee.street} onChange={handleInputChange} fullWidth margin="normal" />
                      <TextField label="Postcode" name="postcode" value={newEmployee.postcode} onChange={handleInputChange} fullWidth margin="normal" />
                      <TextField label="City" name="city" value={newEmployee.city} onChange={handleInputChange} fullWidth margin="normal" />
                      <TextField label="Country" name="country" value={newEmployee.country} onChange={handleInputChange} fullWidth margin="normal" />
                      <TextField
                        select
                        label="Security Number Type"
                        name="security_number_type"
                        value={newEmployee.security_number_type}
                        onChange={handleInputChange}
                        fullWidth
                        margin="normal"
                      >
                        <MenuItem value="SSN">Social Security Number (US)</MenuItem>
                        <MenuItem value="NIN">National Insurance Number (UK)</MenuItem>
                        {/* Add other options as needed */}
                      </TextField>
                      <TextField label="Security Number" name="security_number" value={newEmployee.security_number} onChange={handleInputChange} fullWidth margin="normal" />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={newEmployee.invite_to_onboard}
                            onChange={(e) => setNewEmployee(prev => ({ ...prev, invite_to_onboard: e.target.checked }))}
                            name="invite_to_onboard"
                          />
                        }
                        label="Invite employee to onboard and enter their information"
                      />
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Paper elevation={3} sx={{ p: 3 }}>
                      <Typography variant="h6" gutterBottom>Work Information</Typography>
                      <DatePicker
                        label="Start Date"
                        value={newEmployee.date_joined}
                        onChange={(date) => handleDateChange('date_joined', date)}
                        renderInput={(params) => <TextField {...params} fullWidth margin="normal" />}
                      />
                      <TextField
                        select
                        label="Wage Type"
                        name="wage_type"
                        value={newEmployee.wage_type}
                        onChange={handleInputChange}
                        fullWidth
                        margin="normal"
                      >
                        <MenuItem value="salary">Salary</MenuItem>
                        <MenuItem value="wage">Wage</MenuItem>
                      </TextField>
                      {newEmployee.wage_type === 'salary' ? (
                        <TextField label="Salary" name="salary" type="number" value={newEmployee.salary} onChange={handleInputChange} fullWidth margin="normal" />
                      ) : (
                        <TextField label="Wage Rate per Hour" name="wage_rate" type="number" value={newEmployee.wage_rate} onChange={handleInputChange} fullWidth margin="normal" />
                      )}
                      <FormControlLabel
                        control={
                          <Switch
                            checked={newEmployee.direct_deposit}
                            onChange={(e) => setNewEmployee(prev => ({ ...prev, direct_deposit: e.target.checked }))}
                            name="direct_deposit"
                          />
                        }
                        label="Direct Deposit"
                      />
                      <TextField label="Department" name="department" value={newEmployee.department} onChange={handleInputChange} fullWidth margin="normal" />
                      <TextField label="Job Title" name="job_title" value={newEmployee.job_title} onChange={handleInputChange} fullWidth margin="normal" />
                    </Paper>
                  </Grid>
                </Grid>
                <Button 
                  type="submit" 
                  variant="contained" 
                  color="primary" 
                  sx={{ mt: 3 }}
                  disabled={!newEmployee.first_name || !newEmployee.last_name || !newEmployee.email || !newEmployee.dob || !newEmployee.date_joined}
                >
                  Add Employee
                </Button>
              </form>
            </Box>
          )}
          {activeTab === 1 && (
            <Box>
              <Typography variant="h4" gutterBottom>Employee Details</Typography>
              {selectedEmployee && (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Paper elevation={3} sx={{ p: 3 }}>
                      <Typography variant="h6" gutterBottom>Personal Information</Typography>
                      <TextField label="Employee Number" value={selectedEmployee.employee_number} fullWidth margin="normal" disabled />
                      <TextField label="First Name" value={selectedEmployee.first_name} fullWidth margin="normal" />
                      <TextField label="Middle Name" value={selectedEmployee.middle_name} fullWidth margin="normal" />
                      <TextField label="Last Name" value={selectedEmployee.last_name} fullWidth margin="normal" />
                      <TextField label="Date of Birth" value={new Date(selectedEmployee.dob).toLocaleDateString()} fullWidth margin="normal" />
                      <TextField 
                              label="Email" 
                              name="email" 
                              type="email"
                              value={newEmployee.email} 
                              onChange={handleInputChange} 
                              fullWidth 
                              margin="normal" 
                              required
                            />
                      <TextField label="Gender" value={selectedEmployee.gender} fullWidth margin="normal" />
                      <TextField label="Marital Status" value={selectedEmployee.marital_status} fullWidth margin="normal" />
                      <TextField label="Nationality" value={selectedEmployee.nationality} fullWidth margin="normal" />
                      <TextField label="Security Number Type" value={selectedEmployee.security_number_type} fullWidth margin="normal" />
                      <TextField label="Security Number" value={selectedEmployee.security_number} fullWidth margin="normal" />
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Paper elevation={3} sx={{ p: 3 }}>
                      <Typography variant="h6" gutterBottom>Work Information</Typography>
                      <TextField label="Job Title" value={selectedEmployee.job_title} fullWidth margin="normal" />
                      <TextField label="Department" value={selectedEmployee.department} fullWidth margin="normal" />
                      <TextField label="Date Joined" value={new Date(selectedEmployee.date_joined).toLocaleDateString()} fullWidth margin="normal" />
                      <TextField label="Wage Type" value={selectedEmployee.wage_type} fullWidth margin="normal" />
                      {selectedEmployee.wage_type === 'salary' ? (
                        <TextField label="Salary" value={selectedEmployee.salary} fullWidth margin="normal" />
                      ) : (
                        <TextField label="Wage Rate" value={selectedEmployee.wage_rate} fullWidth margin="normal" />
                      )}
                      <FormControlLabel
                        control={<Switch checked={selectedEmployee.direct_deposit} />}
                        label="Direct Deposit"
                      />
                    </Paper>
                  </Grid>
                </Grid>
              )}
            </Box>
          )}
          {activeTab === 2 && (
            <Box>
              <Typography variant="h4" gutterBottom>View Employees</Typography>
              <TextField
                fullWidth
                variant="outlined"
                placeholder="Search employees..."
                value={searchQuery}
                onChange={handleSearchChange}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={handleSearch}>
                        <SearchIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Employee Number</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Job Title</TableCell>
                      <TableCell>Department</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {employees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell>{employee.employee_number}</TableCell>
                        <TableCell>{`${employee.first_name} ${employee.last_name}`}</TableCell>
                        <TableCell>{employee.job_title}</TableCell>
                        <TableCell>{employee.department}</TableCell>
                        <TableCell>
                          <IconButton onClick={() => handleEmployeeSelect(employee)}>
                            <EditIcon />
                          </IconButton>
                          <IconButton>
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Box>
      </Box>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </LocalizationProvider>
  );
};

export default EmployeeManagement;