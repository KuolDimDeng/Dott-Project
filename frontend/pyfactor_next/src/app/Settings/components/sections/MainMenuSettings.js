'use client';

import React, { useState, useEffect } from 'react';
import { useNotification } from '@/context/NotificationContext';
import { Switch } from '@headlessui/react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

const MainMenuSettings = () => {
  const { notifySuccess, notifyError } = useNotification();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [menuSettings, setMenuSettings] = useState([]);
  const [businessFeatures, setBusinessFeatures] = useState([]);
  const [businessType, setBusinessType] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchMenuSettings();
  }, []);

  const fetchMenuSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings/menu-visibility');
      if (!response.ok) throw new Error('Failed to fetch menu settings');
      
      const data = await response.json();
      setMenuSettings(data.menu_settings || []);
      setBusinessFeatures(data.business_features || []);
      setBusinessType(data.business_type);
    } catch (error) {
      console.error('Error fetching menu settings:', error);
      notifyError('Failed to load menu settings');
    } finally {
      setLoading(false);
    }
  };

  const toggleMenuItem = (menuKey, newValue) => {
    setMenuSettings(prevSettings => {
      return prevSettings.map(menu => {
        if (menu.key === menuKey) {
          // If this is a parent menu being disabled, disable all submenus
          const updatedMenu = { ...menu, is_visible: newValue };
          if (!newValue && menu.submenus) {
            updatedMenu.submenus = menu.submenus.map(sub => ({
              ...sub,
              is_visible: false
            }));
          }
          return updatedMenu;
        }
        
        // Check if this is a submenu
        if (menu.submenus) {
          const updatedSubmenus = menu.submenus.map(sub => {
            if (sub.key === menuKey) {
              return { ...sub, is_visible: newValue };
            }
            return sub;
          });
          return { ...menu, submenus: updatedSubmenus };
        }
        
        return menu;
      });
    });
    setHasChanges(true);
  };

  const saveChanges = async () => {
    try {
      setSaving(true);
      
      // Prepare updates
      const updates = [];
      menuSettings.forEach(menu => {
        updates.push({
          menu_item: menu.key,
          is_visible: menu.is_visible,
          parent_menu: null
        });
        
        if (menu.submenus) {
          menu.submenus.forEach(sub => {
            updates.push({
              menu_item: sub.key,
              is_visible: sub.is_visible,
              parent_menu: menu.key
            });
          });
        }
      });
      
      const response = await fetch('/api/settings/menu-visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });
      
      if (!response.ok) throw new Error('Failed to save menu settings');
      
      notifySuccess('Menu settings saved successfully');
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving menu settings:', error);
      notifyError('Failed to save menu settings');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setMenuSettings(prevSettings => {
      return prevSettings.map(menu => ({
        ...menu,
        is_visible: menu.default_visible,
        submenus: menu.submenus?.map(sub => ({
          ...sub,
          is_visible: sub.default_visible
        })) || []
      }));
    });
    setHasChanges(true);
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Main Menu Configuration</h2>
          <p className="mt-1 text-sm text-gray-600">
            Control which menu items are visible in your main navigation. 
            {businessType && (
              <span className="block mt-1">
                Based on your business type ({businessType}), 
                {businessFeatures.includes('jobs') && !businessFeatures.includes('pos') && ' Jobs features are enabled by default.'}
                {!businessFeatures.includes('jobs') && businessFeatures.includes('pos') && ' POS features are enabled by default.'}
                {businessFeatures.includes('jobs') && businessFeatures.includes('pos') && ' both Jobs and POS features are enabled by default.'}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={resetToDefaults}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          Reset to defaults
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start space-x-3">
        <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">Important:</p>
          <p className="mt-1">
            Menu visibility settings apply to all users in your business. 
            Individual user permissions can further restrict access to enabled menus.
          </p>
        </div>
      </div>

      {/* Menu Items */}
      <div className="space-y-4">
        {menuSettings.map(menu => (
          <div key={menu.key} className="bg-white rounded-lg border border-gray-200 p-4">
            {/* Parent Menu */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-base font-medium text-gray-900">{menu.label}</h3>
                {menu.requires_admin && (
                  <span className="text-xs text-gray-500">Requires Admin</span>
                )}
              </div>
              <Switch
                checked={menu.is_visible}
                onChange={(checked) => toggleMenuItem(menu.key, checked)}
                className={`${
                  menu.is_visible ? 'bg-blue-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
              >
                <span
                  className={`${
                    menu.is_visible ? 'translate-x-6' : 'translate-x-1'
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </Switch>
            </div>

            {/* Submenus */}
            {menu.submenus && menu.submenus.length > 0 && (
              <div className="mt-4 pl-4 space-y-3 border-l-2 border-gray-200">
                {menu.submenus.map(submenu => (
                  <div key={submenu.key} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-gray-700">{submenu.label}</p>
                      {!menu.is_visible && (
                        <p className="text-xs text-gray-500 italic">
                          Parent menu must be enabled
                        </p>
                      )}
                    </div>
                    <Switch
                      checked={submenu.is_visible}
                      onChange={(checked) => toggleMenuItem(submenu.key, checked)}
                      disabled={!menu.is_visible}
                      className={`${
                        submenu.is_visible && menu.is_visible ? 'bg-blue-600' : 'bg-gray-200'
                      } relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        !menu.is_visible ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <span
                        className={`${
                          submenu.is_visible ? 'translate-x-5' : 'translate-x-1'
                        } inline-block h-3 w-3 transform rounded-full bg-white transition-transform`}
                      />
                    </Switch>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end pt-4 border-t">
          <button
            onClick={saveChanges}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
};

export default MainMenuSettings;