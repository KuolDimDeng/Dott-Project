'use client';

import React from 'react';
import { Box, Container, Grid, Typography, Card, CardContent } from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PeopleIcon from '@mui/icons-material/People';
import InventoryIcon from '@mui/icons-material/Inventory';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';

const features = [
  {
    title: 'Simple Accounting',
    description: 'Easy-to-use accounting tools for small businesses. Track income, expenses, and cash flow.',
    icon: <AccountBalanceIcon sx={{ fontSize: 40 }} />,
  },
  {
    title: 'Payroll & HR',
    description: 'Manage employees, payroll, benefits, and HR documents all in one place.',
    icon: <PeopleIcon sx={{ fontSize: 40 }} />,
  },
  {
    title: 'Inventory Management',
    description: 'Track stock levels, set reorder points, and manage suppliers efficiently.',
    icon: <InventoryIcon sx={{ fontSize: 40 }} />,
  },
  {
    title: 'Reports & Analytics',
    description: 'Get insights with customizable reports and real-time business analytics.',
    icon: <AssessmentIcon sx={{ fontSize: 40 }} />,
  },
  {
    title: 'Mobile Money',
    description: 'Accept payments and manage transactions on the go with mobile integration.',
    icon: <PhoneAndroidIcon sx={{ fontSize: 40 }} />,
  },
  {
    title: 'Invoicing',
    description: 'Create and send professional invoices, track payments, and manage receivables.',
    icon: <ReceiptIcon sx={{ fontSize: 40 }} />,
  },
];

export default function Features() {
  return (
    <Box
      id="features"
      sx={{
        py: { xs: 8, sm: 12 },
        bgcolor: 'background.default',
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ mb: { xs: 6, sm: 8 }, textAlign: 'center' }}>
          <Typography
            component="h2"
            variant="h2"
            sx={{
              mb: 2,
              background: (theme) =>
                theme.palette.mode === 'light'
                  ? 'linear-gradient(45deg, #1976d2, #2196f3)'
                  : 'linear-gradient(45deg, #64b5f6, #90caf9)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Features
          </Typography>
          <Typography
            variant="h5"
            color="text.secondary"
            sx={{ maxWidth: 800, mx: 'auto' }}
          >
            Everything you need to run your business efficiently
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {features.map((feature) => (
            <Grid item xs={12} sm={6} md={4} key={feature.title}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: (theme) =>
                      theme.palette.mode === 'light'
                        ? '0 4px 20px rgba(0,0,0,0.1)'
                        : '0 4px 20px rgba(0,0,0,0.3)',
                  },
                }}
              >
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      mb: 2,
                      color: 'primary.main',
                    }}
                  >
                    {feature.icon}
                  </Box>
                  <Typography
                    variant="h5"
                    component="h3"
                    gutterBottom
                    sx={{ fontWeight: 600 }}
                  >
                    {feature.title}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
