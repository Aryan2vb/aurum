import { useCallback } from 'react';

export const usePermission = () => {
  const role = localStorage.getItem('userRole');

  const can = useCallback((action) => {
    switch (action) {
      case 'read':
        return true; 
      case 'write':
        return ['OWNER', 'ADMIN', 'STAFF'].includes(role);
      case 'delete':
        return role === 'OWNER';
      case 'manage-roles':
        return role === 'OWNER';
      case 'admin':
        return ['OWNER', 'ADMIN'].includes(role);
      default:
        return false;
    }
  }, [role]);

  return { can, role };
};

