'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  Box, 
  Button, 
  Stack, 
  Menu, 
  MenuItem, 
  Typography,
  TextField,
  InputAdornment,
  Divider,
  List,
  ListSubheader
} from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import SearchIcon from '@mui/icons-material/Search';
import AuthButton from '@/components/AuthButton';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import i18nInstance from '../../i18n';
import { getCurrencyFromLanguage } from '@/utils/currencyUtils';

// Language definitions for the supported languages from i18n config
const supportedLanguages = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'pt', name: 'Português' },
  { code: 'de', name: 'Deutsch' },
  { code: 'zh', name: '中文' },
  { code: 'ar', name: 'العربية' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'ru', name: 'Русский' },
  { code: 'ja', name: '日本語' },
  { code: 'sw', name: 'Kiswahili' },
  { code: 'tr', name: 'Türkçe' },
  { code: 'id', name: 'Bahasa Indonesia' },
  { code: 'vi', name: 'Tiếng Việt' },
  { code: 'nl', name: 'Nederlands' },
  { code: 'ha', name: 'Hausa' },
  { code: 'yo', name: 'Yorùbá' },
  { code: 'am', name: 'አማርኛ' },
  { code: 'zu', name: 'isiZulu' },
  { code: 'ko', name: '한국어' }
];

// Group languages by region for better organization in the dropdown
const languagesByRegion = {
  popular: supportedLanguages.filter(lang =>
    ['en', 'fr', 'es', 'zh', 'ar', 'hi'].includes(lang.code)
  ),
  european: supportedLanguages.filter(lang =>
    ['en', 'fr', 'es', 'pt', 'de', 'nl', 'ru'].includes(lang.code)
  ),
  middleEastNorthAfrica: supportedLanguages.filter(lang =>
    ['ar', 'tr'].includes(lang.code)
  ),
  subSaharanAfrica: supportedLanguages.filter(lang =>
    ['sw', 'am', 'ha', 'yo', 'zu'].includes(lang.code)
  ),
  southAsia: supportedLanguages.filter(lang =>
    ['hi'].includes(lang.code)
  ),
  eastAsia: supportedLanguages.filter(lang =>
    ['zh', 'ja', 'ko'].includes(lang.code)
  ),
  southeastAsia: supportedLanguages.filter(lang =>
    ['vi', 'id'].includes(lang.code)
  )
};

// Flat list of all languages for search functionality - use the supportedLanguages directly
const allLanguages = supportedLanguages;

// Region names for display
const regionNames = {
  popular: 'Most Popular',
  european: 'European',
  middleEastNorthAfrica: 'Middle East & North Africa',
  subSaharanAfrica: 'Sub-Saharan Africa',
  southAsia: 'South Asia',
  eastAsia: 'East Asia',
  southeastAsia: 'Southeast Asia',
  pacific: 'Pacific',
  latinAmerica: 'Latin America (Indigenous)'
};

