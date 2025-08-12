'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function PageTitle({ titleKey = 'browserTitle' }) {
  const { t } = useTranslation('common');

  useEffect(() => {
    const title = t(titleKey);
    if (title && document) {
      document.title = title;
    }
  }, [t, titleKey]);

  return null;
}