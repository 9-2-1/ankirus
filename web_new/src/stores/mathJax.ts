import { writable } from 'svelte/store';

interface MathJaxWindow {
  MathJax?: {
    typesetPromise: (elements: HTMLElement[]) => Promise<void>;
    tex?: { inlineMath: string[][]; displayMath: string[][]; processEscapes: boolean };
    options?: { skipHtmlTags: string[]; renderActions: { [key: string]: unknown } };
  };
}

function createMathJaxStore() {
  const { subscribe, set } = writable<{ isReady: boolean }>({ isReady: false });

  let mathJaxReady = false;

  const renderMathJax = (element: HTMLElement): void => {
    const mathJaxWindow = window as unknown as MathJaxWindow;
    if (mathJaxReady && mathJaxWindow.MathJax) {
      mathJaxWindow.MathJax.typesetPromise([element]).catch((error: unknown) => {
        console.error('MathJax rendering error:', error);
      });
    }
  };

  // Initialize MathJax
  if (typeof window !== 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
    script.async = true;
    script.onload = () => {
      mathJaxReady = true;
      set({ isReady: true });
    };
    document.head.appendChild(script);
  }

  return { subscribe, renderMathJax };
}

export const mathJaxStore = createMathJaxStore();
