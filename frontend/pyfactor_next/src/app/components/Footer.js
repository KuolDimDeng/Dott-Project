'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';

import FacebookIcon from '@mui/icons-material/Facebook';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import YouTubeIcon from '@mui/icons-material/YouTube';
import TwitterIcon from '@mui/icons-material/Twitter';

const logoStyle = {
  width: '140px',
  height: 'auto',
};

function Copyright() {
  return (
    <Typography variant="body2" color="text.secondary" mt={2}>
      {'© '}
      {new Date().getFullYear()}
      {' Pyfactor, LLC. All rights reserved.'}
    </Typography>
  );
}

const footerLinks = [
  {
    title: 'Product',
    links: ['Features', 'Testimonials', 'Highlights', 'Pricing', 'FAQs'],
  },
  {
    title: 'Company',
    links: ['About us', 'Careers', 'Press', 'Blog'],
  },
  {
    title: 'Legal',
    links: ['Terms', 'Privacy', 'Contact'],
  },
];

export default function Footer() {
  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: (theme) => (theme.palette.mode === 'light' ? '#f5f5f5' : '#101010'),
        py: 6,
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4} justifyContent="space-between">
          <Grid item xs={12} md={3}>
            <Stack direction="row" spacing={1}>
              {[FacebookIcon, LinkedInIcon, YouTubeIcon].map((Icon, index) => (
                <IconButton key={index} color="primary" aria-label={`${Icon.name} link`}>
                  <Icon />
                </IconButton>
              ))}
            </Stack>
          </Grid>
          {footerLinks.map((column) => (
            <Grid item xs={6} md={2} key={column.title}>
              <Typography variant="h6" color="text.primary" gutterBottom>
                {column.title}
              </Typography>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {column.links.map((link) => (
                  <li key={link}>
                    <Link href="#" variant="body2" color="text.secondary">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </Grid>
          ))}
        </Grid>
        <Box mt={5}>
          <Copyright />
        </Box>
      </Container>
    </Box>
  );
}
