import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  MenuItem,
  FormControl,
  Select,
  InputLabel,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ConstructionIcon from '@mui/icons-material/Construction';
import FactCheckIcon from '@mui/icons-material/FactCheck';

const VehicleManagement = () => {
  const [vehicles, setVehicles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    equipment_type: 'truck',
    make: '',
    model: '',
    year: '',
    vin: '',
    license_plate: '',
    status: 'active',
    purchase_date: '',
    purchase_price: '',
    current_value: '',
    notes: ''
  });

  // Simulated data loading
  useEffect(() => {
    // Simulate fetching data from API
    setTimeout(() => {
      const mockVehicles = [
        {
          id: '1',
          name: 'Freightliner Cascadia',
          equipment_type: 'truck',
          make: 'Freightliner',
          model: 'Cascadia 126',
          year: 2022,
          vin: '1FUJGLDV2NLPS5397',
          license_plate: 'TRK-1234',
          status: 'active',
          purchase_date: '2022-05-15',
          purchase_price: 150000,
          current_value: 142000,
          notes: 'Primary long-haul truck',
          maintenance_due: false,
          compliance_issues: false
        },
        {
          id: '2',
          name: 'Great Dane Trailer',
          equipment_type: 'trailer',
          make: 'Great Dane',
          model: 'Champion',
          year: 2021,
          vin: '1GRAA06209F123456',
          license_plate: 'TRL-5678',
          status: 'active',
          purchase_date: '2021-08-10',
          purchase_price: 65000,
          current_value: 60000,
          notes: 'Refrigerated trailer',
          maintenance_due: true,
          compliance_issues: false
        },
        {
          id: '3',
          name: 'Transit Van 250',
          equipment_type: 'van',
          make: 'Ford',
          model: 'Transit 250',
          year: 2023,
          vin: '1FTBW2CM9NKB01234',
          license_plate: 'VAN-9012',
          status: 'maintenance',
          purchase_date: '2023-01-20',
          purchase_price: 45000,
          current_value: 43000,
          notes: 'Local delivery van',
          maintenance_due: true,
          compliance_issues: true
        }
      ];
      
      setVehicles(mockVehicles);
      setIsLoading(false);
    }, 1000);
  }, []);

  const handleOpenDialog = (vehicle = null) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      setFormData({
        name: vehicle.name,
        equipment_type: vehicle.equipment_type,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        vin: vehicle.vin,
        license_plate: vehicle.license_plate,
        status: vehicle.status,
        purchase_date: vehicle.purchase_date,
        purchase_price: vehicle.purchase_price,
        current_value: vehicle.current_value,
        notes: vehicle.notes
      });
    } else {
      setEditingVehicle(null);
      setFormData({
        name: '',
        equipment_type: 'truck',
        make: '',
        model: '',
        year: '',
        vin: '',
        license_plate: '',
        status: 'active',
        purchase_date: '',
        purchase_price: '',
        current_value: '',
        notes: ''
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = () => {
    if (editingVehicle) {
      // Simulate updating vehicle
      const updatedVehicles = vehicles.map(vehicle => 
        vehicle.id === editingVehicle.id ? { ...vehicle, ...formData } : vehicle
      );
      setVehicles(updatedVehicles);
    } else {
      // Simulate adding new vehicle
      const newVehicle = {
        id: String(vehicles.length + 1),
        ...formData,
        maintenance_due: false,
        compliance_issues: false
      };
      setVehicles([...vehicles, newVehicle]);
    }
    
    handleCloseDialog();
  };

  const handleDelete = (id) => {
    // Simulate deleting vehicle
    setVehicles(vehicles.filter(vehicle => vehicle.id !== id));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'maintenance':
        return 'warning';
      case 'out_of_service':
        return 'error';
      case 'retired':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'maintenance':
        return 'In Maintenance';
      case 'out_of_service':
        return 'Out of Service';
      case 'retired':
        return 'Retired';
      default:
        return status;
    }
  };

  const getVehicleTypeLabel = (type) => {
    switch (type) {
      case 'truck':
        return 'Truck';
      case 'trailer':
        return 'Trailer';
      case 'van':
        return 'Van';
      case 'forklift':
        return 'Forklift';
      case 'container':
        return 'Container';
      case 'other':
        return 'Other';
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Vehicle Management</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Vehicle
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Make/Model</TableCell>
              <TableCell>Year</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>License Plate</TableCell>
              <TableCell>Alerts</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {vehicles.map((vehicle) => (
              <TableRow key={vehicle.id}>
                <TableCell>{vehicle.name}</TableCell>
                <TableCell>{getVehicleTypeLabel(vehicle.equipment_type)}</TableCell>
                <TableCell>{`${vehicle.make} ${vehicle.model}`}</TableCell>
                <TableCell>{vehicle.year}</TableCell>
                <TableCell>
                  <Chip 
                    label={getStatusLabel(vehicle.status)}
                    color={getStatusColor(vehicle.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{vehicle.license_plate}</TableCell>
                <TableCell>
                  {vehicle.maintenance_due && (
                    <Tooltip title="Maintenance Due">
                      <IconButton size="small" color="warning">
                        <ConstructionIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {vehicle.compliance_issues && (
                    <Tooltip title="Compliance Issues">
                      <IconButton size="small" color="error">
                        <FactCheckIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex' }}>
                    <IconButton size="small" onClick={() => handleOpenDialog(vehicle)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(vehicle.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Vehicle Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Vehicle Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Vehicle Type</InputLabel>
                <Select
                  name="equipment_type"
                  value={formData.equipment_type}
                  onChange={handleChange}
                  label="Vehicle Type"
                >
                  <MenuItem value="truck">Truck</MenuItem>
                  <MenuItem value="trailer">Trailer</MenuItem>
                  <MenuItem value="van">Van</MenuItem>
                  <MenuItem value="forklift">Forklift</MenuItem>
                  <MenuItem value="container">Container</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Make"
                name="make"
                value={formData.make}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Model"
                name="model"
                value={formData.model}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Year"
                name="year"
                type="number"
                value={formData.year}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="VIN/Serial Number"
                name="vin"
                value={formData.vin}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="License Plate"
                name="license_plate"
                value={formData.license_plate}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  label="Status"
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="maintenance">In Maintenance</MenuItem>
                  <MenuItem value="out_of_service">Out of Service</MenuItem>
                  <MenuItem value="retired">Retired</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Purchase Date"
                name="purchase_date"
                type="date"
                value={formData.purchase_date}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Purchase Price"
                name="purchase_price"
                type="number"
                value={formData.purchase_price}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {editingVehicle ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VehicleManagement; 