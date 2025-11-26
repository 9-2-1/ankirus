import React, { useEffect, useRef } from 'react';
import { sanitizeHtml, containsMath } from '../utils/htmlProcessor';
import { useMathJax } from '../hooks/useMathJax';

interface CardContentProps {
  content: string;
  className?: string;
}

/**
 * Component for rendering card content with MathJax support and HTML sanitization
 */
export function CardContent({ content, className = '' }: CardContentProps): React.JSX.Element {
  const contentRef = useRef<HTMLDivElement>(null);
  const { processMathJax, mathJaxLoaded } = useMathJax();

  // Process MathJax when content changes or MathJax loads
  useEffect(() => {
    if (contentRef.current && containsMath(content)) {
      processMathJax(contentRef.current);
    }
  }, [content, processMathJax, mathJaxLoaded]);

  // Sanitize HTML content
  const sanitizedContent = sanitizeHtml(content);

  return (
    <div
      ref={contentRef}
      className={`card-content ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  );
}
