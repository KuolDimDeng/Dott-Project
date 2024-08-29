// EmployeeManagement.jsx

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
  Chip,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import axiosInstance from '../components/axiosConfig';

const EmployeeManagement = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [roles, setRoles] = useState([]);
  const [newEmployee, setNewEmployee] = useState({
    first_name: '',
    last_name: '',
    dob: null,
    street: '',
    postcode: '',
    city: '',
    country: '',
    date_joined: null,
    last_work_date: null,
    active: true,
    role: '',
    site_access_privileges: '',
    email: '',
    phone_number: '',
    department: '',
    salary: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    roles: [],
  });

  useEffect(() => {
    fetchEmployees();
    fetchRoles();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await axiosInstance.get('/api/employees/');
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await axiosInstance.get('/api/roles/');
      setRoles(response.data);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setNewEmployee(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateChange = (name, date) => {
    setNewEmployee(prev => ({
      ...prev,
      [name]: date
    }));
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    try {
      const response = await axiosInstance.post('/api/employees/create/', newEmployee);
      console.log('Employee created:', response.data);
      fetchEmployees();
      setActiveTab(2);
    } catch (error) {
      console.error('Error creating employee:', error);
    }
  };

  const handleEmployeeSelect = (employee) => {
    setSelectedEmployee(employee);
    setActiveTab(1);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Typography variant="h4" gutterBottom>
          Employee Management
        </Typography>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Create" />
          <Tab label="Details" />
          <Tab label="List" />
        </Tabs>

        {activeTab === 0 && (
          <Box mt={3}>
            <Typography variant="h6" gutterBottom>Create Employee</Typography>
            <form onSubmit={handleCreateEmployee}>
              <TextField
                label="First Name"
                name="first_name"
                value={newEmployee.first_name}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Last Name"
                name="last_name"
                value={newEmployee.last_name}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              />
              <DatePicker
                label="Date of Birth"
                value={newEmployee.dob}
                onChange={(date) => handleDateChange('dob', date)}
                renderInput={(params) => <TextField {...params} fullWidth margin="normal" />}
              />
              <TextField
                label="Street"
                name="street"
                value={newEmployee.street}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Postcode"
                name="postcode"
                value={newEmployee.postcode}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              />
              <TextField
                label="City"
                name="city"
                value={newEmployee.city}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Country"
                name="country"
                value={newEmployee.country}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              />
              <DatePicker
                label="Date Joined"
                value={newEmployee.date_joined}
                onChange={(date) => handleDateChange('date_joined', date)}
                renderInput={(params) => <TextField {...params} fullWidth margin="normal" />}
              />
              <TextField
                label="Role"
                name="role"
                value={newEmployee.role}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Site Access Privileges"
                name="site_access_privileges"
                value={newEmployee.site_access_privileges}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                multiline
                rows={4}
              />
              <TextField
                label="Email"
                name="email"
                type="email"
                value={newEmployee.email}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Phone Number"
                name="phone_number"
                value={newEmployee.phone_number}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Department"
                name="department"
                value={newEmployee.department}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Salary"
                name="salary"
                type="number"
                value={newEmployee.salary}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Emergency Contact Name"
                name="emergency_contact_name"
                value={newEmployee.emergency_contact_name}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Emergency Contact Phone"
                name="emergency_contact_phone"
                value={newEmployee.emergency_contact_phone}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={newEmployee.active}
                    onChange={(e) => setNewEmployee(prev => ({ ...prev, active: e.target.checked }))}
                    name="active"
                  />
                }
                label="Active"
              />
              <Select
                multiple
                value={newEmployee.roles}
                onChange={(e) => setNewEmployee(prev => ({ ...prev, roles: e.target.value }))}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={roles.find(role => role.id === value)?.name} />
                    ))}
                  </Box>
                )}
                fullWidth
                margin="normal"
              >
                {roles.map((role) => (
                  <MenuItem key={role.id} value={role.id}>
                    {role.name}
                  </MenuItem>
                ))}
              </Select>
              <Button type="submit" variant="contained" color="primary">Create Employee</Button>
            </form>
          </Box>
        )}

        {activeTab === 1 && (
          <Box mt={3}>
            <Typography variant="h6" gutterBottom>Employee Details</Typography>
            {selectedEmployee ? (
              <Box>
                <TextField label="Employee Number" value={selectedEmployee.employee_number} fullWidth margin="normal" disabled />
                <TextField label="First Name" value={selectedEmployee.first_name} fullWidth margin="normal" disabled />
                <TextField label="Last Name" value={selectedEmployee.last_name} fullWidth margin="normal" disabled />
                <TextField label="Date of Birth" value={new Date(selectedEmployee.dob).toLocaleDateString()} fullWidth margin="normal" disabled />
                <TextField label="Street" value={selectedEmployee.street} fullWidth margin="normal" disabled />
                <TextField label="Postcode" value={selectedEmployee.postcode} fullWidth margin="normal" disabled />
                <TextField label="City" value={selectedEmployee.city} fullWidth margin="normal" disabled />
                <TextField label="Country" value={selectedEmployee.country} fullWidth margin="normal" disabled />
                <TextField label="Date Joined" value={new Date(selectedEmployee.date_joined).toLocaleDateString()} fullWidth margin="normal" disabled />
                <TextField label="Role" value={selectedEmployee.role} fullWidth margin="normal" disabled />
                <TextField label="Site Access Privileges" value={selectedEmployee.site_access_privileges} fullWidth margin="normal" disabled multiline rows={4} />
                <TextField label="Email" value={selectedEmployee.email} fullWidth margin="normal" disabled />
                <TextField label="Phone Number" value={selectedEmployee.phone_number} fullWidth margin="normal" disabled />
                <TextField label="Department" value={selectedEmployee.department} fullWidth margin="normal" disabled />
                <TextField label="Salary" value={selectedEmployee.salary} fullWidth margin="normal" disabled />
                <TextField label="Emergency Contact Name" value={selectedEmployee.emergency_contact_name} fullWidth margin="normal" disabled />
                <TextField label="Emergency Contact Phone" value={selectedEmployee.emergency_contact_phone} fullWidth margin="normal" disabled />
                <FormControlLabel
                  control={<Switch checked={selectedEmployee.active} disabled />}
                  label="Active"
                />
                <Box mt={2}>
                  <Typography variant="subtitle1">Roles:</Typography>
                  {selectedEmployee.roles.map((role) => (
                    <Chip key={role.id} label={role.role.name} style={{ margin: '0 4px 4px 0' }} />
                  ))}
                </Box>
              </Box>
            ) : (
              <Typography>Select an employee from the list to view details</Typography>
            )}
          </Box>
        )}

        {activeTab === 2 && (
          <Box mt={3}>
            <Typography variant="h6" gutterBottom>Employee List</Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Employee Number</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Active</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id} onClick={() => handleEmployeeSelect(employee)}>
                      <TableCell>{employee.employee_number}</TableCell>
                      <TableCell>{`${employee.first_name} ${employee.last_name}`}</TableCell>
                      <TableCell>{employee.role}</TableCell>
                      <TableCell>{employee.department}</TableCell>
                      <TableCell>
                        <Switch checked={employee.active} disabled />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default EmployeeManagement;