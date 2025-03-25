'use client';

import * as React from 'react';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Button from '@mui/material/Button';
import HomeIcon from '@mui/icons-material/Home';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import { useRouter } from 'next/navigation';

// Blog article data
const blogArticles = [
  {
    id: 1,
    title: "5 Inventory Management Challenges Small Businesses Face Today",
    excerpt: "Managing inventory efficiently is a critical challenge for small businesses. Learn about the top 5 inventory challenges and practical solutions to overcome them.",
    image: "/static/images/Team-Building-4--Streamline-Brooklyn.png", // Reusing existing image
    category: "Inventory",
    date: "March 20, 2025",
    readTime: "7 min read",
    featured: true,
  },
  {
    id: 2,
    title: "How Mobile Money is Transforming Business in Emerging Markets",
    excerpt: "Mobile money platforms are revolutionizing how small businesses operate in emerging markets. Discover how this technology is driving financial inclusion and business growth.",
    image: "/static/images/Team-Building-4--Streamline-Brooklyn.png", // Reusing existing image
    category: "Fintech",
    date: "March 15, 2025",
    readTime: "5 min read",
    featured: true,
  },
  {
    id: 3,
    title: "The Benefits of Cloud-Based POS Systems for Retail Businesses",
    excerpt: "Cloud-based POS systems offer significant advantages over traditional systems. Learn how these solutions can streamline operations and boost your bottom line.",
    image: "/static/images/Team-Building-4--Streamline-Brooklyn.png", // Reusing existing image
    category: "Technology",
    date: "March 10, 2025",
    readTime: "6 min read",
    featured: false,
  },
  {
    id: 4,
    title: "Effective Cash Flow Management Strategies for Small Businesses",
    excerpt: "Cash flow management is crucial for small business survival. Discover practical strategies to optimize your cash flow and ensure financial stability.",
    image: "/static/images/Team-Building-4--Streamline-Brooklyn.png", // Reusing existing image
    category: "Finance",
    date: "March 5, 2025",
    readTime: "8 min read",
    featured: false,
  },
  {
    id: 5,
    title: "How to Choose the Right Inventory Management Software",
    excerpt: "Selecting the right inventory management software can be overwhelming. This guide helps you evaluate options based on your business needs and budget.",
    image: "/static/images/Team-Building-4--Streamline-Brooklyn.png", // Reusing existing image
    category: "Inventory",
    date: "February 28, 2025",
    readTime: "9 min read",
    featured: false,
  },
  {
    id: 6,
    title: "Understanding Supply Chain Disruptions and Building Resilience",
    excerpt: "Supply chain disruptions can severely impact small businesses. Learn how to identify potential risks and build a more resilient supply chain.",
    image: "/static/images/Team-Building-4--Streamline-Brooklyn.png", // Reusing existing image
    category: "Supply Chain",
    date: "February 22, 2025",
    readTime: "7 min read",
    featured: false,
  }
];

