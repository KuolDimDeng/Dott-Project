'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Chip,
  Alert,
  Paper,
  Link,
  CircularProgress,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  Public as PublicIcon,
  Schedule as ScheduleIcon,
  Receipt as ReceiptIcon,
  Payment as PaymentIcon,
  Description as DescriptionIcon,
  Language as LanguageIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';

const CountryRequirements = () => {
  const [countries, setCountries] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [countryInfo, setCountryInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCountries();
  }, []);

  useEffect(() => {
    if (selectedCountry) {
      fetchCountryInfo(selectedCountry);
    }
  }, [selectedCountry]);

  const fetchCountries = async () => {
    try {
      const response = await fetch('/api/taxes/countries', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setCountries(data.countries || []);
      }
    } catch (error) {
      console.error('Error fetching countries:', error);
    }
  };

  const fetchCountryInfo = async (countryCode) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/taxes/countries/${countryCode}/requirements`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setCountryInfo(data.info);
      }
    } catch (error) {
      console.error('Error fetching country info:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getFilingFrequencyColor = (frequency) => {
    switch (frequency) {
      case 'monthly':
        return 'error';
      case 'quarterly':
        return 'warning';
      case 'annual':
        return 'success';
      default:
        return 'default';
    }
  };

  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
        Global Tax Filing Requirements
      </Typography>
      <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>
        View tax filing requirements, deadlines, and fees for all supported countries
      </Typography>

      {/* Country Selection */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            placeholder="Search countries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Select Country</InputLabel>
            <Select
              value={selectedCountry}
              label="Select Country"
              onChange={(e) => setSelectedCountry(e.target.value)}
            >
              {filteredCountries.map((country) => (
                <MenuItem key={country.code} value={country.code}>
                  {country.name} ({country.code})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {/* Country Information */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : countryInfo ? (
        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <PublicIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    Basic Information
                  </Typography>
                </Box>
                
                <List disablePadding>
                  <ListItem disablePadding>
                    <ListItemText
                      primary="Tax Authority"
                      secondary={countryInfo.tax_authority_name || 'Not specified'}
                    />
                  </ListItem>
                  <Divider />
                  
                  <ListItem disablePadding>
                    <ListItemText
                      primary="Tax Type"
                      secondary={countryInfo.tax_type?.toUpperCase() || 'N/A'}
                    />
                  </ListItem>
                  <Divider />
                  
                  <ListItem disablePadding>
                    <ListItemText
                      primary="Standard Tax Rate"
                      secondary={`${(countryInfo.rate * 100).toFixed(2)}%`}
                    />
                  </ListItem>
                  <Divider />
                  
                  <ListItem disablePadding>
                    <ListItemText
                      primary="Main Form"
                      secondary={countryInfo.main_form_name || 'Not specified'}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Filing Requirements */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <ScheduleIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    Filing Requirements
                  </Typography>
                </Box>
                
                <List disablePadding>
                  <ListItem disablePadding>
                    <ListItemText
                      primary="Filing Frequency"
                      secondary={
                        <Chip
                          label={countryInfo.filing_frequency || 'Not specified'}
                          color={getFilingFrequencyColor(countryInfo.filing_frequency)}
                          size="small"
                        />
                      }
                    />
                  </ListItem>
                  <Divider />
                  
                  <ListItem disablePadding>
                    <ListItemText
                      primary="Filing Deadline"
                      secondary={
                        countryInfo.filing_day_of_month 
                          ? `${countryInfo.filing_day_of_month}th of each month`
                          : 'Varies'
                      }
                    />
                  </ListItem>
                  <Divider />
                  
                  <ListItem disablePadding>
                    <ListItemText
                      primary="Online Filing"
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {countryInfo.online_filing_available ? (
                            <>
                              <CheckCircleIcon color="success" fontSize="small" sx={{ mr: 1 }} />
                              Available
                            </>
                          ) : (
                            <>
                              <CancelIcon color="error" fontSize="small" sx={{ mr: 1 }} />
                              Not Available
                            </>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  
                  {countryInfo.online_portal_name && (
                    <>
                      <Divider />
                      <ListItem disablePadding>
                        <ListItemText
                          primary="Online Portal"
                          secondary={
                            countryInfo.online_portal_url ? (
                              <Link 
                                href={countryInfo.online_portal_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                              >
                                {countryInfo.online_portal_name}
                              </Link>
                            ) : (
                              countryInfo.online_portal_name
                            )
                          }
                        />
                      </ListItem>
                    </>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Service Pricing */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <PaymentIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    Our Service Pricing
                  </Typography>
                </Box>
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'grey.50' }}>
                      <DescriptionIcon color="primary" sx={{ mb: 1 }} />
                      <Typography variant="subtitle2" color="textSecondary">
                        Manual Filing
                      </Typography>
                      <Typography variant="h5" color="primary">
                        {formatCurrency(countryInfo.manual_filing_fee)}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        We prepare, you file
                      </Typography>
                    </Paper>
                  </Grid>
                  
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center', backgroundColor: 'grey.50' }}>
                      <LanguageIcon color="primary" sx={{ mb: 1 }} />
                      <Typography variant="subtitle2" color="textSecondary">
                        Online Filing
                      </Typography>
                      <Typography variant="h5" color="primary">
                        {formatCurrency(countryInfo.online_filing_fee)}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Complete service
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
                
                {!countryInfo.online_filing_available && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Online filing is not available for this country. 
                    Only manual filing service is offered.
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Filing Instructions */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <ReceiptIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    Filing Instructions
                  </Typography>
                </Box>
                
                {countryInfo.filing_instructions ? (
                  <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                    {countryInfo.filing_instructions}
                  </Typography>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    Detailed filing instructions will be provided with your tax report.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Data Source Information */}
          <Grid item xs={12}>
            <Alert severity="info">
              <Typography variant="body2">
                <strong>Data Accuracy:</strong> This information is sourced from official government 
                websites and updated regularly. However, tax requirements can change frequently. 
                Always verify current requirements with the local tax authority before filing.
                
                {countryInfo.ai_confidence_score && (
                  <>
                    <br />
                    <strong>Confidence Score:</strong> {(countryInfo.ai_confidence_score * 100).toFixed(0)}%
                  </>
                )}
                
                {countryInfo.ai_last_verified && (
                  <>
                    <br />
                    <strong>Last Verified:</strong> {new Date(countryInfo.ai_last_verified).toLocaleDateString()}
                  </>
                )}
              </Typography>
            </Alert>
          </Grid>
        </Grid>
      ) : selectedCountry ? (
        <Alert severity="warning">
          No information available for the selected country.
        </Alert>
      ) : (
        <Alert severity="info">
          Please select a country to view its tax filing requirements.
        </Alert>
      )}
    </Box>
  );
};

export default CountryRequirements;