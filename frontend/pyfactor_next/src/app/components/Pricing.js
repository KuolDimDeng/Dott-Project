'use client';

import * as React from 'react';
import { styled } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import PublicIcon from '@mui/icons-material/Public';
import InventoryIcon from '@mui/icons-material/Inventory';
import PaymentsIcon from '@mui/icons-material/Payments';
import { useTranslation } from 'react-i18next';
import i18nInstance from '../../i18n';
import { convertCurrency, formatCurrency } from '@/utils/currencyUtils';

// List of developed countries for pricing differentiation
const developedCountries = [
  'US', 'CA', 'GB', 'DE', 'FR', 'IT', 'ES', 'JP', 'AU', 'NZ', 'KR', 'SG', 'HK', 'NO', 'SE',
  'DK', 'FI', 'CH', 'NL', 'BE', 'AT', 'IE', 'LU', 'IS', 'IL'
];

// Function to determine if user is in a developed country
const isUserInDevelopedCountry = () => {
  // Try to get country from browser locale
  try {
    const locale = navigator.language || navigator.userLanguage;
    const country = locale.split('-')[1];
    if (country && developedCountries.includes(country.toUpperCase())) {
      return true;
    }
  } catch (e) {
    console.error('Error detecting country from locale:', e);
  }
  
  // Default to developed country if detection fails
  return true;
};

// Map of country codes to currency codes
const countryCurrencyMap = {
  // North America
  'US': { code: 'USD', symbol: '$' },
  'CA': { code: 'CAD', symbol: 'CA$' },
  'MX': { code: 'MXN', symbol: 'MX$' },
  
  // Europe
  'GB': { code: 'GBP', symbol: '£' },
  'DE': { code: 'EUR', symbol: '€' },
  'FR': { code: 'EUR', symbol: '€' },
  'IT': { code: 'EUR', symbol: '€' },
  'ES': { code: 'EUR', symbol: '€' },
  'NL': { code: 'EUR', symbol: '€' },
  'CH': { code: 'CHF', symbol: 'CHF' },
  'SE': { code: 'SEK', symbol: 'kr' },
  'NO': { code: 'NOK', symbol: 'kr' },
  'DK': { code: 'DKK', symbol: 'kr' },
  
  // Asia
  'JP': { code: 'JPY', symbol: '¥' },
  'CN': { code: 'CNY', symbol: '¥' },
  'HK': { code: 'HKD', symbol: 'HK$' },
  'SG': { code: 'SGD', symbol: 'S$' },
  'KR': { code: 'KRW', symbol: '₩' },
  'IN': { code: 'INR', symbol: '₹' },
  
  // Africa
  'ZA': { code: 'ZAR', symbol: 'R' },
  'NG': { code: 'NGN', symbol: '₦' },
  'KE': { code: 'KES', symbol: 'KSh' },
  'EG': { code: 'EGP', symbol: 'E£' },
  'GH': { code: 'GHS', symbol: 'GH₵' },
  
  // Oceania
  'AU': { code: 'AUD', symbol: 'A$' },
  'NZ': { code: 'NZD', symbol: 'NZ$' },
  
  // South America
  'BR': { code: 'BRL', symbol: 'R$' },
  'AR': { code: 'ARS', symbol: 'AR$' },
  'CL': { code: 'CLP', symbol: 'CL$' },
  'CO': { code: 'COP', symbol: 'CO$' },
};

// Function to get appropriate currency info based on locale
const getCurrencyInfo = () => {
  try {
    const locale = navigator.language || navigator.userLanguage;
    const country = locale.split('-')[1] || locale.split('_')[1];
    
    if (country && countryCurrencyMap[country.toUpperCase()]) {
      return countryCurrencyMap[country.toUpperCase()];
    }
    
    // Try to get from browser's Intl API
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'USD', // Default, will be replaced by the detected format
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    
    // Extract just the symbol
    const symbol = formatter.format(0).replace(/[0-9]/g, '').trim();
    return { code: 'USD', symbol: symbol || '$' };
  } catch (e) {
    console.error('Error getting currency info:', e);
    return { code: 'USD', symbol: '$' }; // Default to USD
  }
};

// Function to get just the currency symbol
const getCurrencySymbol = () => {
  return getCurrencyInfo().symbol;
};

