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
import i18n from '../../../i18n';

// Language options with native names
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

export default function DashboardLanguageSelector() {
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentLanguage, setCurrentLanguage] = useState(
    languages.find(lang => lang.code === i18n.language) || languages[0]
  );
  const [searchQuery, setSearchQuery] = useState('');

  // Update current language when i18n language changes
  useEffect(() => {
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