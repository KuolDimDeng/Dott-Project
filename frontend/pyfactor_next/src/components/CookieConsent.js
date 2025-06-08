'use client';


import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTranslation } from 'react-i18next';
import { saveUserPreferences, PREF_KEYS } from '@/utils/userPreferences';
import { getCacheValue, setCacheValue } from '@/utils/appCache';

/**
 * Cookie consent banner component
 * Uses Cognito attributes and AppCache instead of cookies
 */
export function CookieConsent() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true, // Always required
    analytics: false,
    marketing: false,
    preferences: false
  });

  // Check for existing consent on mount
  useEffect(() => {
    const checkConsent = async () => {
      try {
        // Check AppCache first (for faster response)
        const cachedConsent = getCacheValue(PREF_KEYS.COOKIE_CONSENT);
        
        if (cachedConsent) {
          // Parse the JSON string from cache
          const consentObj = typeof cachedConsent === 'string' 
            ? JSON.parse(cachedConsent) 
            : cachedConsent;
            
          if (consentObj) {
            setPreferences(prev => ({
              ...prev,
              analytics: consentObj.analytics === true,
              marketing: consentObj.marketing === true,
              preferences: consentObj.preferences === true
            }));
            return; // Don't show banner if we have consent
          }
        }
        
        // Show banner if no consent found
        setIsOpen(true);
      } catch (e) {
        console.error('Error checking consent:', e);
        // If error, show banner
        setIsOpen(true);
      }
    };
    
    checkConsent();
  }, []);

  // Save consent preferences to Cognito and AppCache
  const saveConsent = async () => {
    try {
      // Create consent JSON
      const consentJSON = JSON.stringify({
        necessary: true,
        analytics: preferences.analytics,
        marketing: preferences.marketing,
        preferences: preferences.preferences,
        timestamp: new Date().toISOString()
      });
      
      // Save to AppCache for immediate availability
      setCacheValue(PREF_KEYS.COOKIE_CONSENT, consentJSON);
      
      // Save to Cognito in background
      await saveUserPreferences({
        [PREF_KEYS.COOKIE_CONSENT]: consentJSON,
        [PREF_KEYS.ANALYTICS_CONSENT]: preferences.analytics.toString(),
        [PREF_KEYS.MARKETING_CONSENT]: preferences.marketing.toString()
      });
      
      // Close banner
      setIsOpen(false);
    } catch (error) {
      console.error('Error saving consent:', error);
    }
  };

  // Accept all and save consent
  const acceptAll = () => {
    setPreferences({
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true
    });
    
    // Save with all preferences enabled
    saveConsent();
  };

  // Update a specific preference
  const updatePreference = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>{t('cookieConsent.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm mb-4">{t('cookieConsent.description')}</p>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="necessary" className="flex-1">
                {t('cookieConsent.necessary')}
                <span className="block text-xs text-muted-foreground">
                  {t('cookieConsent.necessaryDesc')}
                </span>
              </Label>
              <Switch id="necessary" checked disabled />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="analytics" className="flex-1">
                {t('cookieConsent.analytics')}
                <span className="block text-xs text-muted-foreground">
                  {t('cookieConsent.analyticsDesc')}
                </span>
              </Label>
              <Switch 
                id="analytics" 
                checked={preferences.analytics}
                onCheckedChange={(checked) => updatePreference('analytics', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="marketing" className="flex-1">
                {t('cookieConsent.marketing')}
                <span className="block text-xs text-muted-foreground">
                  {t('cookieConsent.marketingDesc')}
                </span>
              </Label>
              <Switch 
                id="marketing" 
                checked={preferences.marketing}
                onCheckedChange={(checked) => updatePreference('marketing', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="preferences" className="flex-1">
                {t('cookieConsent.preferences')}
                <span className="block text-xs text-muted-foreground">
                  {t('cookieConsent.preferencesDesc')}
                </span>
              </Label>
              <Switch 
                id="preferences" 
                checked={preferences.preferences}
                onCheckedChange={(checked) => updatePreference('preferences', checked)}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => saveConsent()}>
            {t('cookieConsent.savePreferences')}
          </Button>
          <Button onClick={acceptAll}>
            {t('cookieConsent.acceptAll')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 