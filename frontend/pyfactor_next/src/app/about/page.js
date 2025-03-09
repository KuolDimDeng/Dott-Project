'use client';

import * as React from 'react';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import HomeIcon from '@mui/icons-material/Home';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function AboutUs() {
  const theme = useTheme();
  const router = useRouter();

  const primaryColor = '#03a9f4'; // Matches your brand's baby blue
  const hoverColor = '#81d4fa'; // Lighter baby blue for hover

  const values = [
    {
      title: "Simplicity",
      description: "We design our platform with intuitive interfaces that make complex business operations straightforward and accessible to everyone, regardless of technical expertise."
    },
    {
      title: "Innovation",
      description: "We continuously evolve our platform with cutting-edge features that anticipate the changing needs of small businesses in an increasingly digital economy."
    },
    {
      title: "Empowerment",
      description: "We believe in giving small business owners the same caliber of tools that larger enterprises enjoy, leveling the playing field and enabling growth on their terms."
    },
    {
      title: "Customer Focus",
      description: "Every feature we develop, every support interaction we have, and every business decision we make is guided by what will best serve our customers' success."
    }
  ];

  return (
    <Box
      id="about"
      sx={{
        width: '100%',
        color: theme.palette.mode === 'light' ? '#333' : '#FFF',
        backgroundColor: theme.palette.background.default,
        py: { xs: 8, md: 12 },
      }}
    >
      <Container>
        {/* Home Button */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'flex-start' }}>
          <Button
            variant="contained"
            component="a"
            href="/"
            startIcon={<HomeIcon />}
            sx={{
              backgroundColor: primaryColor,
              '&:hover': {
                backgroundColor: hoverColor,
              },
              borderRadius: '50px',
              fontFamily: '"Inter", sans-serif',
              fontWeight: 600,
              boxShadow: '0 4px 14px 0 rgba(3, 169, 244, 0.39)',
            }}
          >
            Back to Home
          </Button>
        </Box>
        {/* Introduction Section */}
        <Grid container spacing={6} alignItems="center">
          <Grid item xs={12} md={6}>
            <Stack spacing={3}>
              <Typography
                variant="h1"
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
                variant="body1"
                sx={{
                  color: theme.palette.text.secondary,
                  fontFamily: '"Inter", sans-serif',
                  fontSize: '1.1rem',
                  lineHeight: 1.6,
                }}
              >
                Founded in 2023, Dott is a comprehensive business management platform designed specifically for small businesses, freelancers, consultants, and micro-enterprises. We combine financial management, HR tools, inventory tracking, and integrated payment solutions into one seamless platform.
              </Typography>

              <Typography
                variant="body1"
                sx={{
                  color: theme.palette.text.secondary,
                  fontFamily: '"Inter", sans-serif',
                  fontSize: '1.1rem',
                  lineHeight: 1.6,
                }}
              >
                What sets Dott apart is our deep understanding of the unique challenges faced by small businesses, especially in emerging markets. Our platform adapts to local business environments while maintaining global best practices in financial management and security.
              </Typography>
            </Stack>
          </Grid>
          <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: 'center' }}>
            <Image
              src="/static/images/Team-Building-4--Streamline-Brooklyn.png"
              alt="Dott Team Illustration"
              width={500}
              height={375}
              style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px' }}
              priority
            />
          </Grid>
        </Grid>

        {/* Mission & Vision Section */}
        <Box sx={{ mt: 12 }}>
          <Grid container spacing={6}>
            <Grid item xs={12} md={6}>
              <Card 
                elevation={3} 
                sx={{ 
                  height: '100%',
                  borderRadius: 2,
                  p: 2,
                  transition: 'transform 0.3s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                  }
                }}
              >
                <CardContent>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 600,
                      fontFamily: '"Poppins", sans-serif',
                      color: primaryColor,
                      mb: 3,
                    }}
                  >
                    Our Mission
                  </Typography>

                  <Typography
                    variant="body1"
                    sx={{
                      color: theme.palette.text.secondary,
                      fontFamily: '"Inter", sans-serif',
                      fontSize: '1.1rem',
                      lineHeight: 1.8,
                    }}
                  >
                    At Dott, our mission is to empower small businesses to thrive by providing them with affordable, accessible, and powerful management tools that simplify day-to-day operations. We believe that when the administrative burden is reduced, creativity and growth can flourish.
                  </Typography>
                  
                  <Typography
                    variant="body1"
                    sx={{
                      color: theme.palette.text.secondary,
                      fontFamily: '"Inter", sans-serif',
                      fontSize: '1.1rem',
                      lineHeight: 1.8,
                      mt: 2,
                    }}
                  >
                    We're committed to breaking down technological barriers and making sophisticated business management accessible to entrepreneurs regardless of their technical background or location.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card 
                elevation={3} 
                sx={{ 
                  height: '100%',
                  borderRadius: 2,
                  p: 2,
                  transition: 'transform 0.3s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                  }
                }}
              >
                <CardContent>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 600,
                      fontFamily: '"Poppins", sans-serif',
                      color: primaryColor,
                      mb: 3,
                    }}
                  >
                    Our Vision
                  </Typography>

                  <Typography
                    variant="body1"
                    sx={{
                      color: theme.palette.text.secondary,
                      fontFamily: '"Inter", sans-serif',
                      fontSize: '1.1rem',
                      lineHeight: 1.8,
                    }}
                  >
                    We envision a world where small businesses have access to the same quality of management tools as large corporations, but tailored to their specific needs and scale. Our goal is to become the essential operating system for small businesses worldwide.
                  </Typography>
                  
                  <Typography
                    variant="body1"
                    sx={{
                      color: theme.palette.text.secondary,
                      fontFamily: '"Inter", sans-serif',
                      fontSize: '1.1rem',
                      lineHeight: 1.8,
                      mt: 2,
                    }}
                  >
                    By 2030, we aim to help one million small businesses improve their operational efficiency, financial health, and growth prospects through our integrated platform that evolves with their needs.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

        {/* What Makes Us Different Section */}
        <Box sx={{ mt: 12 }}>
          <Typography
            variant="h3"
            align="center"
            sx={{
              fontWeight: 600,
              fontFamily: '"Poppins", sans-serif',
              color: primaryColor,
              mb: 6,
            }}
          >
            What Makes Dott Different
          </Typography>

          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%', borderRadius: 2 }}>
                <CardContent>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 600,
                      fontFamily: '"Poppins", sans-serif',
                      color: primaryColor,
                      mb: 2,
                    }}
                  >
                    All-in-One Solution
                  </Typography>
                  <Typography variant="body1">
                    Unlike single-purpose tools, Dott integrates accounting, invoicing, inventory, HR, and payment processing in one unified platform, eliminating the need for multiple subscriptions and fragmented data.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%', borderRadius: 2 }}>
                <CardContent>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 600,
                      fontFamily: '"Poppins", sans-serif',
                      color: primaryColor,
                      mb: 2,
                    }}
                  >
                    Local & Global Perspective
                  </Typography>
                  <Typography variant="body1">
                    Our platform is designed to work with local payment methods, tax regulations, and business practices while maintaining global standards of security and functionality.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%', borderRadius: 2 }}>
                <CardContent>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 600,
                      fontFamily: '"Poppins", sans-serif',
                      color: primaryColor,
                      mb: 2,
                    }}
                  >
                    Scalable Solutions
                  </Typography>
                  <Typography variant="body1">
                    Dott grows with your business, offering features that make sense for your current stage while providing a pathway to more advanced tools as your operations expand and evolve.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

        {/* Values Section */}
        <Box sx={{ mt: 12 }}>
          <Typography
            variant="h3"
            align="center"
            sx={{
              fontWeight: 600,
              fontFamily: '"Poppins", sans-serif',
              color: primaryColor,
              mb: 6,
            }}
          >
            Our Core Values
          </Typography>

          <Grid container spacing={4}>
            {values.map((value, index) => (
              <Grid item xs={12} sm={6} key={index}>
                <Box sx={{ p: 3, border: `1px solid ${theme.palette.divider}`, borderRadius: 2, height: '100%' }}>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 600,
                      fontFamily: '"Poppins", sans-serif',
                      color: primaryColor,
                      mb: 2,
                    }}
                  >
                    {value.title}
                  </Typography>
                  <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
                    {value.description}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Social Impact Section */}
        <Box sx={{ mt: 12 }}>
          <Typography
            variant="h3"
            align="center"
            sx={{
              fontWeight: 600,
              fontFamily: '"Poppins", sans-serif',
              color: primaryColor,
              mb: 4,
            }}
          >
            Our Social Impact
          </Typography>

          <Typography
            align="center"
            variant="body1"
            sx={{
              maxWidth: '800px',
              margin: '0 auto',
              color: theme.palette.text.secondary,
              fontFamily: '"Inter", sans-serif',
              fontSize: '1.1rem',
              lineHeight: 1.8,
              mb: 4,
            }}
          >
            Beyond providing software, Dott is committed to making a positive impact on the small business ecosystem. We regularly conduct workshops, produce educational content, and partner with organizations that support entrepreneurship in underserved communities.
          </Typography>
        </Box>

        {/* Call to Action */}
        <Box sx={{ mt: 8, textAlign: 'center' }}>
          <Button
            variant="contained"
            size="large"
            component="a"
            href="/contact"
            sx={{
              fontSize: '1.1rem',
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
              boxShadow: '0 4px 14px 0 rgba(3, 169, 244, 0.39)',
            }}
          >
            Get in Touch With Our Team
          </Button>
        </Box>
      </Container>
    </Box>
  );
}