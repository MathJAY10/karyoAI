import { useNavigate, useLocation } from 'react-router-dom';
import { useCallback } from 'react';

export const usePremiumNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navigateToSuite = useCallback((suitePath: string) => {
    navigate(suitePath);
  }, [navigate]);

  const navigateToTool = useCallback((suitePath: string, toolPath?: string) => {
    if (toolPath) {
      navigate(`${suitePath}/${toolPath}`);
    } else {
      navigate(suitePath);
    }
  }, [navigate]);

  const goBack = useCallback(() => {
    if (location.pathname.includes('/premium/')) {
      navigate('/premium');
    } else {
      navigate(-1);
    }
  }, [navigate, location.pathname]);

  const isInSuite = useCallback((suitePath: string) => {
    return location.pathname.startsWith(suitePath);
  }, [location.pathname]);

  return {
    navigateToSuite,
    navigateToTool,
    goBack,
    isInSuite,
    currentPath: location.pathname
  };
}; 