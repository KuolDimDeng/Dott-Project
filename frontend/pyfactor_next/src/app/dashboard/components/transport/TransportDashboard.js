import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  Chip,
  Button,
  CircularProgress,
  useTheme
} from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import RouteIcon from '@mui/icons-material/Route';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import ConstructionIcon from '@mui/icons-material/Construction';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import PieChart from '../charts/PieChart';

const TransportDashboard = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    vehicles: {
      total: 0,
      byType: [],
      byStatus: [],
      maintenanceDue: 0
    },
    loads: {
      total: 0,
      byStatus: [],
      upcomingPickups: 0,
      upcomingDeliveries: 0
    },
    compliance: {
      expiringSoon: 0,
      expired: 0
    },
    routes: {
      total: 0,
      mostUsed: []
    }
  });
  
  const theme = useTheme();

  // Simulated data loading - in a real app, this would fetch from your API
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setDashboardData({
        vehicles: {
          total: 14,
          byType: [
            { name: 'Truck', value: 5 },
            { name: 'Trailer', value: 4 },
            { name: 'Van', value: 3 },
            { name: 'Other', value: 2 }
          ],
          byStatus: [
            { name: 'Active', value: 9 },
            { name: 'Maintenance', value: 2 },
            { name: 'Out of Service', value: 1 },
            { name: 'Retired', value: 2 }
          ],
          maintenanceDue: 3
        },
        loads: {
          total: 28,
          byStatus: [
            { name: 'Pending', value: 5 },
            { name: 'Assigned', value: 8 },
            { name: 'In Transit', value: 10 },
            { name: 'Delivered', value: 4 },
            { name: 'Cancelled', value: 1 }
          ],
          upcomingPickups: 6,
          upcomingDeliveries: 4
        },
        compliance: {
          expiringSoon: 4,
          expired: 1
        },
        routes: {
          total: 12,
          mostUsed: [
            { name: 'Chicago to Detroit', count: 15 },
            { name: 'Detroit to Pittsburgh', count: 12 },
            { name: 'Pittsburgh to New York', count: 10 }
          ]
        }
      });
      setIsLoading(false);
    }, 1000);
  }, []);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
        Transport Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        {/* Summary Cards Row */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <DirectionsCarIcon sx={{ fontSize: 40, color: theme.palette.primary.main, mr: 2 }} />
                <Box>
                  <Typography variant="h4">{dashboardData.vehicles.total}</Typography>
                  <Typography variant="subtitle1">Vehicles</Typography>
                </Box>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  {dashboardData.vehicles.maintenanceDue} vehicles due for maintenance
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <LocalShippingIcon sx={{ fontSize: 40, color: theme.palette.primary.main, mr: 2 }} />
                <Box>
                  <Typography variant="h4">{dashboardData.loads.total}</Typography>
                  <Typography variant="subtitle1">Loads/Jobs</Typography>
                </Box>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  {dashboardData.loads.upcomingPickups} upcoming pickups
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {dashboardData.loads.upcomingDeliveries} upcoming deliveries
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <FactCheckIcon sx={{ fontSize: 40, color: theme.palette.primary.main, mr: 2 }} />
                <Box>
                  <Typography variant="h4">{dashboardData.compliance.expiringSoon + dashboardData.compliance.expired}</Typography>
                  <Typography variant="subtitle1">Compliance Issues</Typography>
                </Box>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Box>
                {dashboardData.compliance.expired > 0 && (
                  <Typography variant="body2" color="error">
                    {dashboardData.compliance.expired} expired documents
                  </Typography>
                )}
                <Typography variant="body2" color="warning.main">
                  {dashboardData.compliance.expiringSoon} documents expiring soon
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Charts Row */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Vehicles by Type" />
            <CardContent>
              <Box sx={{ height: 300 }}>
                <PieChart
                  data={dashboardData.vehicles.byType}
                  colors={['#1976d2', '#42a5f5', '#90caf9', '#e3f2fd']}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Loads by Status" />
            <CardContent>
              <Box sx={{ height: 300 }}>
                <PieChart
                  data={dashboardData.loads.byStatus}
                  colors={['#ff9800', '#ffa726', '#ffb74d', '#4caf50', '#e57373']}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Most Used Routes */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Most Used Routes" />
            <CardContent>
              <List>
                {dashboardData.routes.mostUsed.map((route, index) => (
                  <ListItem key={index} divider={index < dashboardData.routes.mostUsed.length - 1}>
                    <ListItemText 
                      primary={route.name} 
                      secondary={`Used ${route.count} times`} 
                    />
                    <Chip 
                      label={`#${index + 1}`} 
                      color={index === 0 ? "primary" : index === 1 ? "secondary" : "default"} 
                      size="small" 
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader title="Quick Actions" />
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Button 
                    variant="outlined" 
                    fullWidth
                    startIcon={<LocalShippingIcon />}
                    onClick={() => window.location.href = '/dashboard?view=transport-loads'}
                  >
                    Add New Load
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button 
                    variant="outlined" 
                    fullWidth
                    startIcon={<DirectionsCarIcon />}
                    onClick={() => window.location.href = '/dashboard?view=transport-equipment'}
                  >
                    Add New Vehicle
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button 
                    variant="outlined" 
                    fullWidth
                    startIcon={<RouteIcon />}
                    onClick={() => window.location.href = '/dashboard?view=transport-routes'}
                  >
                    Manage Routes
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button 
                    variant="outlined" 
                    fullWidth
                    startIcon={<ConstructionIcon />}
                    onClick={() => window.location.href = '/dashboard?view=transport-maintenance'}
                  >
                    Schedule Maintenance
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TransportDashboard; 