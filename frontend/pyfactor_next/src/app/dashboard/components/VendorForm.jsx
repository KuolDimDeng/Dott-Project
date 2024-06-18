import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Grid,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
} from '@mui/material';
import { getData } from 'country-list';
import currencyList from './currencies';

const VendorForm = () => {
  const [vendorName, setVendorName] = useState('');
  const [vendorType, setVendorType] = useState('regular');
  const [contractorType, setContractorType] = useState('individual');
  const [ssn, setSsn] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');

  const handleVendorTypeChange = (event) => {
    setVendorType(event.target.value);
  };

  const handleContractorTypeChange = (event) => {
    setContractorType(event.target.value);
  };

  const handleCurrencyChange = (event) => {
    setCurrency(event.target.value);
  };

  const handleCountryChange = (event, newValue) => {
    setCountry(newValue ? newValue.code : '');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission logic here
    console.log({
      vendorName,
      vendorType,
      contractorType,
      ssn,
      firstName,
      lastName,
      email,
      currency,
      country,
      state,
      addressLine1,
      addressLine2,
      city,
      postalCode,
      additionalInfo,
    });
  };

  const countries = getData().map((country) => ({
    code: country.code,
    name: country.name,
  }));

  const states = [
    'Alabama',
    'Alaska',
    'Arizona',
    'Arkansas',
    'California',
    'Colorado',
    'Connecticut',
    'Delaware',
    'District of Columbia',
    'Florida',
    'Georgia',
    'Hawaii',
    'Idaho',
    'Illinois',
    'Indiana',
    'Iowa',
    'Kansas',
    'Kentucky',
    'Louisiana',
    'Maine',
    'Maryland',
    'Massachusetts',
    'Michigan',
    'Minnesota',
    'Mississippi',
    'Missouri',
    'Montana',
    'Nebraska',
    'Nevada',
    'New Hampshire',
    'New Jersey',
    'New Mexico',
    'New York',
    'North Carolina',
    'North Dakota',
    'Ohio',
    'Oklahoma',
    'Oregon',
    'Pennsylvania',
    'Rhode Island',
    'South Carolina',
    'South Dakota',
    'Tennessee',
    'Texas',
    'Utah',
    'Vermont',
    'Virginia',
    'Washington',
    'West Virginia',
    'Wisconsin',
    'Wyoming',
  ];

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Add a vendor
      </Typography>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Vendor Name"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              required
              fullWidth
            />
            <FormControl component="fieldset">
              <FormLabel component="legend">Type</FormLabel>
              <RadioGroup
                row
                name="vendorType"
                value={vendorType}
                onChange={handleVendorTypeChange}
              >
                <FormControlLabel
                  value="regular"
                  control={<Radio />}
                  label="Regular - Companies that provide goods and services to your business (e.g. internet and utility providers)."
                />
                <FormControlLabel
                  value="1099-contractor"
                  control={<Radio />}
                  label="1099-NEC contractor - Contractors that perform a service for which you pay them and provide a 1099-NEC form."
                />
              </RadioGroup>
            </FormControl>
            {vendorType === 'regular' && (
              <>
                <TextField
                  label="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  fullWidth
                />
                <FormControl fullWidth>
                  <InputLabel>Currency</InputLabel>
                  <Select value={currency} onChange={handleCurrencyChange}>
                    {currencyList.map((currency) => (
                      <MenuItem key={currency.code} value={currency.code}>
                        {currency.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  fullWidth
                  required
                />
                <Autocomplete
                  options={countries}
                  getOptionLabel={(option) => option.name}
                  value={country ? { code: country, name: getData().find((c) => c.code === country)?.name } : null}
                  onChange={handleCountryChange}
                  renderInput={(params) => (
                    <TextField {...params} label="Country" required fullWidth />
                  )}
                />
                {country === 'US' && (
                  <FormControl fullWidth>
                    <InputLabel>Province/State</InputLabel>
                    <Select value={state} onChange={(e) => setState(e.target.value)}>
                      {states.map((state) => (
                        <MenuItem key={state} value={state}>
                          {state}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
                <TextField
                  label="Address line 1"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  label="Address line 2"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  fullWidth
                />
                <TextField
                  label="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  label="Postal/Zip code"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  label="Enter additional information (optional)"
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  multiline
                  rows={4}
                  fullWidth
                />
              </>
            )}
            {vendorType === '1099-contractor' && (
              <FormControl component="fieldset">
                <FormLabel component="legend">Contractor type</FormLabel>
                <RadioGroup
                  row
                  name="contractorType"
                  value={contractorType}
                  onChange={handleContractorTypeChange}
                >
                  <FormControlLabel
                    value="individual"
                    control={<Radio />}
                    label="Individual - A single person that's not registered as a business or not doing business under an official name."
                  />
                  <FormControlLabel
                    value="business"
                    control={<Radio />}
                    label="Business"
                  />
                </RadioGroup>
              </FormControl>
            )}
            {vendorType === '1099-contractor' && contractorType === 'individual' && (
              <TextField
                label="Social Security Number"
                value={ssn}
                onChange={(e) => setSsn(e.target.value)}
                fullWidth
                required
              />
            )}
            {vendorType === '1099-contractor' && (
              <TextField
                label="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                fullWidth
                required
              />
            )}
            {vendorType === '1099-contractor' && (
              <TextField
                label="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                fullWidth
                required
              />
            )}
            {vendorType === '1099-contractor' && (
              <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                required
              />
            )}
            {vendorType === '1099-contractor' && (
              <Autocomplete
                options={countries}
                getOptionLabel={(option) => option.name}
                value={country ? { code: country, name: getData().find((c) => c.code === country)?.name } : null}
                onChange={handleCountryChange}
                renderInput={(params) => (
                  <TextField {...params} label="Country" required fullWidth />
                )}
              />
            )}
            {vendorType === '1099-contractor' && country === 'US' && (
              <FormControl fullWidth>
                <InputLabel>Province/State</InputLabel>
                <Select value={state} onChange={(e) => setState(e.target.value)}>
                  {states.map((state) => (
                    <MenuItem key={state} value={state}>
                      {state}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            {vendorType === '1099-contractor' && (
              <TextField
                label="Address line 1"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                required
                fullWidth
              />
            )}
            {vendorType === '1099-contractor' && (
              <TextField
                label="Address line 2"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                fullWidth
              />
            )}
            {vendorType === '1099-contractor' && (
              <TextField
                label="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                fullWidth
              />
            )}
            {vendorType === '1099-contractor' && (
              <TextField
                label="Postal/Zip code"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                required
                fullWidth
              />
            )}
            {vendorType === '1099-contractor' && (
              <TextField
                label="Enter additional information (optional)"
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                multiline
                rows={4}
                fullWidth
              />
            )}
            {vendorType === '1099-contractor' && (
              <Box mt={2}>
                <Typography variant="body1">
                  Direct Deposit payment
                </Typography>
                <Typography variant="body2">
                  After saving the contractor information you will be able to add bank details on the vendors list.
                </Typography>
              </Box>
            )}
          </Grid>
        </Grid>
        <Box display="flex" justifyContent="flex-end" mt={3}>
          <Button variant="outlined" color="inherit" sx={{ mr: 2 }}>
            Cancel
          </Button>
          <Button variant="contained" color="primary" type="submit">
            Save
          </Button>
        </Box>
      </form>
    </Box>
  );
};

export default VendorForm;