const tiers = [
  {
    title: 'Basic',
    price: {
      monthly: '0',
      annual: '0',
    },
    description: [
      '1 user included',
      'Track income and expenses',
      'Basic inventory management',
      'Send invoices and quotes',
      'Global payments: Stripe, PayPal, and mobile money (MTN, M-Pesa, Airtel)',
      '2 GB of storage',
      'Basic reporting',
      'Email support',
    ],
    addOns: [
      'Payroll & Tax processing available as add-on',
      'HR & CRM modules available as add-on',
    ],
    buttonText: 'Get started for free',
    buttonVariant: 'outlined',
    isDeveloping: false, // Flag for enhanced features in developing countries
  },
  {
    title: 'Professional',
    subheader: 'Recommended',
    price: {
      monthly: '15',
      annual: '150',
    },
    description: [
      'Unlimited users',
      'Advanced inventory management with forecasting',
      'Automated invoicing and payment reminders',
      'Global payments with reduced transaction fees',
      'Invoice factoring for US and Canada businesses',
      'Unlimited income & expense tracking',
      '30 GB of storage',
      'Advanced reporting and analytics',
      'AI-powered business insights',
      'Priority support with dedicated account manager',
    ],
    addOns: [
      'Discounted rates on Payroll & Tax processing',
      'Discounted rates on HR & CRM modules',
    ],
    buttonText: 'Start Professional',
    buttonVariant: 'contained',
    isDeveloping: false,
  },
  {
    title: 'Enterprise',
    subheader: 'Complete Solution',
    price: {
      monthly: '45',
      annual: '450',
    },
    description: [
      'Unlimited users with custom roles',
      'Advanced inventory management with custom categories',
      'Fully branded invoicing with automation',
      'Global payments with lowest transaction fees',
      'Advanced payment scheduling and API access',
      'Unlimited storage',
      'Custom reporting and analytics',
      'White-label payment solutions',
      'Advanced AI business insights with forecasting',
      'Priority support with dedicated account manager',
    ],
    addOns: [
      'Discounted Payroll & Tax processing',
      'Discounted HR & CRM modules',
    ],
    buttonText: 'Start Enterprise',
    buttonVariant: 'contained',
    isDeveloping: false,
  },
  // Enhanced Basic tier for developing countries
  {
    title: 'Basic',
    price: {
      monthly: '0',
      annual: '0',
    },
    description: [
      'Single user account with view-only accountant access',
      'Basic income and expense tracking',
      'Up to 5 customizable invoice templates',
      'Dashboard with basic financial overview',
      'Mobile money payment acceptance',
      'Up to 100 clients management',
      '5 GB storage with 12 months transaction history',
      'Basic offline mode for inconsistent connectivity',
      'Inventory tracking (up to 75 items)',
      'Receipt scanning with OCR (20/month)',
      'SMS notifications for payments (limited quota)',
      'QR code generation for payments',
      'WhatsApp receipt delivery to customers (limited)',
      'Mobile-optimized experience with photo capture',
      'Email support in local languages',
      'Regional payment method guides',
    ],
    addOns: [
      'Payroll & Tax processing available as add-on',
      'HR & CRM modules available as add-on',
    ],
    buttonText: 'Get started for free',
    buttonVariant: 'outlined',
    isDeveloping: true, // This is the enhanced version for developing countries
  },
];

const BillingToggle = styled(Box)(({ theme }) => ({
  display: 'inline-flex',
  backgroundColor: theme.palette.background.default,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 30,
  padding: 3,
  position: 'relative',
  cursor: 'pointer',
  '& .MuiBillingToggle-option': {
    padding: '8px 20px',
    borderRadius: 28,
    zIndex: 1,
    transition: theme.transitions.create(['color', 'background-color'], {
      duration: 200,
    }),
  },
  '& .MuiBillingToggle-option.active': {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
  },
}));

const FeatureComparison = styled(Box)(({ theme }) => ({
  backgroundColor: '#F0F8FF', // Very light blue background
  padding: theme.spacing(8, 0),
  borderRadius: theme.shape.borderRadius,
}));

const FeatureRow = styled(Grid)(({ theme }) => ({
  padding: theme.spacing(2, 0),
  '&:nth-of-type(even)': {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
}));

const FeatureCategory = styled(Grid)(({ theme }) => ({
  padding: theme.spacing(2, 0),
  backgroundColor: 'rgba(25, 118, 210, 0.1)',
  marginTop: theme.spacing(4),
  marginBottom: theme.spacing(2),
  fontWeight: 'bold',
}));

const PlanColumn = styled(Grid)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
}));

