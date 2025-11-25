import { useState, useEffect } from 'react';

/**
 * Hook to detect screen size and determine layout mode
 */
export function useResponsive() {
  const [isWideScreen, setIsWideScreen] = useState<boolean>(window.innerWidth >= 768);

  useEffect(() => {
    function handleResize(): void {
      setIsWideScreen(window.innerWidth >= 768);
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { isWideScreen };
}
