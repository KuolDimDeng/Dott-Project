'use client';

import * as React from 'react';
import { Container, Grid, Paper, Typography, Box } from '@mui/material';
import Image from 'next/image';
import styles from '@/app/components/ImageStyles.modules.css'; // Import your CSS module (or use inline styles)

const highlights = [
  {
    title: 'Freelancers',
    description:
      'Dott helps freelancers manage their money. Create and send professional invoices in minutes.',
    imagePath: '/static/images/Freelancer.png',
  },
  {
    title: 'Self-employed Entrepreneurs',
    description:
      'Self-employed entrepreneurs using Dott to manage their money. Pay your staff easily with our payroll features.',
    imagePath: '/static/images/Self-employed.png',
  },
  {
    title: 'Contractors',
    description:
      'A contractor using Dott to manage their money. Track your business expenses with our free accounting tools.',
    imagePath: '/static/images/Contractor.png',
  },
  {
    title: 'Consultants',
    description:
      'A consultant using Dott to manage their money. Set up recurring invoices and payments for retainer clients.',
    imagePath: '/static/images/Consultant2.png',
  },
  {
    title: 'Micro Business Owners',
    description:
      'Micro business owners use Dott to manage their finances and accept mobile payments with ease. Track expenses and grow your business effortlessly.',
    imagePath: '/static/images/MicroBusiness.png', // New category and image for Micro Business
  },

  {
    title: 'Non-Profit Leaders', // New Non-Profit Category
    description:
      'Small non-profits (NGO) use Dott to manage donations, track expenses, and issue receipts to donors, helping them focus on their mission.',
    imagePath: '/static/images/NonProfit.png', // Add corresponding image for Non-Profit
  },
];

export default function Highlights() {
  return (
    <Box sx={{ bgcolor: '#ffffff', py: 12 }}>
      <Container maxWidth="lg">
        <Typography
          variant="h3"
          align="center"
          fontFamily="Poppins, sans-serif"
          fontWeight="bold"
          mb={8}
        >
          Built for the small business owners.
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
                <Image
                  src={highlight.imagePath}
                  alt={highlight.title}
                  width={200} // Adjust as necessary
                  height={200} // Adjust as necessary
                  className={styles.imageStyle} // Use your CSS class here
                  style={{ borderRadius: '8px', marginBottom: '16px' }} // Optional styling for the images
                />
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
