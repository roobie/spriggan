declare namespace showdown {
  export class Converter {
    constructor(options?: Record<string, unknown>);
    makeHtml(markdown: string): string;
  }
}
