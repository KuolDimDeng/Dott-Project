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
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Avatar from '@mui/material/Avatar';

// Icons
import EmojiObjectsIcon from '@mui/icons-material/EmojiObjects';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SpeedIcon from '@mui/icons-material/Speed';
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew';
import LanguageIcon from '@mui/icons-material/Language';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import BubbleChartIcon from '@mui/icons-material/BubbleChart';
import QueryStatsIcon from '@mui/icons-material/QueryStats';

// Define keyframes animation styles
const progressAnimationKeyframes = `
  @keyframes progressAnimation {
    0% {
      transform: translateX(-70%);
    }
    100% {
      transform: translateX(0%);
    }
  }
`;

export default function AboutUs() {
  const theme = useTheme();
  const router = useRouter();

  // Add global styles for keyframes animation
  React.useEffect(() => {
    // Add style element for keyframes
    const styleElement = document.createElement('style');
    styleElement.innerHTML = progressAnimationKeyframes;
    document.head.appendChild(styleElement);

    // Cleanup on unmount
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  const primaryColor = '#0a3d62'; // Navy blue
  const hoverColor = '#3c6382'; // Lighter navy blue for hover
  const secondaryColor = '#ff9800'; // Orange accent for emphasis
  const accentGreen = '#4caf50'; // Green for innovative features

  // Company journey milestones
  const milestones = [
    {
      year: '2022',
      title: 'The Idea',
      description: 'Dott was conceived from the founders\' experiences with small businesses struggling to manage operations efficiently.',
      color: primaryColor
    },
    {
      year: '2023',
      title: 'Launch',
      description: 'Official launch of Dott platform, offering core financial and inventory management features.',
      color: secondaryColor
    },
    {
      year: '2024',
      title: 'Global Expansion',
      description: 'Expanded internationally with multi-currency support and localized tax compliance for 25+ countries.',
      color: accentGreen
    },
    {
      year: '2025',
      title: 'The Future',
      description: 'Roadmap includes AI-powered forecasting, expanded payment options, and deeper integration with e-commerce platforms.',
      color: '#673ab7' // Purple for future vision
    },
  ];

  // Team members
  const teamMembers = [
    {
      name: 'Sarah Johnson',
      title: 'CEO & Co-Founder',
      bio: 'Previously led product at Shopify, Sarah brings 15+ years of fintech and small business experience.',
      image: '/static/images/team/placeholder.png' 
    },
    {
      name: 'Michael Chen',
      title: 'CTO & Co-Founder',
      bio: 'Former engineering leader at Square, Michael oversees our technical architecture and security infrastructure.',
      image: '/static/images/team/placeholder.png'
    },
    {
      name: 'Priya Patel',
      title: 'Chief Product Officer',
      bio: 'With expertise in UX design and user research, Priya ensures our platform remains intuitive and effective.',
      image: '/static/images/team/placeholder.png'
    },
  ];

  // Core values with icons
  const values = [
    {
      title: "Simplicity",
      description: "We design our platform with intuitive interfaces that make complex business operations straightforward and accessible to everyone, regardless of technical expertise.",
      icon: <EmojiObjectsIcon sx={{ fontSize: 36, color: primaryColor }} />
    },
    {
      title: "Innovation",
      description: "We continuously evolve our platform with cutting-edge features that anticipate the changing needs of small businesses in an increasingly digital economy.",
      icon: <AutoAwesomeIcon sx={{ fontSize: 36, color: secondaryColor }} />
    },
    {
      title: "Empowerment",
      description: "We believe in giving small business owners the same caliber of tools that larger enterprises enjoy, leveling the playing field and enabling growth on their terms.",
      icon: <AccessibilityNewIcon sx={{ fontSize: 36, color: accentGreen }} />
    },
    {
      title: "Customer Focus",
      description: "Every feature we develop, every support interaction we have, and every business decision we make is guided by what will best serve our customers' success.",
      icon: <SpeedIcon sx={{ fontSize: 36, color: '#e91e63' }} />
    }
  ];

  // Features that make us different
  const features = [
    {
      title: "All-in-One Platform",
      description: "Dott integrates accounting, invoicing, inventory, HR, and payment processing in one unified platform, eliminating the need for multiple subscriptions and fragmented data.",
      icon: <BubbleChartIcon fontSize="large" />
    },
    {
      title: "Global & Local",
      description: "Our platform works with local payment methods, tax regulations, and business practices while maintaining global standards of security and functionality.",
      icon: <LanguageIcon fontSize="large" />
    },
    {
      title: "Enterprise Security",
      description: "Bank-level encryption, compliance with international data protection standards, and regular security audits keep your business data safe.",
      icon: <VerifiedUserIcon fontSize="large" />
    },
    {
      title: "Data-Driven Insights",
      description: "Turn your financial data into actionable insights with visual reports and dashboards that help you make informed business decisions.",
      icon: <QueryStatsIcon fontSize="large" />
    }
  ];

  return (
    <Box
      id="about"
      sx={{
        width: '100%',
        color: theme.palette.mode === 'light' ? '#333' : '#FFF',
        backgroundColor: theme.palette.background.default,
      }}
    >
      {/* Hero Section with Gradient Background */}
      <Box 
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main}22 0%, ${theme.palette.primary.main}44 100%)`,
          pt: { xs: 10, md: 16 },
          pb: { xs: 8, md: 12 },
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Decorative circles */}
        <Box 
          sx={{
            position: 'absolute',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${primaryColor}22 0%, transparent 70%)`,
            top: '-50px',
            right: '-100px',
            zIndex: 0
          }}
        />
        <Box 
          sx={{
            position: 'absolute',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${secondaryColor}22 0%, transparent 70%)`,
            bottom: '50px',
            left: '-50px',
            zIndex: 0
          }}
        />
        
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          {/* Home Button */}
          <Box sx={{ mb: 6, display: 'flex', justifyContent: 'flex-start' }}>
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
                boxShadow: '0 4px 14px 0 rgba(10, 61, 98, 0.39)',
              }}
            >
              Back to Home
            </Button>
          </Box>
        
          {/* Title and Mission Statement */}
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={7}>
              <Box>
                <Typography 
                  variant="overline" 
                  sx={{ 
                    color: primaryColor, 
                    letterSpacing: 2,
                    fontWeight: 600,
                    fontSize: '1rem'
                  }}
                >
                  OUR STORY
                </Typography>
                <Typography
                  variant="h1"
                  sx={{
                    fontSize: { xs: '2.5rem', md: 'clamp(3rem, 6vw, 4rem)' },
                    fontWeight: 800,
                    mb: 3,
                    background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontFamily: '"Poppins", sans-serif',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.2
                  }}
                >
                  Empowering Small Businesses Worldwide
                </Typography>
                <Typography
                  variant="h4"
                  sx={{
                    color: theme.palette.text.primary,
                    fontFamily: '"Inter", sans-serif',
                    fontWeight: 500,
                    fontSize: { xs: '1.2rem', md: '1.5rem' },
                    lineHeight: 1.5,
                    mb: 4,
                    maxWidth: '90%'
                  }}
                >
                  We build technology that helps small businesses thrive in a digital world.
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={5} sx={{ display: 'flex', justifyContent: 'center' }}>
              <Box 
                sx={{ 
                  position: 'relative',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
                    background: `linear-gradient(135deg, ${primaryColor}33 0%, ${secondaryColor}33 100%)`,
                    top: '10%',
                    left: '10%',
                    zIndex: -1
                  }
                }}
              >
                <Image
                  src="/static/images/Team-Building-4--Streamline-Brooklyn.png"
                  alt="Dott Team Illustration"
                  width={550}
                  height={400}
                  style={{ 
                    maxWidth: '100%', 
                    height: 'auto', 
                    borderRadius: '20px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
                  }}
                  priority
                />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Main Content */}
      <Container maxWidth="lg">
        {/* Company Overview */}
        <Box sx={{ py: { xs: 8, md: 12 } }}>
          <Grid container spacing={8} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box sx={{ position: 'relative' }}>
                <Typography
                  variant="h2"
                  sx={{
                    fontSize: { xs: '2rem', md: '2.75rem' },
                    fontWeight: 700,
                    mb: 4,
                    color: primaryColor,
                    fontFamily: '"Poppins", sans-serif',
                    position: 'relative',
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      left: 0,
                      bottom: -10,
                      width: 80,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: secondaryColor
                    }
                  }}
                >
                  Who We Are
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: theme.palette.text.primary,
                    fontFamily: '"Inter", sans-serif',
                    fontSize: '1.1rem',
                    lineHeight: 1.8,
                    mb: 3
                  }}
                >
                  Founded in 2023, Dott is a comprehensive business management platform designed specifically for small businesses, freelancers, consultants, and micro-enterprises. We combine financial management, HR tools, inventory tracking, and integrated payment solutions into one seamless platform.
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: theme.palette.text.primary,
                    fontFamily: '"Inter", sans-serif',
                    fontSize: '1.1rem',
                    lineHeight: 1.8,
                    mb: 3
                  }}
                >
                  What sets Dott apart is our deep understanding of the unique challenges faced by small businesses, especially in emerging markets. Our platform adapts to local business environments while maintaining global best practices in financial management and security.
                </Typography>
                <Box 
                  sx={{ 
                    mt: 5,
                    p: 3,
                    borderRadius: 2,
                    border: `1px solid ${theme.palette.divider}`,
                    backgroundColor: theme.palette.background.paper,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
                  }}
                >
                  <Typography
                    variant="h5"
                    sx={{
                      fontFamily: '"Poppins", sans-serif',
                      fontWeight: 600,
                      color: secondaryColor,
                      mb: 2
                    }}
                  >
                    Our Impact
                  </Typography>
                  <Stack direction="row" spacing={4} sx={{ mb: 2 }}>
                    <Box textAlign="center">
                      <Typography variant="h3" color="primary" fontWeight={700}>15K+</Typography>
                      <Typography variant="body2">Active Businesses</Typography>
                    </Box>
                    <Box textAlign="center">
                      <Typography variant="h3" color="primary" fontWeight={700}>32</Typography>
                      <Typography variant="body2">Countries</Typography>
                    </Box>
                    <Box textAlign="center">
                      <Typography variant="h3" color="primary" fontWeight={700}>$120M</Typography>
                      <Typography variant="body2">Processed Monthly</Typography>
                    </Box>
                  </Stack>
                </Box>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              {/* Mission & Vision Cards with subtle floating animation */}
              <Stack spacing={4}>
                <Paper 
                  elevation={4} 
                  sx={{ 
                    p: 4, 
                    borderRadius: 4,
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease',
                    transform: 'translateY(0)',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 20px 40px rgba(3, 169, 244, 0.2)'
                    },
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      width: '100%',
                      height: '100%',
                      background: `linear-gradient(135deg, ${primaryColor}11 0%, ${primaryColor}22 100%)`,
                      zIndex: -1
                    }
                  }}
                >
                  <Box 
                    sx={{ 
                      position: 'absolute', 
                      top: 15, 
                      right: 15,
                      background: primaryColor,
                      borderRadius: '50%',
                      width: 40,
                      height: 40,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white'
                    }}
                  >
                    <AutoAwesomeIcon />
                  </Box>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 700,
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
                      color: theme.palette.text.primary,
                      fontFamily: '"Inter", sans-serif',
                      fontSize: '1.1rem',
                      lineHeight: 1.8,
                      mb: 2
                    }}
                  >
                    At Dott, our mission is to empower small businesses to thrive by providing them with affordable, accessible, and powerful management tools that simplify day-to-day operations. We believe that when the administrative burden is reduced, creativity and growth can flourish.
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      color: theme.palette.text.primary,
                      fontFamily: '"Inter", sans-serif',
                      fontSize: '1.1rem',
                      lineHeight: 1.8,
                    }}
                  >
                    We're committed to breaking down technological barriers and making sophisticated business management accessible to entrepreneurs regardless of their technical background or location.
                  </Typography>
                </Paper>

                <Paper 
                  elevation={4} 
                  sx={{ 
                    p: 4, 
                    borderRadius: 4,
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease',
                    transform: 'translateY(0)',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 20px 40px rgba(255, 152, 0, 0.2)'
                    },
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      width: '100%',
                      height: '100%',
                      background: `linear-gradient(135deg, ${secondaryColor}11 0%, ${secondaryColor}22 100%)`,
                      zIndex: -1
                    }
                  }}
                >
                  <Box 
                    sx={{ 
                      position: 'absolute', 
                      top: 15, 
                      right: 15,
                      background: secondaryColor,
                      borderRadius: '50%',
                      width: 40,
                      height: 40,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white'
                    }}
                  >
                    <LanguageIcon />
                  </Box>
                  <Typography
                    variant="h4"
                    sx={{
                      fontWeight: 700,
                      fontFamily: '"Poppins", sans-serif',
                      color: secondaryColor,
                      mb: 3,
                    }}
                  >
                    Our Vision
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      color: theme.palette.text.primary,
                      fontFamily: '"Inter", sans-serif',
                      fontSize: '1.1rem',
                      lineHeight: 1.8,
                      mb: 2
                    }}
                  >
                    We envision a world where small businesses have access to the same quality of management tools as large corporations, but tailored to their specific needs and scale. Our goal is to become the essential operating system for small businesses worldwide.
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      color: theme.palette.text.primary,
                      fontFamily: '"Inter", sans-serif',
                      fontSize: '1.1rem',
                      lineHeight: 1.8,
                    }}
                  >
                    By 2030, we aim to help one million small businesses improve their operational efficiency, financial health, and growth prospects through our integrated platform that evolves with their needs.
                  </Typography>
                </Paper>
              </Stack>
            </Grid>
          </Grid>
        </Box>

        {/* Company Journey Section */}
        <Box 
          sx={{ 
            py: { xs: 8, md: 12 },
            background: theme.palette.mode === 'light' ? '#f8f9fa' : theme.palette.background.paper,
            borderRadius: 4,
            mx: { xs: -2, md: -4 },
            px: { xs: 2, md: 4 },
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.03)'
          }}
        >
          <Typography
            variant="h2"
            align="center"
            sx={{
              fontSize: { xs: '2rem', md: '2.75rem' },
              fontWeight: 700,
              mb: 8,
              color: primaryColor,
              fontFamily: '"Poppins", sans-serif',
              position: 'relative',
              display: 'inline-block',
              '&::after': {
                content: '""',
                position: 'absolute',
                left: '30%',
                right: '30%',
                bottom: -10,
                height: 4,
                borderRadius: 2,
                backgroundColor: secondaryColor
              }
            }}
          >
            Our Journey
          </Typography>

          <Grid container spacing={4}>
            {milestones.map((milestone, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Paper 
                  elevation={3} 
                  sx={{ 
                    height: '100%',
                    position: 'relative',
                    overflow: 'hidden',
                    borderRadius: 3,
                    transition: 'transform 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 12px 30px rgba(0,0,0,0.15)'
                    }
                  }}
                >
                  <Box 
                    sx={{ 
                      height: 6, 
                      width: '100%', 
                      backgroundColor: milestone.color 
                    }} 
                  />
                  <Box sx={{ p: 3 }}>
                    <Typography 
                      variant="h4" 
                      sx={{ 
                        mb: 1,
                        fontWeight: 700, 
                        color: milestone.color,
                        fontFamily: '"Poppins", sans-serif',
                      }}
                    >
                      {milestone.year}
                    </Typography>
                    <Typography 
                      variant="h6" 
                      fontWeight={600} 
                      gutterBottom
                      sx={{ fontFamily: '"Poppins", sans-serif' }}
                    >
                      {milestone.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                      {milestone.description}
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
          
          {/* Journey Line */}
          <Box 
            sx={{ 
              position: 'relative',
              mt: 6,
              mx: 'auto',
              width: '80%',
              height: 4,
              backgroundColor: '#e0e0e0',
              borderRadius: 2,
              overflow: 'hidden'
            }}
          >
            <Box 
              sx={{ 
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: `linear-gradient(90deg, ${primaryColor} 0%, ${secondaryColor} 50%, ${accentGreen} 100%)`,
                animation: 'progressAnimation 3s ease-in-out infinite alternate'
              }}
            />
          </Box>
        </Box>

        {/* Core Values Section */}
        <Box sx={{ py: { xs: 8, md: 12 } }}>
          <Typography
            variant="h2"
            align="center"
            sx={{
              fontSize: { xs: '2rem', md: '2.75rem' },
              fontWeight: 700,
              mb: 2,
              color: primaryColor,
              fontFamily: '"Poppins", sans-serif',
            }}
          >
            Our Core Values
          </Typography>
          
          <Typography
            variant="h6"
            align="center"
            sx={{
              maxWidth: '800px',
              margin: '0 auto',
              mb: 8,
              color: theme.palette.text.secondary,
              fontWeight: 400,
              lineHeight: 1.6
            }}
          >
            These principles guide every decision we make and every feature we build
          </Typography>

          <Grid container spacing={4}>
            {values.map((value, index) => (
              <Grid item xs={12} sm={6} key={index}>
                <Paper
                  elevation={3}
                  sx={{ 
                    p: 4, 
                    height: '100%',
                    borderRadius: 4,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 12px 20px rgba(0,0,0,0.1)'
                    }
                  }}
                >
                  <Box sx={{ mb: 3 }}>
                    {value.icon}
                  </Box>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 600,
                      fontFamily: '"Poppins", sans-serif',
                      mb: 2,
                    }}
                  >
                    {value.title}
                  </Typography>
                  <Typography variant="body1" sx={{ color: theme.palette.text.secondary, lineHeight: 1.7 }}>
                    {value.description}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* What Makes Us Different */}
        <Box 
          sx={{ 
            py: { xs: 8, md: 12 },
            background: `linear-gradient(135deg, ${primaryColor}11 0%, ${secondaryColor}11 100%)`,
            borderRadius: 4,
            mx: { xs: -2, md: -4 },
            px: { xs: 2, md: 4 }
          }}
        >
          <Typography
            variant="h2"
            align="center"
            sx={{
              fontSize: { xs: '2rem', md: '2.75rem' },
              fontWeight: 700,
              mb: 8,
              color: primaryColor,
              fontFamily: '"Poppins", sans-serif',
            }}
          >
            What Makes Dott Different
          </Typography>

          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    p: 3,
                    backgroundColor: theme.palette.background.paper,
                    borderRadius: 3,
                    boxShadow: '0 8px 25px rgba(0,0,0,0.05)',
                    height: '100%',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: '0 15px 35px rgba(0,0,0,0.1)'
                    }
                  }}
                >
                  <Box 
                    sx={{ 
                      mr: 3, 
                      p: 1.5, 
                      borderRadius: '12px', 
                      color: 'white', 
                      background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center' 
                    }}
                  >
                    {feature.icon}
                  </Box>
                  <Box>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        mb: 1,
                        fontWeight: 600,
                        fontFamily: '"Poppins", sans-serif', 
                      }}
                    >
                      {feature.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                      {feature.description}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Social Impact Section */}
        <Box sx={{ py: { xs: 8, md: 12 } }}>
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box 
                sx={{ 
                  position: 'relative',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    width: '85%',
                    height: '85%',
                    borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
                    background: `linear-gradient(135deg, ${accentGreen}33 0%, ${primaryColor}33 100%)`,
                    bottom: '-5%',
                    right: '-5%',
                    zIndex: -1
                  }
                }}
              >
                <Image
                  src="/static/images/Team-Building-4--Streamline-Brooklyn.png"
                  alt="Social Impact Illustration"
                  width={550}
                  height={400}
                  style={{ 
                    maxWidth: '100%', 
                    height: 'auto', 
                    borderRadius: '20px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
                  }}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography
                variant="h2"
                sx={{
                  fontSize: { xs: '2rem', md: '2.75rem' },
                  fontWeight: 700,
                  mb: 4,
                  color: accentGreen,
                  fontFamily: '"Poppins", sans-serif',
                  position: 'relative',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    bottom: -10,
                    width: 80,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: primaryColor
                  }
                }}
              >
                Our Social Impact
              </Typography>
              
              <Typography
                variant="body1"
                sx={{
                  color: theme.palette.text.primary,
                  fontFamily: '"Inter", sans-serif',
                  fontSize: '1.1rem',
                  lineHeight: 1.8,
                  mb: 3
                }}
              >
                Beyond providing software, Dott is committed to making a positive impact on the small business ecosystem. We regularly conduct workshops, produce educational content, and partner with organizations that support entrepreneurship in underserved communities.
              </Typography>
              
              <Typography
                variant="body1"
                sx={{
                  color: theme.palette.text.primary,
                  fontFamily: '"Inter", sans-serif',
                  fontSize: '1.1rem',
                  lineHeight: 1.8,
                  mb: 0
                }}
              >
                Through our Dott Grants program, we provide free access to our platform for non-profits and social enterprises making a difference in their communities. To date, we've supported over 200 organizations globally with technology that amplifies their impact.
              </Typography>
            </Grid>
          </Grid>
        </Box>

        {/* CTA Section */}
        <Box 
          sx={{ 
            py: { xs: 6, md: 10 },
            my: { xs: 4, md: 8 },
            textAlign: 'center',
            backgroundColor: theme.palette.background.paper,
            borderRadius: 4,
            boxShadow: '0 10px 40px rgba(0,0,0,0.05)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Decorative elements */}
          <Box 
            sx={{ 
              position: 'absolute', 
              top: -100, 
              right: -100, 
              width: 200, 
              height: 200, 
              borderRadius: '50%', 
              background: `radial-gradient(circle, ${primaryColor}22 0%, transparent 70%)`,
              zIndex: 0
            }} 
          />
          <Box 
            sx={{ 
              position: 'absolute', 
              bottom: -80, 
              left: -80, 
              width: 160, 
              height: 160, 
              borderRadius: '50%', 
              background: `radial-gradient(circle, ${secondaryColor}22 0%, transparent 70%)`,
              zIndex: 0
            }} 
          />
          
          <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
            <Typography
              variant="h2"
              sx={{
                fontSize: { xs: '1.8rem', md: '2.5rem' },
                fontWeight: 700,
                mb: 3,
                color: primaryColor,
                fontFamily: '"Poppins", sans-serif',
              }}
            >
              Ready to Transform Your Business?
            </Typography>
            
            <Typography
              variant="h6"
              sx={{
                color: theme.palette.text.secondary,
                fontWeight: 400,
                mb: 5,
                maxWidth: '700px',
                mx: 'auto'
              }}
            >
              Join thousands of businesses that use Dott to streamline operations, 
              reduce costs, and drive growth. Get started today!
            </Typography>
            
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent="center">
              <Button
                variant="contained"
                size="large"
                component="a"
                href="/#pricing"
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
                  boxShadow: '0 4px 14px 0 rgba(10, 61, 98, 0.39)',
                }}
              >
                Start Your Free Trial
              </Button>
              
              <Button
                variant="outlined"
                size="large"
                component="a"
                href="/contact"
                sx={{
                  fontSize: '1.1rem',
                  px: 4,
                  py: 1.5,
                  borderColor: secondaryColor,
                  color: secondaryColor,
                  '&:hover': {
                    borderColor: secondaryColor,
                    backgroundColor: `${secondaryColor}11`,
                  },
                  borderRadius: '50px',
                  fontFamily: '"Inter", sans-serif',
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                }}
              >
                Contact Sales
              </Button>
            </Stack>
          </Container>
        </Box>
        
      </Container>
    </Box>
  );
}