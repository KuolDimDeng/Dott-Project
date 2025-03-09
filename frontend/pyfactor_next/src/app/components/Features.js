'use client';

import React from 'react';
import { Box, Container, Grid, Typography, Card, CardContent, Chip } from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PeopleIcon from '@mui/icons-material/People';
import InventoryIcon from '@mui/icons-material/Inventory';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import PublicIcon from '@mui/icons-material/Public';
import PaymentsIcon from '@mui/icons-material/Payments';
import { useTranslation } from 'react-i18next';
import i18nInstance from '../../i18n'; // Import i18n instance

const features = [
  {
    title: 'Global Accounting',
    description: 'Easy-to-use accounting tools supporting multiple currencies and tax systems for businesses anywhere in the world.',
    icon: <AccountBalanceIcon sx={{ fontSize: 40 }} />,
    highlight: true,
  },
  {
    title: 'Inventory & Barcode Management',
    description: 'Track stock levels, print barcodes, and sync with Bluetooth scanners for efficient inventory management.',
    icon: <QrCodeScannerIcon sx={{ fontSize: 40 }} />,
    highlight: true,
    new: true,
  },
  {
    title: 'Worldwide Payment Solutions',
    description: 'Accept payments globally through credit cards, bank transfers, mobile money, and regional payment methods.',
    icon: <PaymentsIcon sx={{ fontSize: 40 }} />,
    highlight: true,
  },
  {
    title: 'Payroll & HR',
    description: 'Manage employees, payroll, benefits, and HR documents all in one place, supporting multiple regions.',
    icon: <PeopleIcon sx={{ fontSize: 40 }} />,
  },
  {
    title: 'Reports & Analytics',
    description: 'Get insights with customizable reports, real-time business analytics, and AI-powered recommendations.',
    icon: <AssessmentIcon sx={{ fontSize: 40 }} />,
  },
  {
    title: 'Mobile Money Integration',
    description: 'Accept payments via M-Pesa, MTN, Airtel Money and other mobile payment systems popular in Africa and Asia.',
    icon: <PhoneAndroidIcon sx={{ fontSize: 40 }} />,
    highlight: true,
  },
  { 
    title: 'Invoicing & Factoring',
    description: 'Create professional invoices in multiple currencies with factoring options for US and Canada businesses.',
    icon: <ReceiptIcon sx={{ fontSize: 40 }} />,
  },
  {
    title: 'Cross-Border Commerce',
    description: 'Manage international sales, imports, exports, and comply with regional tax regulations seamlessly.',
    icon: <PublicIcon sx={{ fontSize: 40 }} />,
    highlight: true,
  },
];

export default function Features() {
  const { t } = useTranslation();
  
  // Force re-render when language changes
  const [renderKey, setRenderKey] = React.useState(0);
  
  React.useEffect(() => {
    const handleLanguageChange = () => {
      setRenderKey(prev => prev + 1); // Force re-render
    };
    
    window.addEventListener('languageChange', handleLanguageChange);
    return () => {
      window.removeEventListener('languageChange', handleLanguageChange);
    };
  }, []);
  
  // Translate feature titles and descriptions
  const translatedFeatures = features.map(feature => ({
    ...feature,
    title: t(`feature_${feature.title.replace(/\s+/g, '_').toLowerCase()}`, feature.title),
    description: t(`feature_${feature.title.replace(/\s+/g, '_').toLowerCase()}_desc`, feature.description)
  }));
  
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
            {t('featuresTitle', 'Global Business Features')}
          </Typography>
          <Typography
            variant="h5"
            color="text.secondary"
            sx={{ maxWidth: 800, mx: 'auto', mb: 3 }}
          >
            {t('featuresSubtitle', 'Everything you need to run your business efficiently across 100+ countries')}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 1, mb: 4 }}>
            <Chip 
              icon={<PublicIcon />} 
              label={t('countriesSupported', '100+ Countries Supported')}
              color="primary" 
              variant="outlined" 
            />
            <Chip 
              icon={<PaymentsIcon />} 
              label={t('globalPaymentOptions', 'Global Payment Options')}
              color="primary" 
              variant="outlined" 
            />
            <Chip 
              icon={<InventoryIcon />} 
              label={t('advancedInventory', 'Advanced Inventory Management')}
              color="primary" 
              variant="outlined" 
            />
          </Box>
        </Box>

        <Grid container spacing={4}>
          {translatedFeatures.map((feature) => (
            <Grid item xs={12} sm={6} md={4} key={feature.title}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                  position: 'relative',
                  overflow: 'visible',
                  ...(feature.highlight && {
                    borderTop: '3px solid #1976d2',
                  }),
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: (theme) =>
                      theme.palette.mode === 'light'
                        ? '0 4px 20px rgba(0,0,0,0.1)'
                        : '0 4px 20px rgba(0,0,0,0.3)',
                  },
                }}
              >
                {feature.new && (
                  <Chip
                    label={t('new', 'New')}
                    color="secondary"
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: -10,
                      right: -10,
                      fontWeight: 'bold',
                    }}
                  />
                )}
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      mb: 2,
                      color: feature.highlight ? 'primary.main' : 'secondary.main',
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
        
        <Box sx={{ mt: 8, textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
            {t('pricingTitle', 'All included in our Professional plan for just $15/month')}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            {t('pricingDescription', 'No hidden fees. No extra charges for barcode printing or scanner integration.')}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}