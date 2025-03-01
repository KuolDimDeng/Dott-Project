// src/app/dashboard/components/taxes/SelfServiceGuide.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Link,
  Divider,
  Card,
  CardContent,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import LinkIcon from '@mui/icons-material/Link';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';
import { axiosInstance } from '@/lib/axiosConfig';

const SelfServiceGuide = ({ payrollRunId, countryCode }) => {
  const [complianceData, setComplianceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (countryCode) {
      fetchComplianceData(countryCode);
    }
  }, [countryCode]);

  const fetchComplianceData = async (country) => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(`/api/taxes/global-compliance/${country}/`);
      setComplianceData(response.data);
    } catch (error) {
      console.error('Error fetching compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleDownloadReport = async () => {
    try {
      // Download a PDF report for self-service filing
      const response = await axiosInstance.get(`/api/payroll/runs/${payrollRunId}/report/`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `payroll-report-${payrollRunId}.pdf`);
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  if (loading) {
    return <Typography>Loading compliance data...</Typography>;
  }

  if (!complianceData) {
    return <Typography>No compliance data available for {countryCode}</Typography>;
  }

  const steps = [
    {
      label: 'Gather Payroll Information',
      description: 'Download your payroll reports and employee payment details.',
      content: (
        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadReport}
            sx={{ mb: 2 }}
          >
            Download Payroll Report
          </Button>
          
          <Alert severity="info" sx={{ mb: 2 }}>
            This report contains all the information you need to pay your employees and file taxes.
          </Alert>
          
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle1">Important Information</Typography>
              <Typography variant="body2">
                Filing Frequency: {complianceData.filing_frequency}
              </Typography>
              {complianceData.special_considerations && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Special Notes: {complianceData.special_considerations}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>
      )
    },
    {
      label: 'Pay Your Employees',
      description: 'Process payments to your employees using your local banking system.',
      content: (
        <Box sx={{ mt: 2 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Use the net pay amounts from your payroll report to pay your employees through your preferred payment method.
          </Alert>
          
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Common Payment Methods in {countryCode}:
          </Typography>
          
          <List>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary="Direct Bank Transfer" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary="Local Payment Apps" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary="Check/Cheque (if applicable)" />
            </ListItem>
          </List>
        </Box>
      )
    },
    {
      label: 'Submit Tax Payments',
      description: 'Pay required taxes to the appropriate tax authorities.',
      content: (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Tax Authorities in {countryCode}:
          </Typography>
          
          {complianceData.tax_authorities && complianceData.tax_authorities.map((authority, index) => (
            <Card key={index} sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle2">{authority.name}</Typography>
                {authority.website && (
                  <Link 
                    href={authority.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    sx={{ display: 'flex', alignItems: 'center', mt: 1 }}
                  >
                    <LinkIcon sx={{ mr: 0.5 }} fontSize="small" />
                    Visit Website
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
          
          <Alert severity="warning" sx={{ mt: 2 }}>
            Remember to keep records of all tax payments for at least 7 years for audit purposes.
          </Alert>
        </Box>
      )
    },
    {
      label: 'File Tax Returns',
      description: 'Submit the required tax filings to authorities.',
      content: (
        <Box sx={{ mt: 2 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Use the information from your payroll report to complete the required tax filings.
          </Alert>
          
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Filing Schedule:
          </Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {complianceData.filing_frequency === 'monthly' ? 'File monthly, typically due by the 15th of the following month.' : 
             complianceData.filing_frequency === 'quarterly' ? 'File quarterly, typically due by the 15th of the month following the end of each quarter.' :
             'File according to local requirements.'}
          </Typography>
          
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Additional Resources:
          </Typography>
          <Button
            variant="outlined"
            startIcon={<InfoIcon />}
            sx={{ mb: 1 }}
            onClick={() => window.open(`/dashboard/taxes/compliance-guide/${countryCode}`)}
          >
            View Detailed Compliance Guide
          </Button>
        </Box>
      )
    }
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Self-Service Payroll Guide for {complianceData.country}
      </Typography>
      
      <Divider sx={{ mb: 3 }} />
      
      <Stepper activeStep={activeStep} orientation="vertical">
        {steps.map((step, index) => (
          <Step key={step.label}>
            <StepLabel>
              <Typography variant="subtitle1">{step.label}</Typography>
            </StepLabel>
            <StepContent>
              <Typography>{step.description}</Typography>
              {step.content}
              <Box sx={{ mb: 2, mt: 2 }}>
                <div>
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    sx={{ mt: 1, mr: 1 }}
                  >
                    {index === steps.length - 1 ? 'Finish' : 'Continue'}
                  </Button>
                  <Button
                    disabled={index === 0}
                    onClick={handleBack}
                    sx={{ mt: 1, mr: 1 }}
                  >
                    Back
                  </Button>
                </div>
              </Box>
            </StepContent>
          </Step>
        ))}
      </Stepper>
      
      {activeStep === steps.length && (
        <Paper square elevation={0} sx={{ p: 3 }}>
          <Typography>All steps completed - you&apos;re all set!</Typography>
          <Button onClick={() => setActiveStep(0)} sx={{ mt: 1, mr: 1 }}>
            Start Over
          </Button>
        </Paper>
      )}
    </Box>
  );
};

export default SelfServiceGuide;