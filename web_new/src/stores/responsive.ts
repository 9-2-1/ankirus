import { writable } from 'svelte/store';

function createResponsiveStore() {
  const { subscribe, set } = writable<{ isWideScreen: boolean }>({
    isWideScreen: window.innerWidth >= 1024,
  });

  const handleResize = () => {
    set({ isWideScreen: window.innerWidth >= 1024 });
  };

  // Add event listener
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', handleResize);
  }

  return { subscribe };
}

export const responsiveStore = createResponsiveStore();
