import * as React from 'react';
import { useRouter } from 'next/navigation';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import Container from '@mui/material/Container';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import MenuIcon from '@mui/icons-material/Menu';

const pages = ['About', 'Features', 'Pricing', 'FAQ', 'Contact'];

const logoStyle = {
  width: '100px',
  height: 'auto',
  cursor: 'pointer',
};

function AppAppBar() {
  const router = useRouter();
  const [anchorElNav, setAnchorElNav] = React.useState(null);

  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setAnchorElNav(open ? event.currentTarget : null);
  };

  const scrollToSection = (sectionId) => {
    const sectionElement = document.getElementById(sectionId);
    const offset = 128;
    if (sectionElement) {
      const targetScroll = sectionElement.offsetTop - offset;
      sectionElement.scrollIntoView({ behavior: 'smooth' });
      window.scrollTo({
        top: targetScroll,
        behavior: 'smooth',
      });
      setAnchorElNav(null);
    }
  };

  const handleSignIn = () => {
    router.push('/login');
  };

  const handleSignUp = () => {
    router.push('/register');
  };

  return (
    <AppBar position="fixed" sx={{ bgcolor: 'white', boxShadow: 1 }}>
      <Container maxWidth="lg">
        <Toolbar
          disableGutters
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            height: 80,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <img
              src="/static/images/Pyfactor.png"
              alt="Pyfactor logo"
              style={logoStyle}
            />
          </Box>

          <Box sx={{ display: { xs: 'none', md: 'flex' } }}>
            {pages.map((page) => (
              <Button
                key={page}
                onClick={() => scrollToSection(page.toLowerCase())}
                sx={{
                  mx: 1,
                  color: 'text.primary',
                  fontFamily: 'Inter, sans-serif',
                  '&:hover': {
                    color: 'primary.main',
                  },
                }}
              >
                {page}
              </Button>
            ))}
          </Box>

          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
            <Button
              variant="text"
              onClick={handleSignIn}
              sx={{
                color: 'text.primary',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              Sign in
            </Button>
            <Button
              variant="contained"
              onClick={handleSignUp}
              sx={{
                fontFamily: 'Inter, sans-serif',
              }}
            >
              Sign up
            </Button>
          </Box>

          <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={toggleDrawer(true)}
              color="inherit"
            >
              <MenuIcon />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorElNav}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorElNav)}
              onClose={toggleDrawer(false)}
              sx={{
                display: { xs: 'block', md: 'none' },
              }}
            >
              {pages.map((page) => (
                <MenuItem key={page} onClick={() => scrollToSection(page.toLowerCase())}>
                  <Typography textAlign="center" fontFamily="Inter, sans-serif">{page}</Typography>
                </MenuItem>
              ))}
              <MenuItem>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleSignUp}
                  sx={{
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  Sign up
                </Button>
              </MenuItem>
              <MenuItem>
                <Button
                  fullWidth
                  variant="text"
                  onClick={handleSignIn}
                  sx={{
                    color: 'text.primary',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  Sign in
                </Button>
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

export default AppAppBar;