const FeatureCheck = styled(CheckIcon)(({ theme }) => ({
  color: theme.palette.success.main,
}));

const FeatureClose = styled(CloseIcon)(({ theme }) => ({
  color: theme.palette.error.main,
}));

const features = [
  { category: 'Core Business Tools', highlight: false },
  { name: 'Income and expense tracking', starter: true, pro: true, enterprise: true, highlight: false },
  { name: 'Invoice creation', starter: true, pro: true, enterprise: true, highlight: false },
  { name: 'Automated invoice reminders', starter: false, pro: true, enterprise: true, highlight: false },
  { name: 'Multiple users', starter: false, pro: true, enterprise: true, description: 'Limited to 1 user in Basic, unlimited with custom roles in Enterprise', highlight: false },
  
  { category: 'Global Payment Solutions', highlight: true },
  { name: 'Accept Stripe & PayPal payments', starter: true, pro: true, enterprise: true, highlight: false },
  { name: 'Mobile money payments (M-Pesa, MTN, etc.)', starter: true, pro: true, enterprise: true, highlight: true },
  { name: 'Reduced transaction fees', starter: false, pro: true, enterprise: true, highlight: false },
  { name: 'Multi-currency support', starter: true, pro: true, enterprise: true, highlight: true },
  { name: 'Invoice factoring (US & Canada)', starter: false, pro: true, enterprise: true, highlight: true },
  { name: 'White-label payment solutions', starter: false, pro: false, enterprise: true, highlight: true },
  
  { category: 'Inventory Management', highlight: true },
  { name: 'Basic inventory tracking', starter: true, pro: true, enterprise: true, highlight: false },
  { name: 'Low stock alerts', starter: true, pro: true, enterprise: true, highlight: false },
  { name: 'Barcode scanning', starter: false, pro: true, enterprise: true, highlight: false },
  { name: 'Inventory forecasting', starter: false, pro: true, enterprise: true, highlight: true },
  { name: 'Multi-location inventory', starter: false, pro: true, enterprise: true, highlight: true },
  { name: 'Custom inventory categories', starter: false, pro: false, enterprise: true, highlight: true },
  
  { category: 'Additional Features', highlight: false },
  { name: 'Storage space', starter: '2GB', pro: '30GB', enterprise: 'Unlimited', isText: true, highlight: false },
  { name: 'AI-powered business insights', starter: false, pro: true, enterprise: true, highlight: false },
  { name: 'Advanced forecasting', starter: false, pro: false, enterprise: true, highlight: true },
  { name: 'Custom API access', starter: false, pro: true, enterprise: true, highlight: false },
  { name: 'Priority support', starter: false, pro: true, enterprise: true, highlight: false },
  { name: 'Dedicated account manager', starter: false, pro: true, enterprise: true, highlight: false },
  { name: 'Payroll & Tax processing', starter: 'Add-on', pro: 'Discounted', enterprise: 'Discounted', isText: true, highlight: false },
  { name: 'HR & CRM modules', starter: 'Add-on', pro: 'Discounted', enterprise: 'Discounted', isText: true, highlight: false },
];

