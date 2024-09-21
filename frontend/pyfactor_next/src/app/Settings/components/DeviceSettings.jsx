import React, { useState } from 'react';
import { Box, Typography, Switch, FormControlLabel, Button, Grid } from '@mui/material';

const DeviceSettings = () => {
  const [printerEnabled, setPrinterEnabled] = useState(false);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);

  const handlePrinterToggle = () => {
    setPrinterEnabled(!printerEnabled);
  };

  const handleBluetoothToggle = () => {
    setBluetoothEnabled(!bluetoothEnabled);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>Device Settings</Typography>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <FormControlLabel
            control={<Switch checked={printerEnabled} onChange={handlePrinterToggle} />}
            label="Enable Printer"
          />
        </Grid>
        <Grid item xs={12}>
          <FormControlLabel
            control={<Switch checked={bluetoothEnabled} onChange={handleBluetoothToggle} />}
            label="Enable Bluetooth"
          />
        </Grid>
        {printerEnabled && (
          <Grid item xs={12}>
            <Button variant="contained">Configure Printer</Button>
          </Grid>
        )}
        {bluetoothEnabled && (
          <Grid item xs={12}>
            <Button variant="contained">Scan for Bluetooth Devices</Button>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default DeviceSettings;