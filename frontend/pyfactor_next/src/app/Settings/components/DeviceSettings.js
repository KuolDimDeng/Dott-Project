import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Chip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import DevicesIcon from '@mui/icons-material/Devices';
import SecurityIcon from '@mui/icons-material/Security';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import TabletAndroidIcon from '@mui/icons-material/TabletAndroid';

const DeviceSettings = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);

  // Mock data for connected devices
  const devices = [
    {
      id: 1,
      name: 'MacBook Pro',
      type: 'desktop',
      lastActive: '2023-03-25 10:30 AM',
      location: 'New York, USA',
      isCurrent: true,
    },
    {
      id: 2,
      name: 'iPhone 13',
      type: 'mobile',
      lastActive: '2023-03-24 3:45 PM',
      location: 'New York, USA',
      isCurrent: false,
    },
    {
      id: 3,
      name: 'iPad Pro',
      type: 'tablet',
      lastActive: '2023-03-20 9:15 AM',
      location: 'Boston, USA',
      isCurrent: false,
    },
  ];

  const handleOpenDialog = (device) => {
    setSelectedDevice(device);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const getDeviceIcon = (type) => {
    switch (type) {
      case 'desktop':
        return <DesktopWindowsIcon />;
      case 'mobile':
        return <PhoneAndroidIcon />;
      case 'tablet':
        return <TabletAndroidIcon />;
      default:
        return <DevicesIcon />;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Device Settings
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <DevicesIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Connected Devices</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" paragraph>
              Manage devices that are currently connected to your account.
            </Typography>
            <List>
              {devices.map((device) => (
                <React.Fragment key={device.id}>
                  <ListItem>
                    <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                      {getDeviceIcon(device.type)}
                    </Box>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {device.name}
                          {device.isCurrent && (
                            <Chip
                              label="Current Device"
                              size="small"
                              color="primary"
                              variant="outlined"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography variant="body2" component="span">
                            Last active: {device.lastActive}
                          </Typography>
                          <br />
                          <Typography variant="body2" component="span">
                            Location: {device.location}
                          </Typography>
                        </>
                      }
                    />
                    <ListItemSecondaryAction>
                      {!device.isCurrent && (
                        <IconButton edge="end" onClick={() => handleOpenDialog(device)}>
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider variant="inset" component="li" />
                </React.Fragment>
              ))}
            </List>
          </Paper>

          <Paper elevation={1} sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <SecurityIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Security Settings</Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={<Switch defaultChecked />}
                  label="Require confirmation when logging in from a new device"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={<Switch defaultChecked />}
                  label="Email me when a new device logs into my account"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={<Switch />}
                  label="Automatically log out inactive devices after 30 days"
                />
              </Grid>
            </Grid>
            <Box sx={{ mt: 2 }}>
              <Button variant="contained" color="primary">
                Save Settings
              </Button>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={1} sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              App Preferences
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={<Switch defaultChecked />}
                  label="Enable dark mode"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={<Switch defaultChecked />}
                  label="Show notifications"
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Default Language
                </Typography>
                <TextField
                  fullWidth
                  select
                  defaultValue="en"
                  SelectProps={{
                    native: true,
                  }}
                >
                  <option value="en">English</option>
                  <option value="fr">French</option>
                  <option value="es">Spanish</option>
                  <option value="de">German</option>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Session Timeout (minutes)
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  defaultValue="30"
                  InputProps={{ inputProps: { min: 5, max: 120 } }}
                />
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ mt: 2 }}>
                  <Button variant="contained" color="primary">
                    Save Preferences
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
      >
        <DialogTitle>Disconnect Device</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to disconnect {selectedDevice?.name}? This device will no longer have access to your account.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleCloseDialog} color="error">
            Disconnect
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DeviceSettings;