// Features for enhanced free tier in developing countries
const enhancedFreeFeatures = [
  { category: 'Core Financial Features', highlight: false },
  { name: 'Basic income and expense tracking', starter: true, pro: true, enterprise: true, highlight: false },
  { name: '5 customizable invoice templates', starter: true, pro: true, enterprise: true, highlight: true },
  { name: 'Dashboard with financial overview', starter: true, pro: true, enterprise: true, highlight: true },
  { name: 'Up to 100 clients management', starter: true, pro: true, enterprise: true, highlight: true },
  { name: 'View-only accountant access', starter: true, pro: true, enterprise: true, highlight: true },
  { name: 'Automated invoice reminders', starter: false, pro: true, enterprise: true, highlight: false },
  
  { category: 'Payment Solutions', highlight: true },
  { name: 'Accept Stripe & PayPal payments', starter: true, pro: true, enterprise: true, highlight: false },
  { name: 'Mobile money payments (M-Pesa, MTN, etc.)', starter: true, pro: true, enterprise: true, highlight: true },
  { name: 'QR code generation for payments', starter: true, pro: true, enterprise: true, highlight: true },
  { name: 'WhatsApp receipt delivery', starter: true, pro: true, enterprise: true, highlight: true },
  { name: 'SMS payment notifications', starter: true, pro: true, enterprise: true, highlight: true },
  { name: 'Reduced transaction fees', starter: false, pro: true, enterprise: true, highlight: false },
  { name: 'Multi-currency support', starter: true, pro: true, enterprise: true, highlight: true },
  { name: 'Invoice factoring (US & Canada)', starter: false, pro: true, enterprise: true, highlight: false },
  
  { category: 'Business Tools', highlight: true },
  { name: 'Inventory tracking (75 items)', starter: true, pro: true, enterprise: true, highlight: true },
  { name: 'Receipt scanning with OCR (20/month)', starter: true, pro: true, enterprise: true, highlight: true },
  { name: 'Photo capture for receipts', starter: true, pro: true, enterprise: true, highlight: true },
  { name: 'Low stock alerts', starter: true, pro: true, enterprise: true, highlight: false },
  { name: 'Barcode scanning', starter: false, pro: true, enterprise: true, highlight: false },
  { name: 'Inventory forecasting', starter: false, pro: true, enterprise: true, highlight: false },
  
  { category: 'Storage & Access', highlight: false },
  { name: 'Storage space', starter: '5GB', pro: '30GB', enterprise: 'Unlimited', isText: true, highlight: true },
  { name: '12 months transaction history', starter: true, pro: true, enterprise: true, highlight: true },
  { name: 'Basic offline mode', starter: true, pro: true, enterprise: true, highlight: true },
  { name: 'Mobile-optimized experience', starter: true, pro: true, enterprise: true, highlight: true },
  
  { category: 'Support', highlight: false },
  { name: 'Email support in local languages', starter: true, pro: true, enterprise: true, highlight: true },
  { name: 'Regional payment method guides', starter: true, pro: true, enterprise: true, highlight: true },
  { name: 'Knowledge base access', starter: true, pro: true, enterprise: true, highlight: true },
  { name: 'Priority support', starter: false, pro: true, enterprise: true, highlight: false },
  { name: 'Payroll & Tax processing', starter: 'Add-on', pro: 'Discounted', enterprise: 'Discounted', isText: true, highlight: false },
  { name: 'HR & CRM modules', starter: 'Add-on', pro: 'Discounted', enterprise: 'Discounted', isText: true, highlight: false },
];

