'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * CreateMenu - Quick create actions dropdown
 */
const CreateMenu = ({ 
  isOpen,
  onClose,
  onItemClick,
  businessType = 'MIXED'
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const menuItems = [
    {
      id: 'customer',
      label: t('create.customer'),
      icon: '👥',
      action: 'create_customer',
      businessTypes: ['SERVICE', 'RETAIL', 'MIXED']
    },
    {
      id: 'invoice',
      label: t('create.invoice'),
      icon: '📄',
      action: 'create_invoice',
      businessTypes: ['SERVICE', 'MIXED']
    },
    {
      id: 'product',
      label: t('create.product'),
      icon: '📦',
      action: 'create_product',
      businessTypes: ['RETAIL', 'MIXED']
    },
    {
      id: 'supplier',
      label: t('create.supplier'),
      icon: '🚚',
      action: 'create_supplier',
      businessTypes: ['RETAIL', 'MIXED']
    },
    {
      id: 'employee',
      label: t('create.employee'),
      icon: '👔',
      action: 'create_employee',
      businessTypes: ['SERVICE', 'RETAIL', 'MIXED']
    }
  ];

  const visibleItems = menuItems.filter(item => 
    item.businessTypes.includes(businessType)
  );

  return (
    <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
      <div className="py-1" role="menu" aria-orientation="vertical">
        {visibleItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              onItemClick(item.action);
              onClose();
            }}
            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
            role="menuitem"
          >
            <span className="mr-3 text-lg">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CreateMenu;