export default function Blog() {
  const theme = useTheme();
  const router = useRouter();
  const primaryColor = '#0a3d62'; // Navy blue to match About page
  const hoverColor = '#3c6382'; // Lighter navy blue for hover

  const featuredArticles = blogArticles.filter(article => article.featured);
  const regularArticles = blogArticles.filter(article => !article.featured);

  return (
    <Box
      sx={{
        width: '100%',
        color: theme.palette.mode === 'light' ? '#333' : '#FFF',
        backgroundColor: theme.palette.background.default,
        pt: 12, // Add padding top to account for fixed AppBar
        pb: 8,
      }}
    >
      <Container maxWidth="lg">
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
              boxShadow: '0 4px 14px 0 rgba(10, 61, 98, 0.39)',
            }}
          >
            Back to Home
          </Button>
        </Box>

        {/* Blog Header */}
        <Box sx={{ mb: 6, textAlign: 'center' }}>
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '2.5rem', md: '3.5rem' },
              fontWeight: 800,
              mb: 2,
              color: primaryColor,
              fontFamily: '"Poppins", sans-serif',
            }}
          >
            Dott Blog
          </Typography>
          <Typography
            variant="h5"
            sx={{
              color: theme.palette.text.secondary,
              fontFamily: '"Inter", sans-serif',
              maxWidth: '800px',
              mx: 'auto',
            }}
          >
            Insights, tips, and strategies to help small businesses thrive in today's digital economy
          </Typography>
        </Box>

        {/* Featured Articles */}
        <Box sx={{ mb: 8 }}>
          <Typography
            variant="h4"
            sx={{
              fontSize: { xs: '1.5rem', md: '1.75rem' },
              fontWeight: 700,
              mb: 3,
              color: primaryColor,
              fontFamily: '"Poppins", sans-serif',
              position: 'relative',
              display: 'inline-block',
              '&::after': {
                content: '""',
                position: 'absolute',
                left: 0,
                bottom: -8,
                width: 60,
                height: 3,
                borderRadius: 1.5,
                backgroundColor: theme.palette.primary.main,
              }
            }}
          >
            Featured Articles
          </Typography>

          <Grid container spacing={4}>
            {featuredArticles.map((article) => (
              <Grid item xs={12} md={6} key={article.id}>
                <Card 
                  sx={{ 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 4,
                    overflow: 'hidden',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                    transition: 'transform 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 15px 35px rgba(0,0,0,0.15)'
                    }
                  }}
                >
                  <CardMedia
                    component="img"
                    height="240"
                    image={article.image}
                    alt={article.title}
                    sx={{ objectFit: 'cover' }}
                  />
                  <CardContent sx={{ flexGrow: 1, p: 3 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                      <Chip 
                        label={article.category} 
                        size="small" 
                        sx={{ 
                          backgroundColor: primaryColor,
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '0.7rem'
                        }} 
                      />
                      <Typography variant="caption" color="text.secondary">
                        {article.date} • {article.readTime}
                      </Typography>
                    </Stack>
                    <Typography
                      variant="h5"
                      component="h2"
                      sx={{
                        fontWeight: 700,
                        mb: 2,
                        fontFamily: '"Poppins", sans-serif',
                        lineHeight: 1.3,
                      }}
                    >
                      {article.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mb: 3,
                        fontFamily: '"Inter", sans-serif',
                        lineHeight: 1.6,
                      }}
                    >
                      {article.excerpt}
                    </Typography>
                    <Button
                      size="small"
                      sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        color: primaryColor,
                        '&:hover': {
                          backgroundColor: `${primaryColor}11`
                        }
                      }}
                    >
                      Read More
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Divider sx={{ mb: 6 }} />

        {/* Recent Articles */}
        <Box sx={{ mb: 6 }}>
          <Typography
            variant="h4"
            sx={{
              fontSize: { xs: '1.5rem', md: '1.75rem' },
              fontWeight: 700,
              mb: 3,
              color: primaryColor,
              fontFamily: '"Poppins", sans-serif',
              position: 'relative',
              display: 'inline-block',
              '&::after': {
                content: '""',
                position: 'absolute',
                left: 0,
                bottom: -8,
                width: 60,
                height: 3,
                borderRadius: 1.5,
                backgroundColor: theme.palette.primary.main,
              }
            }}
          >
            Recent Articles
          </Typography>

          <Grid container spacing={3}>
            {regularArticles.map((article) => (
              <Grid item xs={12} sm={6} md={4} key={article.id}>
                <Card 
                  sx={{ 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: 3,
                    overflow: 'hidden',
                    boxShadow: '0 5px 15px rgba(0,0,0,0.08)',
                    transition: 'transform 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.12)'
                    }
                  }}
                >
                  <CardMedia
                    component="img"
                    height="180"
                    image={article.image}
                    alt={article.title}
                    sx={{ objectFit: 'cover' }}
                  />
                  <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                      <Chip 
                        label={article.category} 
                        size="small" 
                        sx={{ 
                          backgroundColor: `${primaryColor}22`,
                          color: primaryColor,
                          fontWeight: 600,
                          fontSize: '0.7rem'
                        }} 
                      />
                      <Typography variant="caption" color="text.secondary">
                        {article.date}
                      </Typography>
                    </Stack>
                    <Typography
                      variant="h6"
                      component="h3"
                      sx={{
                        fontWeight: 700,
                        mb: 1.5,
                        fontFamily: '"Poppins", sans-serif',
                        lineHeight: 1.3,
                        fontSize: '1.1rem'
                      }}
                    >
                      {article.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mb: 2,
                        fontFamily: '"Inter", sans-serif',
                        fontSize: '0.85rem',
                        lineHeight: 1.6,
                        display: '-webkit-box',
                        overflow: 'hidden',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 3,
                      }}
                    >
                      {article.excerpt}
                    </Typography>
                    <Button
                      size="small"
                      sx={{
                        textTransform: 'none',
                        fontWeight: 600,
                        color: primaryColor,
                        fontSize: '0.8rem',
                        pl: 0,
                        '&:hover': {
                          backgroundColor: 'transparent',
                          textDecoration: 'underline'
                        }
                      }}
                    >
                      Read More
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Subscribe Banner */}
        <Box 
          sx={{ 
            p: 5, 
            borderRadius: 4, 
            textAlign: 'center',
            background: `linear-gradient(135deg, ${primaryColor} 0%, ${hoverColor} 100%)`,
            color: 'white',
            boxShadow: '0 10px 30px rgba(10, 61, 98, 0.3)',
            mt: 6
          }}
        >
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              mb: 2,
              fontFamily: '"Poppins", sans-serif',
            }}
          >
            Subscribe to Our Newsletter
          </Typography>
          <Typography
            variant="body1"
            sx={{
              mb: 3,
              fontFamily: '"Inter", sans-serif',
              maxWidth: '700px',
              mx: 'auto',
              opacity: 0.9
            }}
          >
            Get the latest insights, tips, and resources delivered directly to your inbox.
          </Typography>
          <Button
            variant="contained"
            size="large"
            sx={{
              backgroundColor: 'white',
              color: primaryColor,
              fontWeight: 600,
              px: 4,
              py: 1.5,
              borderRadius: 50,
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.9)',
              }
            }}
          >
            Coming Soon
          </Button>
        </Box>
      </Container>
    </Box>
  );
}