function CompareFeatures() {
  const { t } = useTranslation();
  const isInDevelopingCountry = !isUserInDevelopedCountry();
  const featuresToUse = isInDevelopingCountry ? enhancedFreeFeatures : features;
  const [currencyInfo, setCurrencyInfo] = React.useState(getCurrencyInfo());
  
  // State for converted prices
  const [convertedPrices, setConvertedPrices] = React.useState({
    professional: '15',
    enterprise: isInDevelopingCountry ? '22.50' : '45'
  });
  const [isLoadingPrices, setIsLoadingPrices] = React.useState(true);
  
  // Listen for currency changes
  React.useEffect(() => {
    const handleCurrencyChange = (event) => {
      const { currencyCode, currencySymbol } = event.detail;
      // Update currency info with the new currency from the selected language
      setCurrencyInfo({ code: currencyCode, symbol: currencySymbol });
      
      // Trigger price conversion with the new currency
      setIsLoadingPrices(true);
    };
    
    window.addEventListener('currencyChange', handleCurrencyChange);
    return () => {
      window.removeEventListener('currencyChange', handleCurrencyChange);
    };
  }, []);
  
  // Fetch and convert prices
  React.useEffect(() => {
    const fetchConvertedPrices = async () => {
      setIsLoadingPrices(true);
      try {
        let professionalPrice = 15;
        let enterprisePrice = isInDevelopingCountry ? 22.50 : 45;
        
        // Convert to local currency if not USD
        if (currencyInfo.code !== 'USD') {
          const convertedProfessional = await convertCurrency(professionalPrice, 'USD', currencyInfo.code);
          const convertedEnterprise = await convertCurrency(enterprisePrice, 'USD', currencyInfo.code);
          
          setConvertedPrices({
            professional: convertedProfessional.toFixed(2),
            enterprise: convertedEnterprise.toFixed(2)
          });
        } else {
          setConvertedPrices({
            professional: professionalPrice.toFixed(2),
            enterprise: enterprisePrice.toFixed(2)
          });
        }
      } catch (error) {
        console.error('Error converting prices in CompareFeatures:', error);
        // Fallback to original prices
        setConvertedPrices({
          professional: '15',
          enterprise: isInDevelopingCountry ? '22.50' : '45'
        });
      } finally {
        setIsLoadingPrices(false);
      }
    };
    
    fetchConvertedPrices();
  }, [currencyInfo.code, isInDevelopingCountry]);
  
  return (
    <FeatureComparison>
      <Container maxWidth="lg">
        <Typography variant="h4" align="center" gutterBottom>
          {t('compare_features_title', 'Compare Full Plan Features')}
        </Typography>
        
        <Box mb={4} p={2} sx={{
          backgroundColor: isInDevelopingCountry ? 'rgba(76, 175, 80, 0.1)' : 'rgba(25, 118, 210, 0.1)',
          borderRadius: '8px',
          border: isInDevelopingCountry ? '1px solid rgba(76, 175, 80, 0.3)' : '1px solid rgba(25, 118, 210, 0.3)'
        }}>
          <Typography variant="subtitle1" align="center" color={isInDevelopingCountry ? 'success.main' : 'primary.main'} fontWeight="bold">
            {isInDevelopingCountry
              ? t('developing_country_notice', `Enhanced features available for your region! Prices in ${currencyInfo.code}`)
              : t('currency_notice_compare', `Comparing all plans (Prices in ${currencyInfo.code})`)}
          </Typography>
        </Box>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={3}>
            <Typography variant="h6" align="left" fontWeight="bold">
              {t('features_column', 'Features')}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={4} md={3}>
            <Typography variant="h6" align="center" fontWeight="bold">
              {t('tier_basic', 'Basic')}
            </Typography>
            <Box mt={2} display="flex" justifyContent="center">
              <Button variant="outlined" color="primary" size="large">
                {t('select_basic', 'Select Basic')}
              </Button>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4} md={3}>
            <Typography variant="h6" align="center" fontWeight="bold">
              {t('tier_professional', 'Professional')}
            </Typography>
            <Box mt={2} display="flex" justifyContent="center">
              <Button variant="contained" color="primary" size="large">
                {t('select_professional', 'Select Professional')}
              </Button>
            </Box>
            <Box mt={1} display="flex" justifyContent="center">
              <Typography variant="subtitle2" color="primary.main" fontWeight="bold">
                {isLoadingPrices ? (
                  <span>Loading...</span>
                ) : (
                  `${currencyInfo.symbol}${convertedPrices.professional} ${currencyInfo.code}/${t('period_month', 'month')}`
                )}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4} md={3}>
            <Typography variant="h6" align="center" fontWeight="bold">
              {t('tier_enterprise', 'Enterprise')}
            </Typography>
            <Box mt={2} display="flex" justifyContent="center">
              <Button variant="contained" color="secondary" size="large">
                {t('select_enterprise', 'Select Enterprise')}
              </Button>
            </Box>
            <Box mt={1} display="flex" justifyContent="center">
              <Typography variant="subtitle2" color="secondary.main" fontWeight="bold">
                {isLoadingPrices ? (
                  <span>Loading...</span>
                ) : (
                  `${currencyInfo.symbol}${convertedPrices.enterprise} ${currencyInfo.code}/${t('period_month', 'month')}`
                )}
              </Typography>
            </Box>
          </Grid>
        </Grid>
        <Box mt={6}>
          {featuresToUse.map((feature, index) => {
            if (feature.category) {
              return (
                <FeatureCategory container key={index}>
                  <Grid item xs={12} md={3}>
                    <Typography variant="subtitle1">{t(`category_${feature.category.replace(/\s+/g, '_').toLowerCase()}`, feature.category)}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={4} md={3}></Grid>
                  <Grid item xs={12} sm={4} md={3}></Grid>
                  <Grid item xs={12} sm={4} md={3}></Grid>
                </FeatureCategory>
              );
            }
            
            return (
              <FeatureRow
                container
                key={index}
                sx={feature.highlight ? {
                  backgroundColor: 'rgba(255, 243, 224, 0.8) !important',
                  border: '1px solid rgba(255, 152, 0, 0.3)',
                  borderRadius: '4px',
                  marginBottom: '4px'
                } : {}}
              >
                <Grid item xs={12} md={3}>
                  <Typography variant="body1">
                    {feature.highlight && <span style={{ color: '#FF9800', marginRight: '8px' }}>★</span>}
                    {t(`feature_${feature.name.replace(/\s+/g, '_').toLowerCase()}`, feature.name)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={4} md={3} align="center">
                  {feature.isText ? (
                    <Typography variant="body2" fontWeight="medium">{t(`feature_value_${feature.starter.replace(/\s+/g, '_').toLowerCase()}`, feature.starter)}</Typography>
                  ) : (
                    feature.starter ? <FeatureCheck /> : <FeatureClose />
                  )}
                </Grid>
                <Grid item xs={12} sm={4} md={3} align="center">
                  {feature.isText ? (
                    <Typography variant="body2" fontWeight="medium">{t(`feature_value_${feature.pro.replace(/\s+/g, '_').toLowerCase()}`, feature.pro)}</Typography>
                  ) : (
                    feature.pro ? <FeatureCheck /> : <FeatureClose />
                  )}
                </Grid>
                <Grid item xs={12} sm={4} md={3} align="center">
                  {feature.isText ? (
                    <Typography variant="body2" fontWeight="medium">{t(`feature_value_${feature.enterprise.replace(/\s+/g, '_').toLowerCase()}`, feature.enterprise)}</Typography>
                  ) : (
                    feature.enterprise ? <FeatureCheck /> : <FeatureClose />
                  )}
                </Grid>
              </FeatureRow>
            );
          })}
        </Box>
        <Box mt={6}>
          <Typography variant="body2" align="center">
            {t('pricing_footer', 'Prices do not include applicable tax. Subscriptions auto-renew. Cancel anytime.')}
          </Typography>
          {isInDevelopingCountry && (
            <Typography variant="body2" align="center" color="primary.main" mt={1}>
              {t('developing_country_discount', 'Special regional pricing applied: 50% discount on Enterprise tier')}
            </Typography>
          )}
        </Box>
      </Container>
    </FeatureComparison>
  );
}

