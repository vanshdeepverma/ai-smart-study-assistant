import fs from 'fs';

export class PdfProcessingService {
  /**
   * Extracts pure text from a PDF file
   */
  static async extractText(filePath: string): Promise<{ text: string; pages: number }> {
    const dataBuffer = fs.readFileSync(filePath);
    const pdfParse = require('pdf-parse');

    if (typeof pdfParse === 'function') {
      const data = await pdfParse(dataBuffer);
      return {
        text: data.text || '',
        pages: data.numpages || 1,
      };
    } else if (pdfParse.PDFParse) {
      const uint8Array = new Uint8Array(dataBuffer);
      const parser = new pdfParse.PDFParse(uint8Array);
      const data = await parser.getText();
      return {
        text: data.text || '',
        pages: data.total || 1,
      };
    } else {
      throw new Error('Unsupported pdf-parse library structure');
    }
  }

  /**
   * Splits text into manageable chunks for RAG
   * Creates ~1000 char chunks with 200 char overlap
   */
  static chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
    const cleanText = text.replace(/\s+/g, ' ').trim();
    const chunks: string[] = [];
    
    if (!cleanText) return chunks;

    let i = 0;
    while (i < cleanText.length) {
      const chunk = cleanText.substring(i, i + chunkSize);
      chunks.push(chunk);
      i += chunkSize - overlap;
    }

    return chunks;
  }
}
