interface MathJax {
  typeset: (elements?: Array<string>) => void;
  typesetClear: (elements?: Array<string>) => void;
}

const MathJax: MathJax;

interface DOMPurifyConfig {
  ADD_TAGS?: string[];
  ADD_ATTR?: string[];
  FORBID_TAGS?: string[];
  FORBID_ATTR?: string[];
}

interface DOMPurify {
  sanitize: (dirty: string, config?: DOMPurifyConfig) => string;
}

declare const DOMPurify: DOMPurify;
