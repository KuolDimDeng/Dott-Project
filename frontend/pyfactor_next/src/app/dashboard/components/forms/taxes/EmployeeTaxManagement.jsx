import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Alert,
  Snackbar,
  FormControlLabel,
  Checkbox,
  Chip,
  Tabs,
  Tab,
  InputAdornment,
  CircularProgress
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { axiosInstance } from '@/lib/axiosConfig';

const EmployeeTaxManagement = () => {
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [taxForms, setTaxForms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [taxFormData, setTaxFormData] = useState({
    form_type: 'W4',
    tax_year: new Date().getFullYear(),
    filing_status: 'single',
    allowances: 0,
    additional_withholding: 0,
    exemptions: false,
    state_code: 'NY',
    employee_id: '',
    is_submitted: false,
    effective_date: new Date()
  });
  const [formFile, setFormFile] = useState(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      // Replace with your actual API endpoint
      const response = await axiosInstance.get(`/api/hr/employees/?q=${searchQuery}`);
      setEmployees(response.data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setSnackbar({
        open: true,
        message: 'Failed to fetch employees',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTaxForms = async (employeeId) => {
    setLoading(true);
    try {
      // Replace with your actual API endpoint
      const response = await axiosInstance.get(`/api/taxes/forms/employee/${employeeId}/`);
      setTaxForms(response.data || []);
    } catch (error) {
      console.error('Error fetching tax forms:', error);
      setSnackbar({
        open: true,
        message: 'Failed to fetch tax forms',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleSearch = () => {
    fetchEmployees();
  };

  const handleEmployeeSelect = (employee) => {
    setSelectedEmployee(employee);
    fetchTaxForms(employee.id);
    setTabValue(1);
  };

  const handleOpenDialog = () => {
    if (!selectedEmployee) {
      setSnackbar({
        open: true,
        message: 'Please select an employee first',
        severity: 'warning'
      });
      return;
    }
    
    setTaxFormData({
      ...taxFormData,
      employee_id: selectedEmployee.id
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleFormChange = (event) => {
    const { name, value, checked, type } = event.target;
    setTaxFormData({
      ...taxFormData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleDateChange = (field, date) => {
    setTaxFormData({
      ...taxFormData,
      [field]: date
    });
  };

  const handleFileChange = (event) => {
    setFormFile(event.target.files[0]);
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      Object.keys(taxFormData).forEach(key => {
        if (key === 'effective_date') {
          formData.append(key, new Date(taxFormData[key]).toISOString().split('T')[0]);
        } else {
          formData.append(key, taxFormData[key]);
        }
      });
      
      if (formFile) {
        formData.append('file', formFile);
      }

      // Replace with your actual API endpoint
      const response = await axiosInstance.post('/api/taxes/forms/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setSnackbar({
        open: true,
        message: 'Tax form successfully submitted',
        severity: 'success'
      });
      
      // Refresh tax forms
      fetchTaxForms(selectedEmployee.id);
      handleCloseDialog();
    } catch (error) {
      console.error('Error submitting tax form:', error);
      setSnackbar({
        open: true,
        message: 'Failed to submit tax form',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    // Basic validation
    if (!taxFormData.form_type || !taxFormData.tax_year || !taxFormData.filing_status) {
      setSnackbar({
        open: true,
        message: 'Please fill in all required fields',
        severity: 'error'
      });
      return false;
    }
    
    if (!formFile && taxFormData.is_submitted) {
      setSnackbar({
        open: true,
        message: 'Please upload a form file for submitted forms',
        severity: 'error'
      });
      return false;
    }
    
    return true;
  };

  const handleDeleteForm = async (formId) => {
    if (!window.confirm('Are you sure you want to delete this tax form?')) {
      return;
    }
    
    setLoading(true);
    try {
      // Replace with your actual API endpoint
      await axiosInstance.delete(`/api/taxes/forms/${formId}/`);
      
      setSnackbar({
        open: true,
        message: 'Tax form successfully deleted',
        severity: 'success'
      });
      
      // Refresh tax forms
      fetchTaxForms(selectedEmployee.id);
    } catch (error) {
      console.error('Error deleting tax form:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete tax form',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadForm = async (formId) => {
    try {
      // Replace with your actual API endpoint
      const response = await axiosInstance.get(`/api/taxes/forms/${formId}/download/`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `tax_form_${formId}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading tax form:', error);
      setSnackbar({
        open: true,
        message: 'Failed to download tax form',
        severity: 'error'
      });
    }
  };

  const renderEmployeeSearch = () => (
    <>
      <Typography variant="h4" gutterBottom>
        Employee Tax Management
      </Typography>
      
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <TextField
            label="Search Employees"
            variant="outlined"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search by name, ID, or department..."
            fullWidth
            sx={{ mr: 2 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={handleSearch}>
                    <SearchIcon />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
        </Box>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Job Title</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No employees found
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>{employee.employee_number}</TableCell>
                    <TableCell>{`${employee.first_name} ${employee.last_name}`}</TableCell>
                    <TableCell>{employee.department}</TableCell>
                    <TableCell>{employee.job_title}</TableCell>
                    <TableCell>
                      <IconButton onClick={() => handleEmployeeSelect(employee)}>
                        <VisibilityIcon color="primary" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Manage Employee Tax Forms
        </Typography>
        <Typography variant="body2">
          Select an employee from the table above to view and manage their tax forms.
          You can add new tax forms, edit existing ones, or download submitted forms.
        </Typography>
        <Box sx={{ mt: 2 }}>
          <Alert severity="info">
            Tax forms are used to determine tax withholding and reporting requirements for employees.
            Common forms include W-4 (Federal Tax Withholding), state withholding forms, and W-2 (Annual Wage Reports).
          </Alert>
        </Box>
      </Paper>
    </>
  );

  const renderEmployeeTaxForms = () => (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Tax Forms for {selectedEmployee ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}` : ''}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
        >
          Add Tax Form
        </Button>
      </Box>
      
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ mb: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1">
                Employee ID: {selectedEmployee?.employee_number}
              </Typography>
              <Typography variant="subtitle1">
                Department: {selectedEmployee?.department}
              </Typography>
              <Typography variant="subtitle1">
                Job Title: {selectedEmployee?.job_title}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1">
                Email: {selectedEmployee?.email}
              </Typography>
              <Typography variant="subtitle1">
                Tax Filing Status: {selectedEmployee?.tax_filing_status === 'S' ? 'Single' : 
                                    selectedEmployee?.tax_filing_status === 'M' ? 'Married Filing Jointly' : 
                                    selectedEmployee?.tax_filing_status === 'H' ? 'Head of Household' : 'Not Specified'}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </Paper>
      
      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Tax Forms
        </Typography>
        
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Form Type</TableCell>
                <TableCell>Tax Year</TableCell>
                <TableCell>Filing Status</TableCell>
                <TableCell>State</TableCell>
                <TableCell>Submission Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : taxForms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No tax forms found for this employee
                  </TableCell>
                </TableRow>
              ) : (
                taxForms.map((form) => (
                  <TableRow key={form.id}>
                    <TableCell>{form.form_type}</TableCell>
                    <TableCell>{form.tax_year}</TableCell>
                    <TableCell>
                      {form.filing_status === 'single' ? 'Single' : 
                       form.filing_status === 'married_joint' ? 'Married Filing Jointly' :
                       form.filing_status === 'married_separate' ? 'Married Filing Separately' :
                       form.filing_status === 'head_household' ? 'Head of Household' : form.filing_status}
                    </TableCell>
                    <TableCell>{form.state_code || 'Federal'}</TableCell>
                    <TableCell>{new Date(form.submission_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Chip 
                        label={form.is_submitted ? "Submitted" : "Draft"} 
                        color={form.is_submitted ? "success" : "default"} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Edit">
                        <IconButton onClick={() => console.log('Edit form', form.id)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      
                      {form.is_submitted && (
                        <Tooltip title="Download">
                          <IconButton onClick={() => handleDownloadForm(form.id)}>
                            <FileDownloadIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      
                      <Tooltip title="Delete">
                        <IconButton onClick={() => handleDeleteForm(form.id)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="outlined" onClick={() => setTabValue(0)}>
            Back to Employee Search
          </Button>
        </Box>
      </Paper>
    </>
  );

  // New Tax Form Dialog
  const taxFormDialog = (
    <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
      <DialogTitle>Add New Tax Form</DialogTitle>
      <DialogContent>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Form Type</InputLabel>
                <Select
                  name="form_type"
                  value={taxFormData.form_type}
                  onChange={handleFormChange}
                  label="Form Type"
                >
                  <MenuItem value="W2">W-2 (Wage and Tax Statement)</MenuItem>
                  <MenuItem value="W4">W-4 (Employee Withholding Certificate)</MenuItem>
                  <MenuItem value="STATE_WH">State Withholding Form</MenuItem>
                  <MenuItem value="1099">1099-MISC (Miscellaneous Income)</MenuItem>
                  <MenuItem value="1095C">1095-C (Employer-Provided Health Insurance)</MenuItem>
                  <MenuItem value="OTHER">Other Tax Form</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Tax Year"
                name="tax_year"
                type="number"
                value={taxFormData.tax_year}
                onChange={handleFormChange}
                fullWidth
                InputProps={{ inputProps: { min: 2000, max: 2100 } }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Filing Status</InputLabel>
                <Select
                  name="filing_status"
                  value={taxFormData.filing_status}
                  onChange={handleFormChange}
                  label="Filing Status"
                >
                  <MenuItem value="single">Single</MenuItem>
                  <MenuItem value="married_joint">Married Filing Jointly</MenuItem>
                  <MenuItem value="married_separate">Married Filing Separately</MenuItem>
                  <MenuItem value="head_household">Head of Household</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <DatePicker
                label="Effective Date"
                value={taxFormData.effective_date}
                onChange={(date) => handleDateChange('effective_date', date)}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>
            
            {taxFormData.form_type === 'W4' && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Allowances"
                    name="allowances"
                    type="number"
                    value={taxFormData.allowances}
                    onChange={handleFormChange}
                    fullWidth
                    InputProps={{ inputProps: { min: 0 } }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Additional Withholding"
                    name="additional_withholding"
                    type="number"
                    value={taxFormData.additional_withholding}
                    onChange={handleFormChange}
                    fullWidth
                    InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="exemptions"
                        checked={taxFormData.exemptions}
                        onChange={handleFormChange}
                      />
                    }
                    label="Claim exemption from withholding"
                  />
                </Grid>
              </>
            )}
            
            {taxFormData.form_type === 'STATE_WH' && (
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>State</InputLabel>
                  <Select
                    name="state_code"
                    value={taxFormData.state_code}
                    onChange={handleFormChange}
                    label="State"
                  >
                    <MenuItem value="AL">Alabama</MenuItem>
                    <MenuItem value="AK">Alaska</MenuItem>
                    <MenuItem value="AZ">Arizona</MenuItem>
                    <MenuItem value="AR">Arkansas</MenuItem>
                    <MenuItem value="CA">California</MenuItem>
                    <MenuItem value="CO">Colorado</MenuItem>
                    <MenuItem value="CT">Connecticut</MenuItem>
                    <MenuItem value="DE">Delaware</MenuItem>
                    <MenuItem value="FL">Florida</MenuItem>
                    <MenuItem value="GA">Georgia</MenuItem>
                    <MenuItem value="HI">Hawaii</MenuItem>
                    <MenuItem value="ID">Idaho</MenuItem>
                    <MenuItem value="IL">Illinois</MenuItem>
                    <MenuItem value="IN">Indiana</MenuItem>
                    <MenuItem value="IA">Iowa</MenuItem>
                    <MenuItem value="KS">Kansas</MenuItem>
                    <MenuItem value="KY">Kentucky</MenuItem>
                    <MenuItem value="LA">Louisiana</MenuItem>
                    <MenuItem value="ME">Maine</MenuItem>
                    <MenuItem value="MD">Maryland</MenuItem>
                    <MenuItem value="MA">Massachusetts</MenuItem>
                    <MenuItem value="MI">Michigan</MenuItem>
                    <MenuItem value="MN">Minnesota</MenuItem>
                    <MenuItem value="MS">Mississippi</MenuItem>
                    <MenuItem value="MO">Missouri</MenuItem>
                    <MenuItem value="MT">Montana</MenuItem>
                    <MenuItem value="NE">Nebraska</MenuItem>
                    <MenuItem value="NV">Nevada</MenuItem>
                    <MenuItem value="NH">New Hampshire</MenuItem>
                    <MenuItem value="NJ">New Jersey</MenuItem>
                    <MenuItem value="NM">New Mexico</MenuItem>
                    <MenuItem value="NY">New York</MenuItem>
                    <MenuItem value="NC">North Carolina</MenuItem>
                    <MenuItem value="ND">North Dakota</MenuItem>
                    <MenuItem value="OH">Ohio</MenuItem>
                    <MenuItem value="OK">Oklahoma</MenuItem>
                    <MenuItem value="OR">Oregon</MenuItem>
                    <MenuItem value="PA">Pennsylvania</MenuItem>
                    <MenuItem value="RI">Rhode Island</MenuItem>
                    <MenuItem value="SC">South Carolina</MenuItem>
                    <MenuItem value="SD">South Dakota</MenuItem>
                    <MenuItem value="TN">Tennessee</MenuItem>
                    <MenuItem value="TX">Texas</MenuItem>
                    <MenuItem value="UT">Utah</MenuItem>
                    <MenuItem value="VT">Vermont</MenuItem>
                    <MenuItem value="VA">Virginia</MenuItem>
                    <MenuItem value="WA">Washington</MenuItem>
                    <MenuItem value="WV">West Virginia</MenuItem>
                    <MenuItem value="WI">Wisconsin</MenuItem>
                    <MenuItem value="WY">Wyoming</MenuItem>
                    <MenuItem value="DC">District of Columbia</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="is_submitted"
                    checked={taxFormData.is_submitted}
                    onChange={handleFormChange}
                  />
                }
                label="Form has been submitted to authorities"
              />
            </Grid>
            
            {taxFormData.is_submitted && (
              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  component="label"
                  fullWidth
                  startIcon={<FileDownloadIcon />}
                  sx={{ height: '56px' }}
                >
                  Upload Form Document
                  <input
                    type="file"
                    hidden
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                  />
                </Button>
                {formFile && (
                  <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                    File selected: {formFile.name}
                  </Typography>
                )}
              </Grid>
            )}
          </Grid>
        </LocalizationProvider>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseDialog}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} /> : 'Submit'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <>
      <Box sx={{ width: '100%', mb: 2 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Employee Search" />
          {selectedEmployee && <Tab label="Tax Forms" />}
        </Tabs>
      </Box>
      
      {tabValue === 0 && renderEmployeeSearch()}
      {tabValue === 1 && selectedEmployee && renderEmployeeTaxForms()}
      
      {taxFormDialog}
      
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default EmployeeTaxManagement;