export default function AppBar() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentLanguage, setCurrentLanguage] = useState(allLanguages.find(lang => lang.code === 'en')); // Default to English
  const [searchQuery, setSearchQuery] = useState('');

  // Function to detect user's language from browser or geolocation
  useEffect(() => {
    const detectUserLanguage = async () => {
      try {
        // First try to get from localStorage if user has a saved preference
        const savedLang = localStorage.getItem('userLanguage') || localStorage.getItem('i18nextLng');
        if (savedLang) {
          const langObj = allLanguages.find(lang => lang.code === savedLang);
          if (langObj) {
            setCurrentLanguage(langObj);
            i18nInstance.changeLanguage(langObj.code);
            
            // Dispatch currency event for the saved language
            const currencyInfo = getCurrencyFromLanguage(langObj.code);
            dispatchCurrencyEvent(langObj.code, currencyInfo);
            
            // Dispatch language change event
            dispatchLanguageEvent(langObj.code, langObj.name);
            
            return;
          }
        }

        // Get browser language
        const browserLang = navigator.language.split('-')[0];
        const matchedLang = allLanguages.find(lang => lang.code === browserLang);
        
        if (matchedLang) {
          setCurrentLanguage(matchedLang);
          i18nInstance.changeLanguage(matchedLang.code);
          localStorage.setItem('userLanguage', matchedLang.code);
          
          // Dispatch currency event for the detected language
          const currencyInfo = getCurrencyFromLanguage(matchedLang.code);
          dispatchCurrencyEvent(matchedLang.code, currencyInfo);
          
          // Dispatch language change event
          dispatchLanguageEvent(matchedLang.code, matchedLang.name);
        }
      } catch (error) {
        console.error('Error detecting language:', error);
      }
    };

    // Use the dispatchCurrencyEvent function defined outside the hook

    detectUserLanguage();
    
    // Listen for language changes from other components
    const handleLanguageChange = () => {
      const currentLang = i18nInstance.language;
      const langObj = allLanguages.find(lang => lang.code === currentLang);
      if (langObj && langObj.code !== currentLanguage.code) {
        setCurrentLanguage(langObj);
      }
    };
    
    window.addEventListener('languageChange', handleLanguageChange);
    return () => {
      window.removeEventListener('languageChange', handleLanguageChange);
    };
  }, [currentLanguage.code]);

  const handleLanguageMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
    setSearchQuery('');
  };

  const handleLanguageMenuClose = () => {
    setAnchorEl(null);
  };

  // Helper function to dispatch currency change event
  const dispatchCurrencyEvent = (languageCode, currencyInfo) => {
    const currencyEvent = new CustomEvent('currencyChange', {
      detail: {
        languageCode,
        currencyCode: currencyInfo.code,
        currencySymbol: currencyInfo.symbol
      }
    });
    window.dispatchEvent(currencyEvent);
  };
  
  // Helper function to dispatch language change event
  const dispatchLanguageEvent = (languageCode, languageName) => {
    const languageEvent = new CustomEvent('languageChange', {
      detail: {
        languageCode,
        languageName
      }
    });
    window.dispatchEvent(languageEvent);
  };

  const handleLanguageChange = (language) => {
    setCurrentLanguage(language);
    i18nInstance.changeLanguage(language.code);
    localStorage.setItem('userLanguage', language.code);
    
    // Get currency info for the selected language
    const currencyInfo = getCurrencyFromLanguage(language.code);
    
    // Dispatch a custom event with currency information
    dispatchCurrencyEvent(language.code, currencyInfo);
    
    // Dispatch a language change event to update all components
    dispatchLanguageEvent(language.code, language.name);
    
    handleLanguageMenuClose();
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  // Filter languages based on search query
  const filteredLanguages = searchQuery.trim() 
    ? allLanguages.filter(lang => 
        lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lang.code.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  return (
    <Box
      component="nav"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: { xs: 2, sm: 4 },
        py: 1,
        backgroundColor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
      }}
    >
      {/* Logo */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          height: 80,
          width: 'auto',
          justifyContent: 'center',
          mr: 2,
        }}
        onClick={() => router.push('/')}
      >
        <Image
          src="/static/images/PyfactorLandingpage.png"
          alt="Pyfactor Logo"
          width={140}
          height={120}
          priority
          style={{ objectFit: 'contain' }}
        />
      </Box>

      {/* Navigation Links */}
      <Stack
        direction="row"
        spacing={2}
        sx={{
          display: { xs: 'none', md: 'flex' },
          alignItems: 'center',
          mx: 4,
        }}
      >
        <Button
          color="inherit"
          component="a"
          href="/about"
        >
          {t('about')}
        </Button>
        <Button
          color="inherit"
          onClick={() => router.push('/#features')}
        >
          {t('features')}
        </Button>
        <Button
          color="inherit"
          onClick={() => router.push('/#pricing')}
        >
          {t('pricing')}
        </Button>
        <Button
          color="inherit"
          onClick={() => router.push('/#contact')}
        >
          {t('contact')}
        </Button>
      </Stack>

      {/* Right Side Controls */}
      <Stack direction="row" spacing={1} alignItems="center">
        {/* Language Selector */}
        <Box>
          <Button
            color="inherit"
            onClick={handleLanguageMenuOpen}
            startIcon={<LanguageIcon />}
            endIcon={<KeyboardArrowDownIcon />}
            sx={{
              minWidth: { xs: 'auto', sm: '120px' },
              ml: { xs: 0, sm: 1 },
              textTransform: 'none',
            }}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
              {currentLanguage.name}
            </Box>
          </Button>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleLanguageMenuClose}
            PaperProps={{
              elevation: 3,
              sx: { 
                maxHeight: 400,
                width: 280
              }
            }}
          >
            {/* Search box */}
            <Box sx={{ p: 2, pb: 1 }}>
              <TextField
                fullWidth
                placeholder={t('searchLanguages', 'Search languages...')}
                size="small"
                value={searchQuery}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
            <Divider />

            {/* Display search results or categorized list */}
            {filteredLanguages ? (
              // Search results
              <List sx={{ pt: 0, pb: 1 }}>
                <ListSubheader sx={{ bgcolor: 'background.paper' }}>
                  Search Results
                </ListSubheader>
                {filteredLanguages.length > 0 ? (
                  filteredLanguages.map((language) => (
                    <MenuItem 
                      key={language.code} 
                      onClick={() => handleLanguageChange(language)}
                      selected={currentLanguage.code === language.code}
                      sx={{
                        py: 1,
                        '&.Mui-selected': {
                          backgroundColor: 'rgba(3, 169, 244, 0.1)',
                        },
                        '&.Mui-selected:hover': {
                          backgroundColor: 'rgba(3, 169, 244, 0.15)',
                        },
                      }}
                    >
                      <Typography variant="body2">
                        {language.name}
                      </Typography>
                    </MenuItem>
                  ))
                ) : (
                  <Box sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      No languages found
                    </Typography>
                  </Box>
                )}
              </List>
            ) : (
              // Categorized list
              Object.entries(languagesByRegion).map(([region, languages]) => (
                <List key={region} sx={{ pt: 0, pb: 1 }}>
                  <ListSubheader sx={{ bgcolor: 'background.paper' }}>
                    {regionNames[region]}
                  </ListSubheader>
                  {languages.map((language) => (
                    <MenuItem 
                      key={language.code} 
                      onClick={() => handleLanguageChange(language)}
                      selected={currentLanguage.code === language.code}
                      sx={{
                        py: 1,
                        '&.Mui-selected': {
                          backgroundColor: 'rgba(3, 169, 244, 0.1)',
                        },
                        '&.Mui-selected:hover': {
                          backgroundColor: 'rgba(3, 169, 244, 0.15)',
                        },
                      }}
                    >
                      <Typography variant="body2">
                        {language.name}
                      </Typography>
                    </MenuItem>
                  ))}
                </List>
              ))
            )}
          </Menu>
        </Box>

        {/* Auth Button */}
        <AuthButton />
      </Stack>
    </Box>
  );
}