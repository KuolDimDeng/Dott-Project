'use client';

/**
 * MainListItems - Modular Navigation Component
 * Reduced from 2,864 lines to ~200 lines using icon library and configuration
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '@/hooks/usePermissions';
import { menuGroups, getVisibleMenuItems } from '@/shared/config/navigation';

const MainListItems = ({ 
  open = true, 
  handleItemClick, 
  handleSetView,
  businessInfo = {} 
}) => {
  const { t } = useTranslation();
  const { permissions } = usePermissions();
  const [expandedSections, setExpandedSections] = useState({});

  // Get visible menu items based on permissions
  const visibleMenuGroups = useMemo(() => 
    getVisibleMenuItems(permissions),
    [permissions]
  );

  // Toggle section expansion
  const toggleSection = useCallback((sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  }, []);

  // Handle menu item click
  const handleClick = useCallback((item) => {
    if (handleItemClick) {
      handleItemClick(item.id);
    }
    if (handleSetView) {
      handleSetView(item.id);
    }
  }, [handleItemClick, handleSetView]);

  return (
    <nav className="flex-1 space-y-1 px-2 py-4">
      {Object.entries(visibleMenuGroups).map(([groupKey, group]) => (
        <div key={groupKey} className="space-y-1">
          {/* Group Header */}
          <button
            onClick={() => toggleSection(groupKey)}
            className={`
              w-full group flex items-center px-2 py-2 text-sm font-medium rounded-md
              ${open ? 'justify-between' : 'justify-center'}
              text-gray-600 hover:bg-gray-50 hover:text-gray-900
            `}
          >
            {open && (
              <span className="flex-1 text-left">
                {t(group.title)}
              </span>
            )}
            <svg
              className={`
                ${open ? 'ml-2' : ''} h-5 w-5 transform transition-colors
                ${expandedSections[groupKey] ? 'rotate-90' : ''}
              `}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {/* Group Items */}
          {expandedSections[groupKey] && (
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleClick(item)}
                    className={`
                      w-full group flex items-center px-2 py-2 text-sm font-medium rounded-md
                      ${open ? '' : 'justify-center'}
                      text-gray-600 hover:bg-gray-50 hover:text-gray-900
                      transition-colors duration-150 ease-in-out
                    `}
                  >
                    <Icon className={`${open ? 'mr-3' : ''} flex-shrink-0 h-6 w-6`} />
                    {open && (
                      <span className="flex-1 text-left">
                        {t(item.label)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
};

export default MainListItems;

// Export for backward compatibility
export { MainListItems };
