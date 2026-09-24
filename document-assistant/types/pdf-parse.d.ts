declare module "pdf-parse/lib/pdf-parse.js" {
  interface PdfParseResult {
    text: string;
    [key: string]: unknown;
  }

  const parse: (data: Buffer) => Promise<PdfParseResult>;
  export default parse;
}