import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUserRole } from '../hooks/useUserRole';

import { useTranslation } from 'react-i18next';

interface RequireAdminProps {
  children: React.ReactNode;
}

export default function RequireAdmin({ children }: RequireAdminProps) {
  const { role, loading } = useUserRole();
  const { t } = useTranslation(['common']);
  
  if (loading) {
    return <div className="p-8 text-center text-cocoa-500">{t('common:loading_ellipsis')}</div>;
  }
  
  if (role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}
