import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, List, ListItem, ListItemText } from '@mui/material';

const DeviceSettings = () => {
  const [connectedDevices, setConnectedDevices] = useState([]);

  useEffect(() => {
    // This is a placeholder. In a real app, you might get this info from your backend
    setConnectedDevices([
      { name: 'Default Printer', type: 'Printer' },
      { name: 'Bluetooth Barcode Scanner', type: 'Bluetooth' },
    ]);
  }, []);

  const testPrinter = () => {
    window.print();
  };

  const testBarcodeScanner = () => {
    alert('Please scan a barcode now. It will be captured in the next input field you focus on.');
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Connected Devices</Typography>
      <List>
        {connectedDevices.map((device, index) => (
          <ListItem key={index}>
            <ListItemText primary={device.name} secondary={device.type} />
            <Button onClick={device.type === 'Printer' ? testPrinter : testBarcodeScanner}>
              Test Device
            </Button>
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default DeviceSettings;