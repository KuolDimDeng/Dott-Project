// components/taxes/SelfServiceTaxFiling.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
  Snackbar,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import FileOpenIcon from '@mui/icons-material/FileOpen';
import { axiosInstance } from '@/lib/axiosConfig';

const SelfServiceTaxFiling = () => {
  const [taxFilings, setTaxFilings] = useState([]);
  const [instructions, setInstructions] = useState({});
  const [selectedFiling, setSelectedFiling] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  
  useEffect(() => {
    fetchTaxFilings();
    fetchInstructions();
  }, []);
  
  const fetchTaxFilings = async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get('/api/taxes/tax-filings/', {
        params: { submission_method: 'self_service' }
      });
      setTaxFilings(response.data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching tax filings:', error);
      setSnackbar({
        open: true,
        message: 'Error fetching tax filings',
        severity: 'error'
      });
      setIsLoading(false);
    }
  };
  
  const fetchInstructions = async () => {
    try {
      const response = await axiosInstance.get('/api/taxes/filing-instructions/');
      const instructionsMap = {};
      response.data.forEach(instruction => {
        instructionsMap[instruction.state] = instruction;
      });
      setInstructions(instructionsMap);
    } catch (error) {
      console.error('Error fetching instructions:', error);
    }
  };
  
  const handleOpenDialog = (filing) => {
    setSelectedFiling(filing);
    setOpenDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedFiling(null);
  };
  
  const handleDownloadPdf = async (filingId) => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get(`/api/taxes/tax-filings/${filingId}/pdf/`, {
        responseType: 'blob'
      });
      
      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `tax_filing_${filingId}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      link.parentNode.removeChild(link);
      
      setSnackbar({
        open: true,
        message: 'Tax filing PDF downloaded successfully',
        severity: 'success'
      });
      setIsLoading(false);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      setSnackbar({
        open: true,
        message: 'Error downloading PDF',
        severity: 'error'
      });
      setIsLoading(false);
    }
  };
  
  const handleConfirmFiled = async (filingId) => {
    try {
      setIsLoading(true);
      await axiosInstance.patch(`/api/taxes/tax-filings/${filingId}/`, {
        filing_status: 'submitted',
        notes: 'Filed by user via self-service'
      });
      
      // Update local state
      setTaxFilings(prevFilings => 
        prevFilings.map(filing => 
          filing.id === filingId 
            ? {...filing, filing_status: 'submitted'} 
            : filing
        )
      );
      
      setSnackbar({
        open: true,
        message: 'Tax filing marked as submitted',
        severity: 'success'
      });
      setIsLoading(false);
      handleCloseDialog();
    } catch (error) {
      console.error('Error updating filing status:', error);
      setSnackbar({
        open: true,
        message: 'Error updating filing status',
        severity: 'error'
      });
      setIsLoading(false);
    }
  };
  
  const getStatusChip = (status) => {
    const statusColors = {
      'preparation': 'default',
      'pending': 'warning',
      'submitted': 'success',
      'accepted': 'success',
      'rejected': 'error',
      'amended': 'info'
    };
    
    return (
      <Chip 
        label={status.charAt(0).toUpperCase() + status.slice(1)} 
        color={statusColors[status] || 'default'} 
        size="small" 
      />
    );
  };
  
  const groupFilingsByState = () => {
    const grouped = {};
    taxFilings.forEach(filing => {
      if (!grouped[filing.state_code]) {
        grouped[filing.state_code] = [];
      }
      grouped[filing.state_code].push(filing);
    });
    return grouped;
  };
  
  const groupedFilings = groupFilingsByState();
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Self-Service Tax Filings
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        For states not covered by Dott's full service tax filing, you'll need to file taxes yourself. 
        We provide the necessary documents and instructions to help you complete the process.
      </Alert>
      
      {Object.keys(groupedFilings).length > 0 ? (
        Object.entries(groupedFilings).map(([stateCode, stateFilings]) => (
          <Paper sx={{ p: 2, mb: 3 }} key={stateCode}>
            <Typography variant="h6" gutterBottom>
              {stateCode} Filings
            </Typography>
            
            <Grid container spacing={2}>
              {stateFilings.map(filing => (
                <Grid item xs={12} sm={6} md={4} key={filing.id}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="subtitle1">
                          Period: {new Date(filing.filing_period_start).toLocaleDateString()} - {new Date(filing.filing_period_end).toLocaleDateString()}
                        </Typography>
                        {getStatusChip(filing.filing_status)}
                      </Box>
                      
                      <Typography variant="body2" color="text.secondary">
                        Total Wages: ${filing.total_wages.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Withholding: ${filing.total_withholding.toLocaleString()}
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button 
                        size="small" 
                        startIcon={<DownloadIcon />}
                        onClick={() => handleDownloadPdf(filing.id)}
                      >
                        Download Form
                      </Button>
                      <Button 
                        size="small" 
                        startIcon={<FileOpenIcon />}
                        onClick={() => handleOpenDialog(filing)}
                        disabled={filing.filing_status === 'submitted' || filing.filing_status === 'accepted'}
                      >
                        View Instructions
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        ))
      ) : (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography>No self-service tax filings found</Typography>
        </Paper>
      )}
      
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        {selectedFiling && (
          <>
            <DialogTitle>
              Filing Instructions for {selectedFiling.state_code}
            </DialogTitle>
            <DialogContent>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>Filing Details</Typography>
                <Typography>
                  <strong>Period:</strong> {new Date(selectedFiling.filing_period_start).toLocaleDateString()} - {new Date(selectedFiling.filing_period_end).toLocaleDateString()}
                </Typography>
                <Typography>
                  <strong>Total Wages:</strong> ${selectedFiling.total_wages.toLocaleString()}
                </Typography>
                <Typography>
                  <strong>Withholding Amount:</strong> ${selectedFiling.total_withholding.toLocaleString()}
                </Typography>
                <Typography>
                  <strong>Status:</strong> {selectedFiling.filing_status}
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="h6" gutterBottom>How to File</Typography>
                {instructions[selectedFiling.state] ? (
                  <>
                    <Typography gutterBottom>
                      {instructions[selectedFiling.state].instructions}
                    </Typography>
                    <Typography variant="subtitle2">
                      Filing Frequency: {instructions[selectedFiling.state].filing_frequency}
                    </Typography>
                    <Typography variant="subtitle2" gutterBottom>
                      Due within {instructions[selectedFiling.state].due_days} days after period end
                    </Typography>
                    <Button 
                      variant="contained" 
                      href={instructions[selectedFiling.state].portal_url} 
                      target="_blank"
                      sx={{ mt: 2 }}
                    >
                      Go to State Filing Portal
                    </Button>
                  </>
                ) : (
                  <Typography>
                    Please download the tax form and submit it through your state's tax portal.
                  </Typography>
                )}
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Close</Button>
              <Button 
                onClick={() => handleDownloadPdf(selectedFiling.id)} 
                variant="outlined"
              >
                Download Form
              </Button>
              <Button 
                onClick={() => handleConfirmFiled(selectedFiling.id)} 
                variant="contained"
                disabled={selectedFiling.filing_status === 'submitted' || selectedFiling.filing_status === 'accepted'}
              >
                Mark as Filed
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
      
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
    </Box>
  );
};

export default SelfServiceTaxFiling;