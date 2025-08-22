interface MathJax {
  typeset: (elements?: Array<string>) => void;
  typesetClear: (elements?: Array<string>) => void;
}

const MathJax: MathJax;
