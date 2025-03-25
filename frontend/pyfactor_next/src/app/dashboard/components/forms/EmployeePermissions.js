import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { axiosInstance } from '@/lib/axiosConfig';

const EmployeePermissions = ({ employee, open, onClose }) => {
  // Guard clause for null employee
  if (!employee) {
    return null;
  }

  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  useEffect(() => {
    if (open && employee) {
      fetchAvailablePermissions();
      setSelectedPermissions(employee.site_access_privileges || []);
    }
  }, [open, employee]);

  const fetchAvailablePermissions = async () => {
    try {
      const response = await axiosInstance.get('/api/hr/permissions/available/');
      setAvailablePermissions(response.data);
    } catch (error) {
      console.error('Error fetching available permissions:', error);
    }
  };

  const handleTogglePermission = (permissionId) => {
    setSelectedPermissions((prev) => {
      if (prev.includes(permissionId)) {
        return prev.filter((id) => id !== permissionId);
      } else {
        return [...prev, permissionId];
      }
    });
  };

  const handleSave = async () => {
    try {
      await axiosInstance.post(`/api/hr/employees/${employee.id}/permissions/`, {
        permissions: selectedPermissions,
      });
      onClose();
    } catch (error) {
      console.error('Error saving permissions:', error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Set Permissions for {employee.first_name} {employee.last_name}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Select the menu options this employee can access:
          </Typography>
          <List>
            {availablePermissions.map((permission) => (
              <ListItem
                key={permission.id}
                button
                onClick={() => handleTogglePermission(permission.id)}
              >
                <ListItemIcon>
                  <Checkbox
                    edge="start"
                    checked={selectedPermissions.includes(permission.id)}
                    tabIndex={-1}
                    disableRipple
                  />
                </ListItemIcon>
                <ListItemText primary={permission.name} />
              </ListItem>
            ))}
          </List>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Save Permissions
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EmployeePermissions; 