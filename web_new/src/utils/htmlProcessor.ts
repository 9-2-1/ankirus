import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content using DOMPurify
 */
export function sanitizeHtml(content: string): string {
  if (typeof content !== 'string') {
    return '';
  }

  // Configure DOMPurify with MathJax-friendly settings
  const config = {
    ADD_TAGS: ['math', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 'msqrt', 'mroot'],
    ADD_ATTR: ['display', 'mathvariant', 'mathsize', 'mathcolor', 'href'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'base'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout'],
  };

  return DOMPurify.sanitize(content, config);
}

/**
 * Check if content contains mathematical formulas
 */
export function containsMath(content: string): boolean {
  if (typeof content !== 'string') {
    return false;
  }

  // Check for common math delimiters using string methods instead of regex
  const mathIndicators = [
    '\\[',
    '\\]', // \[ ... \]
    '\\(',
    '\\)', // \( ... \)
    '$',
    '$$', // $$ ... $$
  ];

  return mathIndicators.some(indicator => content.includes(indicator));
}
