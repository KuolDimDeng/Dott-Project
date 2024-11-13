import React, { useState, useEffect } from 'react';
import {
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useTheme,
  Box,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import axiosInstance from '@/lib/axiosConfig';;
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useUserMessageContext } from '@/contexts/UserMessageContext';

const FixedAssetManagement = () => {
  const [assets, setAssets] = useState([]);
  const [open, setOpen] = useState(false);
  const theme = useTheme();

  const [selectedAsset, setSelectedAsset] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    asset_type: '',
    acquisition_date: '',
    acquisition_cost: '',
    depreciation_method: '',
    useful_life: '',
    salvage_value: '',
    location: '',
    asset_tag: '',
  });

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      const response = await axiosInstance.get('/api/finance/fixed-assets/');
      console.log('Accounts API Respond:', response.data)
      setAssets(response.data);
    } catch (error) {
      console.error('Error fetching fixed assets:', error);
    }
  };

  const handleOpen = (asset = null) => {
    if (asset) {
      setSelectedAsset(asset);
      setFormData(asset);    
    } else {
      setSelectedAsset(null);
      setFormData({
        name: '',
        asset_type: '',
        acquisition_date: '',
        acquisition_cost: '',
        depreciation_method: '',
        useful_life: '',
        salvage_value: '',
        location: '',
        asset_tag: '',
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedAsset) {
        await axiosInstance.put(`/api/finance/fixed-assets/${selectedAsset.id}/`, formData);
      } else {
        await axiosInstance.post('/api/finance/fixed-assets/', formData);
      }
      fetchAssets();
      handleClose();
    } catch (error) {
      console.error('Error saving fixed asset:', error);
    }
  };

  return (
    <Box sx={{ backgroundColor: theme.palette.background.default, p: 3, borderRadius: 2 }}>
      <Typography variant="h4" gutterBottom>
        Fixed Asset Management
      </Typography>
      <Button variant="contained" color="primary" onClick={() => handleOpen()} style={{ marginBottom: '1rem' }}>
        Add New Asset
      </Button>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Asset Type</TableCell>
              <TableCell>Acquisition Date</TableCell>
              <TableCell>Acquisition Cost</TableCell>
              <TableCell>Book Value</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {assets.map((asset) => (
              <TableRow key={asset.id}>
                <TableCell>{asset.name}</TableCell>
                <TableCell>{asset.asset_type}</TableCell>
                <TableCell>{asset.acquisition_date}</TableCell>
                <TableCell>${asset.acquisition_cost}</TableCell>
                <TableCell>${asset.book_value}</TableCell>
                <TableCell>
                  <Button variant="outlined" color="primary" onClick={() => handleOpen(asset)}>
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{selectedAsset ? 'Edit Asset' : 'Add New Asset'}</DialogTitle>
        <DialogContent>
          <TextField
            name="name"
            label="Asset Name"
            fullWidth
            value={formData.name}
            onChange={handleChange}
            margin="normal"
          />
          <TextField
            name="asset_type"
            label="Asset Type"
            fullWidth
            value={formData.asset_type}
            onChange={handleChange}
            margin="normal"
          />
          <TextField
            name="acquisition_date"
            label="Acquisition Date"
            type="date"
            fullWidth
            value={formData.acquisition_date}
            onChange={handleChange}
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            name="acquisition_cost"
            label="Acquisition Cost"
            type="number"
            fullWidth
            value={formData.acquisition_cost}
            onChange={handleChange}
            margin="normal"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Depreciation Method</InputLabel>
            <Select
              name="depreciation_method"
              value={formData.depreciation_method}
              onChange={handleChange}
            >
              <MenuItem value="SL">Straight Line</MenuItem>
              <MenuItem value="DB">Declining Balance</MenuItem>
              <MenuItem value="SYD">Sum of Years Digits</MenuItem>
              <MenuItem value="UOP">Units of Production</MenuItem>
            </Select>
          </FormControl>
          <TextField
            name="useful_life"
            label="Useful Life (years)"
            type="number"
            fullWidth
            value={formData.useful_life}
            onChange={handleChange}
            margin="normal"
          />
          <TextField
            name="salvage_value"
            label="Salvage Value"
            type="number"
            fullWidth
            value={formData.salvage_value}
            onChange={handleChange}
            margin="normal"
          />
          <TextField
            name="location"
            label="Location"
            fullWidth
            value={formData.location}
            onChange={handleChange}
            margin="normal"
          />
          <TextField
            name="asset_tag"
            label="Asset Tag"
            fullWidth
            value={formData.asset_tag}
            onChange={handleChange}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="primary">
            Cancel
          </Button>
          <Button onClick={handleSubmit} color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FixedAssetManagement;