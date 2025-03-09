'use client';

import React from 'react';
import { Box, Container, Grid, Typography, Paper, Avatar } from '@mui/material';
import SpeedIcon from '@mui/icons-material/Speed';
import SecurityIcon from '@mui/icons-material/Security';
import SupportIcon from '@mui/icons-material/Support';
import PublicIcon from '@mui/icons-material/Public';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import { useTranslation } from 'react-i18next';
import i18nInstance from '../../i18n';

const highlights = [
  {
    icon: <PublicIcon sx={{ fontSize: 40 }} />,
    title: 'Global Business Solution',
    description:
      'Built for businesses worldwide with support for 100+ countries, multiple currencies, and region-specific payment methods.',
    color: '#1976d2'
  },
  {
    icon: <QrCodeScannerIcon sx={{ fontSize: 40 }} />,
    title: 'Advanced Inventory Tools',
    description:
      'Barcode printing and Bluetooth scanner integration included in our Professional plan with no additional fees.',
    color: '#f57c00'
  },
  {
    icon: <SpeedIcon sx={{ fontSize: 40 }} />,
    title: 'Fast & Efficient',
    description:
      'Cloud-based platform optimized for speed and efficiency, helping you manage your business faster wherever you are.',
    color: '#00a152'
  },
  {
    icon: <SecurityIcon sx={{ fontSize: 40 }} />,
    title: 'Secure & Compliant',
    description:
      'Bank-level security and regional compliance features ensure your business data is safe and meets local regulations.',
    color: '#d32f2f'
  },
  {
    icon: <SupportIcon sx={{ fontSize: 40 }} />,
    title: 'Global Support',
    description:
      'Our dedicated support team understands local business environments and is available in multiple time zones and languages.',
    color: '#7b1fa2'
  },
];

export default function Highlights() {
  const { t } = useTranslation();
  
  // Force re-render when language changes
  const [, setRenderKey] = React.useState(0);
  
  React.useEffect(() => {
    const handleLanguageChange = () => {
      setRenderKey(prev => prev + 1); // Force re-render
    };
    
    window.addEventListener('languageChange', handleLanguageChange);
    return () => {
      window.removeEventListener('languageChange', handleLanguageChange);
    };
  }, []);
  
  return (
    <Box
      id="about"
      sx={{
        py: { xs: 8, sm: 12 },
        bgcolor: 'background.paper',
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
            {t('highlights_title', 'Why Choose Our Global Platform')}
          </Typography>
          <Typography
            variant="h5"
            color="text.secondary"
            sx={{ maxWidth: 800, mx: 'auto' }}
          >
            {t('highlights_subtitle', 'Designed to support businesses across borders with powerful inventory management')}
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {highlights.map((highlight, index) => (
            <Grid item xs={12} md={index < 2 ? 6 : 4} key={index}>
              <Paper
                elevation={0}
                sx={{
                  p: 4,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  borderRadius: 2,
                  borderTop: `4px solid ${highlight.color}`,
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
                <Avatar
                  sx={{
                    width: 64,
                    height: 64,
                    bgcolor: `${highlight.color}15`,
                    color: highlight.color,
                    mb: 2,
                  }}
                >
                  {highlight.icon}
                </Avatar>
                <Typography
                  variant="h5"
                  component="h3"
                  gutterBottom
                  sx={{ fontWeight: 600 }}
                >
                  {t(`highlight_title_${highlight.title.replace(/\s+/g, '_').toLowerCase()}`, highlight.title)}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {t(`highlight_desc_${highlight.title.replace(/\s+/g, '_').toLowerCase()}`, highlight.description)}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
        
        <Box sx={{ mt: 8, textAlign: 'center', p: 3, bgcolor: 'rgba(25, 118, 210, 0.05)', borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>
            {t('highlights_pricing_title', 'All features including barcode printing and scanner integration are included in our Professional plan for just $15/month')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('highlights_pricing_subtitle', 'No hidden fees. No complicated pricing tiers. Just one simple plan for global businesses.')}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}