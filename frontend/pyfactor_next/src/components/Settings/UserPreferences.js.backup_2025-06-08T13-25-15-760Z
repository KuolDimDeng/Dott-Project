'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from 'react-i18next';
import { useLocalStorageMigration } from '@/hooks/useLocalStorageMigration';
import { getThemePreference, saveThemePreference } from '@/utils/userPreferences';
import { useUIScale } from '@/hooks/useUIScale';
import { useUIDensity, DENSITY_OPTIONS } from '@/hooks/useUIDensity';

export function UserPreferences() {
  const { t } = useTranslation();
  const { isMigrated, isMigrating, error, runAllMigrations } = useLocalStorageMigration();
  const [theme, setTheme] = useState('system');
  const { scale, updateScale } = useUIScale();
  const { density, updateDensity } = useUIDensity();
  const [isLoading, setIsLoading] = useState(true);

  // Load theme preference on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await getThemePreference('system');
        setTheme(savedTheme);
      } catch (error) {
        console.error('Error loading theme preference:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTheme();
  }, []);

  // Update theme preference
  const handleThemeChange = async (newTheme) => {
    setTheme(newTheme);
    
    try {
      await saveThemePreference(newTheme);
      
      // Apply theme immediately
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (newTheme === 'light') {
        document.documentElement.classList.remove('dark');
      } else if (newTheme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.toggle('dark', prefersDark);
      }
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  // Function to run migration manually
  const handleMigration = async () => {
    await runAllMigrations();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.userPreferences')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Theme Preference */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium">{t('settings.theme')}</h3>
          <RadioGroup 
            value={theme} 
            onValueChange={handleThemeChange}
            className="flex flex-col space-y-2"
            disabled={isLoading}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="light" id="light" />
              <Label htmlFor="light">{t('settings.lightTheme')}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="dark" id="dark" />
              <Label htmlFor="dark">{t('settings.darkTheme')}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="system" id="system" />
              <Label htmlFor="system">{t('settings.systemTheme')}</Label>
            </div>
          </RadioGroup>
        </div>
        
        <Separator />
        
        {/* UI Scale */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium">{t('settings.uiScale')}</h3>
          <RadioGroup 
            value={scale} 
            onValueChange={updateScale}
            className="flex flex-col space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="75" id="scale-small" />
              <Label htmlFor="scale-small">{t('settings.small')}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="100" id="scale-medium" />
              <Label htmlFor="scale-medium">{t('settings.medium')}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="125" id="scale-large" />
              <Label htmlFor="scale-large">{t('settings.large')}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="150" id="scale-xlarge" />
              <Label htmlFor="scale-xlarge">{t('settings.xlarge')}</Label>
            </div>
          </RadioGroup>
        </div>
        
        <Separator />
        
        {/* UI Density */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium">{t('settings.uiDensity')}</h3>
          <RadioGroup 
            value={density} 
            onValueChange={updateDensity}
            className="flex flex-col space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value={DENSITY_OPTIONS.COMPACT} id="density-compact" />
              <Label htmlFor="density-compact">{t('settings.compact')}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value={DENSITY_OPTIONS.NORMAL} id="density-normal" />
              <Label htmlFor="density-normal">{t('settings.normal')}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value={DENSITY_OPTIONS.COMFORTABLE} id="density-comfortable" />
              <Label htmlFor="density-comfortable">{t('settings.comfortable')}</Label>
            </div>
          </RadioGroup>
        </div>
        
        <Separator />
        
        {/* Migration Status */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium">{t('settings.localStorage')}</h3>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">
                {t('settings.migrateToCloud')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isMigrated 
                  ? t('settings.migrationComplete') 
                  : t('settings.migrationPending')}
              </p>
              {error && (
                <p className="text-xs text-destructive mt-1">{error}</p>
              )}
            </div>
            <Button 
              size="sm" 
              onClick={handleMigration}
              disabled={isMigrating || isMigrated}
            >
              {isMigrating 
                ? t('settings.migrating') 
                : isMigrated 
                  ? t('settings.migrated')
                  : t('settings.migrate')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 