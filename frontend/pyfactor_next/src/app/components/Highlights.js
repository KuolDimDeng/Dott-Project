import * as React from 'react';
import { Container, Grid, Paper, Typography, Box } from '@mui/material';
import SpeedIcon from '@mui/icons-material/Speed';
import SecurityIcon from '@mui/icons-material/Security';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import UpdateIcon from '@mui/icons-material/Update';
import IntegrationInstructionsIcon from '@mui/icons-material/IntegrationInstructions';
import AnalyticsIcon from '@mui/icons-material/Analytics';

const highlights = [
  {
    title: 'Lightning Fast',
    description: 'Experience top speed and efficiency in managing your business processes with Dott.',
    icon: SpeedIcon,
    color: '#4caf50',
  },
  {
    title: 'Bank-Level Security',
    description: 'Your data is secured with cutting-edge encryption, ensuring peace of mind.',
    icon: SecurityIcon,
    color: '#f44336',
  },
  {
    title: '24/7 Customer Support',
    description: 'Our expert team is available around the clock to assist you whenever needed.',
    icon: SupportAgentIcon,
    color: '#2196f3',
  },
  {
    title: 'Continuous Updates',
    description: 'Stay ahead with regular feature updates, ensuring you always have the latest tools at your disposal.',
    icon: UpdateIcon,
    color: '#ff9800',
  },
  {
    title: 'Seamless Integration',
    description: 'Easily integrate Dott with your existing software and streamline all business operations.',
    icon: IntegrationInstructionsIcon,
    color: '#9c27b0',
  },
  {
    title: 'Advanced Analytics',
    description: 'Get detailed insights to make informed decisions and boost your business growth.',
    icon: AnalyticsIcon,
    color: '#00bcd4',
  },
];

export default function Highlights() {
  return (
    <Box sx={{ bgcolor: '#ffffff', py: 12 }}> {/* Changed bgcolor to white */}
      <Container maxWidth="lg">
        <Typography
          variant="h2"
          align="center"
          fontFamily="Poppins, sans-serif"
          fontWeight="bold"
          mb={8}
        >
          Why Choose Dott
        </Typography>
        <Grid container spacing={4}>
          {highlights.map((highlight) => (
            <Grid item xs={12} sm={6} md={4} key={highlight.title}>
              <Paper
                elevation={3}
                sx={{
                  p: 4,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  borderRadius: 4,
                  transition: '0.3s',
                  '&:hover': { transform: 'translateY(-10px)' },
                }}
              >
                <Box
                  sx={{
                    bgcolor: highlight.color,
                    borderRadius: '50%',
                    p: 2,
                    mb: 3,
                  }}
                >
                  <highlight.icon sx={{ fontSize: 40, color: 'white' }} />
                </Box>
                <Typography
                  variant="h5"
                  component="h3"
                  align="center"
                  gutterBottom
                  fontFamily="Poppins, sans-serif"
                  fontWeight="bold"
                >
                  {highlight.title}
                </Typography>
                <Typography align="center" fontFamily="Inter, sans-serif">
                  {highlight.description}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
