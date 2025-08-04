'use client';

import React, { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';

/**
 * UserMenu - Dropdown menu for user actions
 * Extracted from massive AppBar component
 */
const UserMenu = forwardRef(({ 
  isOpen, 
  onClose, 
  userData,
  onProfileClick,
  onSettingsClick,
  onHelpClick,
  onPrivacyClick,
  onTermsClick,
  onLogout
}, ref) => {
  const { t } = useTranslation();
  const router = useRouter();

  if (!isOpen) return null;

  const menuItems = [
    {
      label: t('appBar.profile'),
      onClick: onProfileClick,
      icon: '👤'
    },
    {
      label: t('appBar.settings'),
      onClick: onSettingsClick,
      icon: '⚙️'
    },
    {
      label: t('appBar.help'),
      onClick: onHelpClick,
      icon: '❓'
    },
    {
      label: t('appBar.privacy'),
      onClick: onPrivacyClick,
      icon: '🔒'
    },
    {
      label: t('appBar.terms'),
      onClick: onTermsClick,
      icon: '📄'
    },
    {
      label: t('appBar.logout'),
      onClick: onLogout,
      icon: '🚪',
      className: 'text-red-600 hover:bg-red-50'
    }
  ];

  return (
    <div 
      ref={ref}
      className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50"
    >
      <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="user-menu">
        {menuItems.map((item, index) => (
          <button
            key={index}
            onClick={() => {
              item.onClick();
              onClose();
            }}
            className={`
              ${item.className || 'text-gray-700 hover:bg-gray-100'}
              flex items-center px-4 py-2 text-sm w-full text-left
            `}
            role="menuitem"
          >
            <span className="mr-2">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
});

UserMenu.displayName = 'UserMenu';

export default UserMenu;
