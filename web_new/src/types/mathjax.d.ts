declare global {
  interface Window {
    MathJax?: {
      typesetPromise: (elements: HTMLElement[]) => Promise<void>;
      tex: { inlineMath: string[][]; displayMath: string[][]; processEscapes: boolean };
      options: { skipHtmlTags: string[]; renderActions: { addMenu: [number, string, string] } };
    };
  }
}

export {};
