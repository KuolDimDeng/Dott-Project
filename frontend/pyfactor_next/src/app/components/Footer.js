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
import NextLink from 'next/link';

import FacebookIcon from '@mui/icons-material/Facebook';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import YouTubeIcon from '@mui/icons-material/YouTube';
import TwitterIcon from '@mui/icons-material/Twitter';
import InstagramIcon from '@mui/icons-material/Instagram';
// Custom icon for BlueSky since it's not part of MUI icons
import SvgIcon from '@mui/material/SvgIcon';
import { useTranslation } from 'react-i18next';
import i18nInstance from '../../i18n';

const BlueSkyIcon = (props) => (
  <SvgIcon {...props}>
    <path d="M12,2L2,7.5V12.5L7.5,16V22L12,20L16.5,22V16L22,12.5V7.5L12,2M12,4.5L19,8.25V11.75L12,16L5,11.75V8.25L12,4.5Z" />
  </SvgIcon>
);

const logoStyle = {
  width: '140px',
  height: 'auto',
};

function Copyright() {
  const { t } = useTranslation();
  return (
    <Typography variant="body2" color="text.secondary" mt={2}>
      {'© '}
      {new Date().getFullYear()}
      {' '}
      {t('copyright_text', 'Dott, LLC. All rights reserved.')}
    </Typography>
  );
}

const footerLinks = [
  {
    title: 'Product',
    links: [
      { name: 'Features', url: '#features' },
      { name: 'Testimonials', url: '#testimonials' },
      { name: 'Highlights', url: '#highlights' },
      { name: 'Pricing', url: '#pricing' },
      { name: 'FAQs', url: '#faq' },
    ],
  },
  {
    title: 'Company',
    links: [
      { name: 'About us', url: '/about' },
      { name: 'Careers', url: '/careers' },
      { name: 'Press', url: '/press' },
      { name: 'Blog', url: '/blog' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { name: 'Terms of Use', url: '/terms' },
      { name: 'Privacy Policy', url: '/privacy' },
      { name: 'Cookie Policy', url: '/cookies' },
      { name: 'Contact', url: '/contact' },
    ],
  },
];

// Social media links with icons
const socialLinks = [
  { Icon: FacebookIcon, url: 'https://www.facebook.com/dottapps/', label: 'Facebook' },
  { Icon: LinkedInIcon, url: 'https://www.linkedin.com/company/dottapps/', label: 'LinkedIn' },
  { Icon: TwitterIcon, url: 'https://twitter.com/Dott_Apps', label: 'Twitter' },
  { Icon: InstagramIcon, url: 'https://www.instagram.com/dottapps/', label: 'Instagram' },
  { Icon: YouTubeIcon, url: 'https://www.youtube.com/Dott-Apps', label: 'YouTube' },
  { Icon: BlueSkyIcon, url: 'https://bsky.app/profile/dottapps.bsky.social', label: 'BlueSky' },
];

export default function Footer() {
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
      component="footer"
      sx={{
        backgroundColor: (theme) => (theme.palette.mode === 'light' ? '#f5f5f5' : '#101010'),
        py: 6,
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4} justifyContent="space-between">
          <Grid item xs={12} md={3}>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {socialLinks.map(({ Icon, url, label }) => (
                <IconButton 
                  key={label} 
                  color="primary" 
                  aria-label={`${label} link`}
                  component="a" 
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon />
                </IconButton>
              ))}
            </Stack>
          </Grid>
          {footerLinks.map((column) => (
            <Grid item xs={6} md={2} key={column.title}>
              <Typography variant="h6" color="text.primary" gutterBottom>
                {t(`footer_${column.title.toLowerCase()}`, column.title)}
              </Typography>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {column.links.map((link) => (
                  <li key={link.name} style={{ marginBottom: '8px' }}>
                    <Link
                      component={NextLink}
                      href={link.url}
                      variant="body2"
                      color="text.secondary"
                      sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                    >
                      {t(`footer_link_${link.name.replace(/\s+/g, '_').toLowerCase()}`, link.name)}
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