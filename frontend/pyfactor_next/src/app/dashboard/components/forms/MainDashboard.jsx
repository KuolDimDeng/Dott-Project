import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import DescriptionIcon from '@mui/icons-material/Description';
import PeopleIcon from '@mui/icons-material/People';
import InventoryIcon from '@mui/icons-material/Inventory';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: theme.shadows[4],
  },
}));

const DashboardPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const quickStartGuides = [
    {
      title: 'Create an Invoice',
      icon: <DescriptionIcon fontSize="large" color="primary" />,
      description: 'Learn how to create and manage invoices for your clients.',
      action: () => {/* Navigate to invoice creation page */},
    },
    {
      title: 'Manage Customers',
      icon: <PeopleIcon fontSize="large" color="secondary" />,
      description: 'Add and manage your customer information efficiently.',
      action: () => {/* Navigate to customer management page */},
    },
    {
      title: 'Track Inventory',
      icon: <InventoryIcon fontSize="large" color="error" />,
      description: 'Keep track of your product inventory and stock levels.',
      action: () => {/* Navigate to inventory management page */},
    },
  ];

  return (
    <Box sx={{ backgroundColor: theme.palette.background.default, p: 3, borderRadius: 2 }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: theme.palette.text.primary }}>
        Welcome to Your Dashboard
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {quickStartGuides.map((guide, index) => (
          <Grid item xs={12} md={4} key={index}>
            <StyledPaper elevation={3}>
              <Box>
                {guide.icon}
                <Typography variant="h6" sx={{ fontWeight: 'bold', my: 2 }}>
                  {guide.title}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {guide.description}
                </Typography>
              </Box>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={guide.action}
                sx={{ mt: 2 }}
              >
                Get Started
              </Button>
            </StyledPaper>
          </Grid>
        ))}
      </Grid>

      <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', color: theme.palette.text.primary, mt: 4 }}>
        Key Performance Indicators
      </Typography>
      
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Box display="flex" alignItems="center" mb={2}>
              <TrendingUpIcon sx={{ color: theme.palette.success.main, mr: 1, fontSize: 40 }} />
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Revenue Growth Rate
              </Typography>
            </Box>
            <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 2 }}>
              8.5%
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Your revenue is growing steadily. Keep up the good work!
            </Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            {/* You can add another KPI here or a mini chart */}
          </Grid>
        </Grid>
      </Paper>

      <Button 
        variant="contained" 
        color="secondary" 
        size="large"
        onClick={() => {/* Navigate to full KPI dashboard */}}
        sx={{ mt: 2 }}
      >
        View Full KPI Dashboard
      </Button>
    </Box>
  );
};

export default DashboardPage;