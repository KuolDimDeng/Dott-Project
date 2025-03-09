'use client';

import React from 'react';
import {
  Box,
  Container,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Chip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PublicIcon from '@mui/icons-material/Public';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import { useTranslation } from 'react-i18next';
import i18nInstance from '../../i18n';

const faqs = [
  {
    question: 'What is Dott?',
    answer:
      'Dott is a global business management platform that supports companies in over 100 countries. It combines accounting, payroll, HR, inventory management with barcode functionality, and diverse payment options including mobile money in a single intuitive solution.',
    category: 'general',
  },
  {
    question: 'How much does it cost?',
    answer:
      'We offer a Basic free plan for startups and a Professional plan at $15/month ($150/year). The Professional plan includes all features including barcode printing and scanner integration with no hidden fees. You can upgrade or downgrade at any time.',
    category: 'pricing',
     highlight: true,
  },

  {
    question: 'Which countries do you support?',
    answer:
      'Dott supports businesses in over 100 countries worldwide, with special features for specific regions like mobile money integration in Africa, invoice factoring in US and Canada, and compliance tools for various regulatory environments.',
    category: 'global',
    highlight: true,
  },
  {
    question: 'Does Dott support mobile money payments?',
    answer:
      'Yes! We support integration with popular mobile money platforms like M-Pesa, MTN Mobile Money, Airtel Money, and others across Africa and Asia. This allows your business to accept and process local payment methods with ease.',
    category: 'payments',
    highlight: true,
  },
  {
    question: 'How does the barcode and inventory scanner feature work?',
    answer:
      'Our Professional plan includes the ability to generate and print barcodes for your inventory items and sync with Bluetooth barcode scanners for faster stock management. This feature is included at no additional cost and works seamlessly with our inventory management system.',
    category: 'features',
    highlight: true,
  },
  {
    question: 'Is my data secure?',
    answer:
      'Absolutely. We use bank-level security encryption and follow industry best practices to protect your data. Our platform is hosted on secure cloud infrastructure with multiple layers of security, regional compliance features, and regular backups.',
    category: 'security',
  },
  {
    question: 'Can I import data from other systems?',
    answer:
      'Yes, you can import data from various formats including Excel, CSV, and other accounting platforms. We also provide migration assistance for businesses switching from other platforms, with support for international data formats.',
    category: 'features',
  },
  {
    question: 'What kind of support do you offer?',
    answer:
      'We provide customer support across multiple time zones via chat, email, and scheduled calls. Our team includes experts familiar with regional business practices to provide relevant assistance no matter where your business operates.',
    category: 'support',
  },
  {
    question: 'How does multi-currency support work?',
    answer:
      'Dott allows you to operate in multiple currencies simultaneously, with automatic exchange rate updates. You can invoice customers in their local currency, track expenses in different currencies, and generate reports in your preferred base currency.',
    category: 'global',
    highlight: true,
  },
];

// Group FAQs by category
const categoryOrder = ['general', 'pricing', 'global', 'features', 'payments', 'security', 'support'];
const groupedFaqs = categoryOrder.map(category => ({
  category,
  items: faqs.filter(faq => faq.category === category)
})).filter(group => group.items.length > 0);

// Category labels
const categoryLabels = {
  general: 'General',
  pricing: 'Pricing & Plans',
  global: 'Global Business',
  features: 'Features & Functionality',
  payments: 'Payment Options',
  security: 'Security & Compliance',
  support: 'Support & Help'
};

export default function FAQ() {
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
      id="faq"
      sx={{
        py: { xs: 8, sm: 12 },
        bgcolor: 'background.paper',
      }}
    >
      <Container maxWidth="md">
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
            {t('faq_title', 'Frequently Asked Questions')}
          </Typography>
          <Typography
            variant="h5"
            color="text.secondary"
            sx={{ maxWidth: 800, mx: 'auto', mb: 3 }}
          >
            {t('faq_subtitle', 'Got questions about our global business platform? We\'ve got answers.')}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 1 }}>
            <Chip icon={<PublicIcon />} label={t('chip_countries', '100+ Countries')} color="primary" variant="outlined" />
            <Chip icon={<QrCodeScannerIcon />} label={t('chip_barcode', 'Barcode Integration')} color="primary" variant="outlined" />
            <Chip icon={<CurrencyExchangeIcon />} label={t('chip_currency', 'Multi-Currency')} color="primary" variant="outlined" />
          </Box>
        </Box>

        <Box sx={{ mt: 4 }}>
          {groupedFaqs.map((group, groupIndex) => (
            <Box key={group.category} sx={{ mb: 4 }}>
              {groupIndex > 0 && <Divider sx={{ my: 4 }} />}
              <Typography variant="h5" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                {t(`faq_category_${group.category}`, categoryLabels[group.category])}
              </Typography>
              
              {group.items.map((faq, index) => (
                <Accordion
                  key={index}
                  sx={{
                    mb: 2,
                    boxShadow: 'none',
                    border: '1px solid',
                    borderColor: faq.highlight ? 'primary.light' : 'divider',
                    bgcolor: faq.highlight ? 'rgba(25, 118, 210, 0.04)' : 'transparent',
                    '&:before': { display: 'none' },
                    '&:hover': {
                      bgcolor: faq.highlight ? 'rgba(25, 118, 210, 0.08)' : 'action.hover',
                    },
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                      '& .MuiAccordionSummary-content': {
                        my: 2,
                      },
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 500 }}>
                      {t(`faq_q_${faq.question.replace(/\s+/g, '_').toLowerCase().replace(/[?']/g, '')}`, faq.question)}
                      {faq.highlight && (
                        <Chip 
                          size="small" 
                          label={t('key_info', 'Key Info')}
                          color="primary" 
                          variant="outlined"
                          sx={{ ml: 1, verticalAlign: 'middle' }}
                        />
                      )}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography
                      variant="body1"
                      sx={{
                        color: 'text.secondary',
                        lineHeight: 1.6,
                      }}
                    >
                      {t(`faq_a_${faq.question.replace(/\s+/g, '_').toLowerCase().replace(/[?']/g, '')}`, faq.answer)}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          ))}
        </Box>
        
        <Box sx={{ mt: 6, p: 3, bgcolor: 'rgba(25, 118, 210, 0.05)', borderRadius: 2, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            {t('still_have_questions', 'Still have questions?')}
          </Typography>
          <Typography variant="body1">
            {t('contact_support', 'Contact our global support team at support@dottapps.com')}
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}