declare namespace showdown {
  export class Converter {
    constructor(options?: Record<string, unknown>);
    makeHtml(markdown: string): string;
  }
}

declare namespace Prism {
  export function highlightAll(): void;
  export function highlightElement(element: Element): void;
}

interface Window {
  Prism?: typeof Prism;
}
