import { useEffect, useRef, useState } from 'react';

/**
 * Hook to process MathJax content in React components
 */
export function useMathJax() {
  const mathJaxLoaded = useRef<boolean>(false);
  const [loaded, setLoaded] = useState<boolean>(false);

  useEffect(() => {
    // Load MathJax dynamically
    if (!mathJaxLoaded.current && typeof window !== 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
      script.async = true;
      script.onload = () => {
        mathJaxLoaded.current = true;
        setLoaded(true);
        // Configure MathJax
        if (window.MathJax) {
          window.MathJax = {
            ...window.MathJax,
            tex: {
              inlineMath: [
                ['$', '$'],
                ['\\(', '\\)'],
              ],
              displayMath: [
                ['$$', '$$'],
                ['\\[', '\\]'],
              ],
              processEscapes: true,
            },
            options: {
              skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
              renderActions: { addMenu: [0, '', ''] },
            },
          };
        }
      };
      document.head.appendChild(script);

      return () => {
        // Cleanup if needed
        if (document.head.contains(script)) {
          document.head.removeChild(script);
        }
      };
    }
  }, []);

  /**
   * Process MathJax in a container element
   */
  const processMathJax = (element: HTMLElement | null): void => {
    if (element && mathJaxLoaded.current && window.MathJax) {
      try {
        window.MathJax.typesetPromise([element]).catch(console.error);
      } catch (error) {
        console.warn('MathJax processing failed:', error);
      }
    }
  };

  return { processMathJax, mathJaxLoaded: loaded };
}
