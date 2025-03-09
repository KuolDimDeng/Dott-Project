// /Users/kuoldeng/projectx/frontend/pyfactor_next/src/components/LanguageSelector/LanguageSelector.jsx
'use client';

import { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Menu, 
  MenuItem, 
  Typography,
  TextField,
  InputAdornment,
} from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from 'react-i18next';

// Language options
const languages = [
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

export default function LanguageSelector() {
  const { i18n } = useTranslation();
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentLanguage, setCurrentLanguage] = useState(
    languages.find(lang => lang.code === 'en')
  );
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const detectUserLanguage = async () => {
      try {
        // First try to get from localStorage if user has a saved preference
        const savedLang = localStorage.getItem('i18nextLng');
        if (savedLang) {
          const langObj = languages.find(lang => lang.code === savedLang);
          if (langObj) {
            setCurrentLanguage(langObj);
            i18n.changeLanguage(langObj.code);
            return;
          }
        }

        // Get browser language
        const browserLang = navigator.language.split('-')[0];
        const matchedLang = languages.find(lang => lang.code === browserLang);
        
        if (matchedLang) {
          setCurrentLanguage(matchedLang);
          i18n.changeLanguage(matchedLang.code);
          localStorage.setItem('i18nextLng', matchedLang.code);
        }
      } catch (error) {
        console.error('Error detecting language:', error);
      }
    };

    detectUserLanguage();
  }, [i18n]);

  useEffect(() => {
    // Update when i18n language changes externally
    const langObj = languages.find(lang => lang.code === i18n.language);
    if (langObj && langObj.code !== currentLanguage.code) {
      setCurrentLanguage(langObj);
    }
  }, [i18n.language, currentLanguage.code]);

  const handleLanguageMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
    setSearchQuery('');
  };

  const handleLanguageMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageChange = (language) => {
    setCurrentLanguage(language);
    i18n.changeLanguage(language.code);
    localStorage.setItem('i18nextLng', language.code);
    handleLanguageMenuClose();
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  // Filter languages based on search query
  const filteredLanguages = searchQuery.trim() 
    ? languages.filter(lang => 
        lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lang.code.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : languages;

  return (
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
            maxHeight: 300,
            width: '200px'
          }
        }}
      >
        <Box sx={{ p: 2, pb: 1 }}>
          <TextField
            fullWidth
            placeholder="Search languages..."
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
        
        {filteredLanguages.map((language) => (
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
      </Menu>
    </Box>
  );
}