export default function Pricing() {
  const { t } = useTranslation();
  const [billingCycle, setBillingCycle] = React.useState('monthly');
  const isInDevelopingCountry = React.useMemo(() => !isUserInDevelopedCountry(), []);
  const [currencyInfo, setCurrencyInfo] = React.useState(getCurrencyInfo());
  
  // State for converted prices
  const [convertedPrices, setConvertedPrices] = React.useState({});
  const [isLoadingPrices, setIsLoadingPrices] = React.useState(true);
  
  // Force re-render when language changes
  const [, setRenderKey] = React.useState(0);
  
  // Fetch and convert prices
  React.useEffect(() => {
    const fetchConvertedPrices = async () => {
      setIsLoadingPrices(true);
      try {
        const results = {};
        
        // Convert prices for all tiers
        for (const tier of tiers) {
          if (tier.price.monthly === '0') {
            results[`${tier.title}-monthly`] = '0';
            results[`${tier.title}-annual`] = '0';
          } else {
            // Apply developing country discount if applicable
            let monthlyPrice = parseFloat(tier.price.monthly);
            let annualPrice = parseFloat(tier.price.annual);
            
            if (tier.title === 'Enterprise' && isInDevelopingCountry) {
              monthlyPrice *= 0.5;
              annualPrice *= 0.5;
            }
            
            // Convert to local currency if not USD
            if (currencyInfo.code !== 'USD') {
              const convertedMonthly = await convertCurrency(monthlyPrice, 'USD', currencyInfo.code);
              const convertedAnnual = await convertCurrency(annualPrice, 'USD', currencyInfo.code);
              
              results[`${tier.title}-monthly`] = convertedMonthly.toFixed(2);
              results[`${tier.title}-annual`] = convertedAnnual.toFixed(2);
            } else {
              results[`${tier.title}-monthly`] = monthlyPrice.toFixed(2);
              results[`${tier.title}-annual`] = annualPrice.toFixed(2);
            }
          }
        }
        
        setConvertedPrices(results);
      } catch (error) {
        console.error('Error converting prices:', error);
        // Fallback to original prices
        const fallbackPrices = {};
        tiers.forEach(tier => {
          fallbackPrices[`${tier.title}-monthly`] = tier.price.monthly;
          fallbackPrices[`${tier.title}-annual`] = tier.price.annual;
        });
        setConvertedPrices(fallbackPrices);
      } finally {
        setIsLoadingPrices(false);
      }
    };
    
    fetchConvertedPrices();
  }, [currencyInfo.code, isInDevelopingCountry]);
  
  React.useEffect(() => {
    const handleLanguageChange = () => {
      setRenderKey(prev => prev + 1); // Force re-render
    };
    
    const handleCurrencyChange = (event) => {
      const { currencyCode, currencySymbol } = event.detail;
      // Update currency info with the new currency from the selected language
      const newCurrencyInfo = { code: currencyCode, symbol: currencySymbol };
      
      // Update the currency info state
      setCurrencyInfo(newCurrencyInfo);
      
      // Trigger price conversion with the new currency
      setIsLoadingPrices(true);
    };
    
    window.addEventListener('languageChange', handleLanguageChange);
    window.addEventListener('currencyChange', handleCurrencyChange);
    
    return () => {
      window.removeEventListener('languageChange', handleLanguageChange);
      window.removeEventListener('currencyChange', handleCurrencyChange);
    };
  }, []);

  const handleBillingCycleChange = (cycle) => {
    setBillingCycle(cycle);
  };

  // Filter tiers based on user's location
  const filteredTiers = React.useMemo(() => {
    return tiers.filter(tier => {
      // If in developing country, show the enhanced Basic tier instead of regular Basic
      if (tier.title === 'Basic') {
        return isInDevelopingCountry ? tier.isDeveloping : !tier.isDeveloping;
      }
      return true;
    });
  }, [isInDevelopingCountry]);

  // Get the price to display for a tier
  const getDisplayPrice = (tier) => {
    const key = `${tier.title}-${billingCycle}`;
    if (isLoadingPrices) {
      // Show loading indicator or original price
      if (tier.title === 'Enterprise' && isInDevelopingCountry) {
        return (parseFloat(tier.price[billingCycle]) * 0.5).toFixed(2);
      }
      return tier.price[billingCycle];
    }
    return convertedPrices[key] || tier.price[billingCycle];
  };

  return (
    <>
      <Container
        id="pricing"
        sx={{
          pt: { xs: 8, sm: 16 },
          pb: { xs: 8, sm: 16 },
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: { xs: 6, sm: 8 },
        }}
      >
        <Box
          sx={{
            width: { sm: '100%', md: '70%' },
            textAlign: 'center',
          }}
        >
          <Typography component="h2" variant="h3" color="text.primary" fontWeight="bold" mb={2}>
            {t('pricing_title', 'Simple, transparent pricing')}
          </Typography>
          <Typography variant="h5" color="text.secondary">
            {t('pricing_subtitle', 'Choose the plan that\'s right for your business')}
          </Typography>
          
          <Box mt={2} p={2} sx={{
            backgroundColor: isInDevelopingCountry ? 'rgba(76, 175, 80, 0.1)' : 'rgba(25, 118, 210, 0.1)',
            borderRadius: '8px',
            border: isInDevelopingCountry ? '1px solid rgba(76, 175, 80, 0.3)' : '1px solid rgba(25, 118, 210, 0.3)'
          }}>
            <Typography variant="subtitle1" color={isInDevelopingCountry ? 'success.main' : 'primary.main'} fontWeight="medium">
              {isInDevelopingCountry
                ? t('regional_pricing', `Regional pricing applied: Enhanced free tier and 50% off Enterprise (${currencyInfo.code})`)
                : t('currency_notice', `Prices shown in your local currency: ${currencyInfo.code}`)}
            </Typography>
          </Box>
          
          <Box mt={2} display="flex" justifyContent="center" gap={2} flexWrap="wrap">
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

        <BillingToggle>
          <Box
            className={`MuiBillingToggle-option ${billingCycle === 'monthly' ? 'active' : ''}`}
            onClick={() => handleBillingCycleChange('monthly')}
          >
            {t('billing_monthly', 'Monthly')}
          </Box>
          <Box
            className={`MuiBillingToggle-option ${billingCycle === 'annual' ? 'active' : ''}`}
            onClick={() => handleBillingCycleChange('annual')}
          >
            {t('billing_annual', 'Annual')}
          </Box>
          {billingCycle === 'annual' && (
            <Chip
              size="small"
              label={t('save_percentage', 'Save 17%')}
              color="success"
              sx={{
                position: 'absolute',
                top: '-10px',
                right: '-10px',
                fontWeight: 'bold'
              }}
            />
          )}
        </BillingToggle>

        <Grid container spacing={4} alignItems="center" justifyContent="center">
          {filteredTiers.map((tier) => (
            <Grid item key={tier.title + (tier.isDeveloping ? '-enhanced' : '')} xs={12} sm={6} md={4}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  p: 4,
                  borderRadius: 4,
                  transition: 'transform 0.3s, box-shadow 0.3s',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 22px 40px 4px rgba(0, 0, 0, 0.1)',
                  },
                  ...(tier.title === 'Professional' && {
                    background: 'linear-gradient(135deg, #1976d2, #064988)',
                    color: 'white',
                  }),
                  ...(tier.title === 'Enterprise' && {
                    background: 'linear-gradient(135deg, #6a1b9a, #4a148c)',
                    color: 'white',
                  }),
                  ...(tier.isDeveloping && {
                    border: '2px solid #4caf50',
                  }),
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box
                    sx={{
                      mb: 3,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Typography variant="h4" component="h3" fontWeight="bold">
                      {t(`tier_${tier.title.toLowerCase()}`, tier.title)}
                    </Typography>
                    {tier.subheader && (
                      <Chip
                        icon={<AutoAwesomeIcon />}
                        label={t(`tier_${tier.subheader.toLowerCase()}`, tier.subheader)}
                        size="small"
                        sx={{
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          color: tier.title === 'Enterprise' ? '#6a1b9a' : '#1976d2',
                          fontWeight: 'bold',
                        }}
                      />
                    )}
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'baseline',
                      mb: 2,
                    }}
                  >
                    <Typography component="h4" variant="h3" fontWeight="bold">
                      {tier.price[billingCycle] === '0' ?
                        t('free', 'Free') :
                        `${currencyInfo.symbol}${getDisplayPrice(tier)} ${currencyInfo.code}`}
                    </Typography>
                    {tier.price[billingCycle] !== '0' && (
                      <Typography variant="h6" sx={{ ml: 1 }}>
                        /{billingCycle === 'monthly' ? t('period_month', 'month') : t('period_year', 'year')}
                      </Typography>
                    )}
                  </Box>
                  {tier.title === 'Enterprise' && isInDevelopingCountry && (
                    <Box mb={2}>
                      <Chip
                        label={t('discount_applied', '50% Regional Discount')}
                        color="success"
                        size="small"
                      />
                    </Box>
                  )}
                  <Divider sx={{ my: 3, opacity: 0.3 }} />
                  {tier.description.map((line) => (
                    <Box
                      key={line}
                      sx={{
                        py: 1,
                        display: 'flex',
                        gap: 1.5,
                        alignItems: 'center',
                      }}
                    >
                      <CheckCircleRoundedIcon
                        sx={{
                          color: tier.title === 'Professional' ? 'white' :
                                 tier.title === 'Enterprise' ? 'white' : 'primary.main'
                        }}
                      />
                      <Typography variant="body1">{t(`feature_${line.replace(/\s+/g, '_').toLowerCase()}`, line)}</Typography>
                    </Box>
                  ))}
                  
                  {tier.addOns && tier.addOns.length > 0 && (
                    <>
                      <Divider sx={{ my: 3, opacity: 0.3 }} />
                      <Typography
                        variant="subtitle2"
                        sx={{
                          mb: 2,
                          opacity: 0.8,
                          fontWeight: 'bold'
                        }}
                      >
                        {t('available_addons', 'Available Add-ons:')}
                      </Typography>
                      {tier.addOns.map((addon) => (
                        <Box
                          key={addon}
                          sx={{
                            py: 0.5,
                            display: 'flex',
                            gap: 1.5,
                            alignItems: 'center',
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              opacity: 0.8,
                              fontSize: '0.9rem'
                            }}
                          >
                            • {t(`addon_${addon.replace(/\s+/g, '_').toLowerCase()}`, addon)}
                          </Typography>
                        </Box>
                      ))}
                    </>
                  )}
                </CardContent>
                <CardActions sx={{ mt: 4 }}>
                  <Button
                    fullWidth
                    variant={tier.buttonVariant}
                    color={
                      tier.title === 'Professional' ? 'secondary' :
                      tier.title === 'Enterprise' ? 'secondary' : 'primary'
                    }
                    sx={{
                      py: 1.5,
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      ...(tier.title === 'Professional' && {
                        color: '#1976d2',
                        backgroundColor: 'white',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        },
                      }),
                      ...(tier.title === 'Enterprise' && {
                        color: '#6a1b9a',
                        backgroundColor: 'white',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        },
                      }),
                    }}
                  >
                    {t(`button_${tier.buttonText.replace(/\s+/g, '_').toLowerCase()}`, tier.buttonText)}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      <CompareFeatures />
    </>
  );
}