'use client';

import React from 'react';
import {
  Box,
  Container,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const faqs = [
  {
    question: 'What is Pyfactor?',
    answer:
      'Pyfactor is a comprehensive business management platform designed for small businesses. It combines accounting, payroll, HR, inventory management, and mobile money features in one intuitive solution.',
  },
  {
    question: 'How much does it cost?',
    answer:
      'We offer flexible pricing plans starting from $29/month. Each plan is designed to grow with your business, and you can upgrade or downgrade at any time. Check our pricing page for detailed information.',
  },
  {
    question: 'Do you offer a free trial?',
    answer:
      'Yes! We offer a 14-day free trial with full access to all features. No credit card required to start your trial.',
  },
  {
    question: 'Is my data secure?',
    answer:
      'Absolutely. We use bank-level security encryption and follow industry best practices to protect your data. Our platform is hosted on AWS with multiple layers of security and regular backups.',
  },
  {
    question: 'Can I import data from other systems?',
    answer:
      'Yes, you can import data from various formats including Excel, CSV, and QuickBooks. We also provide migration assistance for businesses switching from other platforms.',
  },
  {
    question: 'What kind of support do you offer?',
    answer:
      'We provide 24/7 customer support via chat, email, and phone. Our team of experts is always ready to help you with any questions or technical issues.',
  },
];

export default function FAQ() {
  return (
    <Box
      id="faq"
      sx={{
        py: { xs: 8, sm: 12 },
        bgcolor: 'background.default',
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
            Frequently Asked Questions
          </Typography>
          <Typography
            variant="h5"
            color="text.secondary"
            sx={{ maxWidth: 800, mx: 'auto' }}
          >
            Got questions? We've got answers.
          </Typography>
        </Box>

        <Box sx={{ mt: 4 }}>
          {faqs.map((faq, index) => (
            <Accordion
              key={index}
              sx={{
                mb: 2,
                boxShadow: 'none',
                '&:before': { display: 'none' },
                '&:hover': {
                  bgcolor: 'action.hover',
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
                  {faq.question}
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
                  {faq.answer}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      </Container>
    </Box>
  );
}
