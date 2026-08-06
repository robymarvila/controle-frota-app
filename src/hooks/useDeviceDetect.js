import { useState, useEffect } from 'react';

/**
 * Hook to detect device type and PWA mode.
 * Returns { isMobile, isTablet, isDesktop, isPWA }
 * 
 * Breakpoints:
 * - Mobile: <= 768px
 * - Tablet: 769px – 1024px
 * - Desktop: > 1024px
 */
export function useDeviceDetect() {
  const [device, setDevice] = useState(() => {
    if (typeof window === 'undefined') {
      return { isMobile: false, isTablet: false, isDesktop: true, isPWA: false };
    }
    const w = window.innerWidth;
    return {
      isMobile: w <= 768,
      isTablet: w > 768 && w <= 1024,
      isDesktop: w > 1024,
      isPWA: window.matchMedia('(display-mode: standalone)').matches,
    };
  });

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      setDevice({
        isMobile: w <= 768,
        isTablet: w > 768 && w <= 1024,
        isDesktop: w > 1024,
        isPWA: window.matchMedia('(display-mode: standalone)').matches,
      });
    };

    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    
    // Also listen for display-mode changes
    const mqStandalone = window.matchMedia('(display-mode: standalone)');
    mqStandalone.addEventListener?.('change', check);

    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
      mqStandalone.removeEventListener?.('change', check);
    };
  }, []);

  return device;
}
