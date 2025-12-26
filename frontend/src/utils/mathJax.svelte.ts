interface MathJaxWindow {
  MathJax?: {
    typesetPromise: (elements: HTMLElement[]) => Promise<void>;
    tex?: { inlineMath: string[][]; displayMath: string[][]; processEscapes: boolean };
    options?: { skipHtmlTags: string[]; renderActions: { [key: string]: unknown } };
  };
}

// 管理 MathJax 是否准备就绪的内部标志
// 由于svelte引用限制，只能导出对象并在内部修改对象
export const mathJaxReady = $state({ value: false });

// 渲染 MathJax 的函数
export function renderMathJax(element: HTMLElement): void {
  const mathJaxWindow = window as unknown as MathJaxWindow;
  if (mathJaxReady && mathJaxWindow.MathJax) {
    // 清空元素内容以确保正确渲染
    element.querySelectorAll('mjx-container').forEach(container => container.remove());

    mathJaxWindow.MathJax.typesetPromise([element]).catch((error: unknown) => {
      console.error('MathJax rendering error:', error);
    });
  }
}

// 初始化 MathJax
if (typeof window !== 'undefined') {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
  script.async = true;
  script.onload = () => {
    mathJaxReady.value = true;
  };
  document.head.appendChild(script);
}
