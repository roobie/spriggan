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

declare namespace useweft {
  export function rehash(): void;
}

interface Window {
  Prism?: typeof Prism;
  demo: unknown;
}
