'use client'; // Add this at the top to make the component a client component

import * as React from 'react';
import { alpha, useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Image from 'next/image';

export default function AboutUs() {
  const theme = useTheme();
  
  const primaryColor = '#03a9f4'; // Matches your brand's baby blue
  const hoverColor = '#81d4fa';   // Darker baby blue for hover
  
  return (
    <Box
      sx={{
        width: '100%',
        color: theme.palette.mode === 'light' ? '#333' : '#FFF',
        backgroundColor: theme.palette.background.default,
        py: { xs: 8, md: 12 },
      }}
    >
      <Container>
        {/* Introduction Section */}
        <Stack spacing={4} sx={{ alignItems: 'center' }}>
          <Typography
            variant="h1"
            align="center"
            sx={{
              fontSize: 'clamp(2rem, 6vw, 3rem)',
              color: primaryColor,
              fontFamily: '"Poppins", sans-serif',
              fontWeight: 600,
              letterSpacing: '-0.02em',
            }}
          >
            About Dott
          </Typography>
          
          <Typography
            variant="h5"
            align="center"
            sx={{
              maxWidth: '800px',
              fontWeight: 'normal',
              color: theme.palette.text.secondary,
              fontFamily: '"Inter", sans-serif',
              fontSize: '1.1rem',
            }}
          >
            Dott is a comprehensive platform built for small business owners, freelancers, consultants, and micro-businesses. 
            We believe in empowering businesses with the tools they need to manage their finances, HR, inventory, and much more—all in one place.
          </Typography>
          
          {/* Company Mission */}
          <Typography
            variant="h4"
            align="center"
            sx={{
              fontWeight: 500,
              fontFamily: '"Poppins", sans-serif',
              color: theme.palette.mode === 'light' ? primaryColor : '#FFF',
              mt: 4,
            }}
          >
            Our Mission
          </Typography>
          
          <Typography
            align="center"
            sx={{
              maxWidth: '800px',
              color: theme.palette.text.secondary,
              fontFamily: '"Inter", sans-serif',
              fontSize: '1.1rem',
            }}
          >
            At Dott, our mission is to simplify business management for entrepreneurs by providing an all-in-one platform. 
            From invoicing and payroll to mobile money integration, we make it easy for businesses to thrive and grow.
          </Typography>
          
          {/* Company Vision */}
          <Typography
            variant="h4"
            align="center"
            sx={{
              fontWeight: 500,
              fontFamily: '"Poppins", sans-serif',
              color: theme.palette.mode === 'light' ? primaryColor : '#FFF',
              mt: 4,
            }}
          >
            Our Vision
          </Typography>
          
          <Typography
            align="center"
            sx={{
              maxWidth: '800px',
              color: theme.palette.text.secondary,
              fontFamily: '"Inter", sans-serif',
              fontSize: '1.1rem',
            }}
          >
            We envision a world where small businesses have the power to compete and succeed on their own terms. 
            Our goal is to provide the tools and resources that make running a business easier, no matter the size or location.
          </Typography>

          {/* Values Section */}
          <Stack spacing={2} sx={{ alignItems: 'center', mt: 6 }}>
            <Typography
              variant="h4"
              align="center"
              sx={{
                fontWeight: 500,
                fontFamily: '"Poppins", sans-serif',
                color: theme.palette.mode === 'light' ? primaryColor : '#FFF',
              }}
            >
              Our Values
            </Typography>
            <Typography
              align="center"
              sx={{
                maxWidth: '800px',
                color: theme.palette.text.secondary,
                fontFamily: '"Inter", sans-serif',
                fontSize: '1.1rem',
              }}
            >
              - Simplicity: We strive to make every feature easy to use and accessible to all.<br/>
              - Innovation: We continuously innovate to bring the latest solutions to small business challenges.<br/>
              - Empowerment: We empower small business owners with the tools they need to succeed.<br/>
              - Customer Focus: We prioritize our customers and their business needs in every decision.
            </Typography>
          </Stack>

          {/* Call to Action */}
          <Button
            variant="contained"
            size="large"
            sx={{
              mt: 6,
              fontSize: '1rem',
              px: 4,
              py: 1.5,
              backgroundColor: primaryColor,
              '&:hover': {
                backgroundColor: hoverColor,
              },
              borderRadius: '50px',
              fontFamily: '"Inter", sans-serif',
              fontWeight: 600,
              letterSpacing: '0.02em',
            }}
          >
            Learn More About Us
          </Button>
        </Stack>

        {/* Optional Team or Illustration Section */}
        <Box sx={{ mt: 10, display: 'flex', justifyContent: 'center' }}>
          <Image
            src="/static/images/Team-Building-4--Streamline-Brooklyn.png"  // Replace with an actual image or illustration
            alt="About Us Illustration"
            width={400}
            height={300}
            style={{ maxWidth: '100%', height: 'auto' }}
          />
        </Box>
      </Container>
    </Box>
  );
}
