'use client';

import React, { useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Chip,
  Stack,
  Alert,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  ArrowDropDown,
  Schedule,
  LocalShipping,
  Construction,
  RateReview,
  CheckCircle,
  Receipt,
  Paid,
  Lock,
  Cancel,
  Pause,
  Build,
  Phone
} from '@mui/icons-material';
import jobsApi from '@/app/utils/api/jobsApi';

const statusIcons = {
  quote: Schedule,
  approved: CheckCircle,
  scheduled: Schedule,
  in_transit: LocalShipping,
  in_progress: Construction,
  pending_review: RateReview,
  completed: CheckCircle,
  invoiced: Receipt,
  paid: Paid,
  closed: Lock,
  cancelled: Cancel,
  on_hold: Pause,
  requires_parts: Build,
  callback_needed: Phone
};

const statusColors = {
  quote: 'info',
  approved: 'success',
  scheduled: 'primary',
  in_transit: 'warning',
  in_progress: 'warning',
  pending_review: 'warning',
  completed: 'success',
  invoiced: 'info',
  paid: 'success',
  closed: 'default',
  cancelled: 'error',
  on_hold: 'warning',
  requires_parts: 'warning',
  callback_needed: 'warning'
};

const validTransitions = {
  quote: ['approved', 'cancelled'],
  approved: ['scheduled', 'cancelled'],
  scheduled: ['in_transit', 'in_progress', 'cancelled', 'on_hold'],
  in_transit: ['in_progress', 'on_hold'],
  in_progress: ['pending_review', 'completed', 'on_hold', 'requires_parts'],
  pending_review: ['completed', 'in_progress'],
  completed: ['invoiced'],
  invoiced: ['paid'],
  paid: ['closed'],
  on_hold: ['scheduled', 'in_progress', 'cancelled'],
  requires_parts: ['in_progress', 'on_hold'],
  callback_needed: ['scheduled', 'cancelled'],
};

const JobStatusTransition = ({ job, onStatusChange }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [location, setLocation] = useState(null);

  const currentStatus = job?.status || 'quote';
  const availableTransitions = validTransitions[currentStatus] || [];
  const StatusIcon = statusIcons[currentStatus] || Schedule;

  React.useEffect(() => {
    if (navigator.geolocation && confirmDialog) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }, [confirmDialog]);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleStatusSelect = (status) => {
    setSelectedStatus(status);
    handleMenuClose();
    setConfirmDialog(true);
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError('');

    try {
      const data = {
        status: selectedStatus,
        reason,
        ...location
      };

      const response = await jobsApi.updateStatus(job.id, data);
      onStatusChange && onStatusChange(response.data.job);
      setConfirmDialog(false);
      setReason('');
    } catch (err) {
      console.error('Error updating status:', err);
      setError(err.response?.data?.error || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <>
      <Stack direction="row" spacing={2} alignItems="center">
        <Chip
          icon={<StatusIcon />}
          label={getStatusLabel(currentStatus)}
          color={statusColors[currentStatus]}
          size="medium"
        />
        {availableTransitions.length > 0 && (
          <Button
            variant="outlined"
            size="small"
            endIcon={<ArrowDropDown />}
            onClick={handleMenuOpen}
          >
            Change Status
          </Button>
        )}
      </Stack>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        {availableTransitions.map((status) => {
          const Icon = statusIcons[status];
          return (
            <MenuItem key={status} onClick={() => handleStatusSelect(status)}>
              <ListItemIcon>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText>{getStatusLabel(status)}</ListItemText>
              <Chip 
                label={getStatusLabel(status)} 
                size="small" 
                color={statusColors[status]}
                sx={{ ml: 2 }}
              />
            </MenuItem>
          );
        })}
      </Menu>

      <Dialog 
        open={confirmDialog} 
        onClose={() => setConfirmDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Confirm Status Change
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3}>
            {error && <Alert severity="error">{error}</Alert>}
            
            <Typography>
              Change job status from <strong>{getStatusLabel(currentStatus)}</strong> to{' '}
              <strong>{getStatusLabel(selectedStatus)}</strong>?
            </Typography>
            
            <TextField
              label="Reason (optional)"
              multiline
              rows={3}
              fullWidth
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Add any notes about this status change..."
            />
            
            {selectedStatus === 'completed' && (
              <Alert severity="info">
                After marking as completed, you'll be prompted to capture customer 
                and supervisor signatures.
              </Alert>
            )}
            
            {selectedStatus === 'cancelled' && (
              <Alert severity="warning">
                This action will cancel the job. This cannot be easily undone.
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            color={selectedStatus === 'cancelled' ? 'error' : 'primary'}
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default JobStatusTransition;