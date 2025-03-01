// src/app/dashboard/components/taxes/GlobalComplianceView.jsx
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
  Select,
  MenuItem,
  TextField,
  Chip,
  Tab,
  Tabs,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  IconButton,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { axiosInstance } from '@/lib/axiosConfig';
import countries from 'i18n-iso-countries';

const GlobalComplianceView = () => {
  const [selectedCountry, setSelectedCountry] = useState('');
  const [countryData, setCountryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  // Get list of all countries
  const countryList = Object.entries(countries.getNames('en')).map(([code, name]) => ({
    code,
    name
  }));

  useEffect(() => {
    if (selectedCountry) {
      fetchCountryData(selectedCountry);
    }
  }, [selectedCountry]);

  const fetchCountryData = async (countryCode) => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(`/api/taxes/global-compliance/${countryCode}/`);
      setCountryData(response.data);
    } catch (error) {
      console.error('Error fetching country data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Global Tax Compliance
      </Typography>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Select Country
          </Typography>
          <Select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            sx={{ width: 300 }}
            displayEmpty
          >
            <MenuItem value="">Select a country</MenuItem>
            {countryList.map((country) => (
              <MenuItem key={country.code} value={country.code}>
                {country.name}
              </MenuItem>
            ))}
          </Select>
        </Box>
      </Paper>

      {countryData && (
        <>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={handleTabChange}>
                <Tab label="Compliance Overview" />
                <Tab label="Tax Rates" />
                <Tab label="Filing Requirements" />
              </Tabs>
            </Box>
            
            {/* Tab 1: Compliance Overview */}
            {tabValue === 0 && (
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  {countryData.country} - {countryData.service_level === 'full' ? 'Full-Service' : 'Self-Service'} 
                </Typography>
                
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1">Service Level</Typography>
                    <Chip 
                      label={countryData.service_level === 'full' ? 'Full-Service' : 'Self-Service'} 
                      color={countryData.service_level === 'full' ? 'primary' : 'secondary'} 
                    />
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {countryData.service_level_description}
                    </Typography>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1">Special Considerations</Typography>
                    <Typography variant="body2">
                      {countryData.special_considerations || 'None'}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            )}
            
            {/* Tab 2: Tax Rates */}
            {tabValue === 1 && (
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Tax Rates for {countryData.country}
                </Typography>
                
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Tax Type</TableCell>
                        <TableCell>Filing Status</TableCell>
                        <TableCell>Income Range</TableCell>
                        <TableCell>Rate</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {countryData.tax_rates.map((rate, index) => (
                        <TableRow key={index}>
                          <TableCell>{rate.type}</TableCell>
                          <TableCell>{rate.filing_status || 'All'}</TableCell>
                          <TableCell>
                            {rate.min !== undefined ? 
                              rate.max ? 
                                `${rate.min.toLocaleString()} - ${rate.max.toLocaleString()}` : 
                                `${rate.min.toLocaleString()}+` 
                              : 'All Income'
                            }
                          </TableCell>
                          <TableCell>{(rate.rate * 100).toFixed(2)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
            
            {/* Tab 3: Filing Requirements */}
            {tabValue === 2 && (
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Filing Requirements for {countryData.country}
                </Typography>
                
                <Card sx={{ mb: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle1">Tax Authorities</Typography>
                    <List>
                      {countryData.tax_authorities.map((authority, index) => (
                        <ListItem key={index}>
                          <ListItemText 
                            primary={authority.name} 
                            secondary={authority.website ? 
                              <a href={authority.website} target="_blank" rel="noopener noreferrer">
                                {authority.website}
                              </a> : null
                            } 
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1">Filing Schedule</Typography>
                    <Typography variant="body1">
                      Frequency: {countryData.filing_frequency}
                    </Typography>
                    <Typography variant="body2">
                      {countryData.filing_description}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            )}
            {countryData && (
            <Box sx={{ mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                Currency Information
                </Typography>
                <Card>
                <CardContent>
                    <Typography variant="body1">
                    Currency: {countryData.currency_symbol} ({countryData.currency_code})
                    </Typography>
                    {countryData.currency_code !== 'USD' && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Exchange Rate: 1 USD = {countryData.exchange_rate} {countryData.currency_code}
                    </Typography>
                    )}
                </CardContent>
                </Card>
            </Box>
            )}


          </Paper>
        </>
      )}
    </Box>
  );
};

export default GlobalComplianceView;