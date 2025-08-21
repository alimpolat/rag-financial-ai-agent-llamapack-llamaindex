import { promises as fs } from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { htmlToText } from 'html-to-text';

export type ExtractedDoc = {
  text: string;
  metadata: Record<string, any>;
};

export async function extractTextFromFile(filePath: string): Promise<ExtractedDoc> {
  const ext = path.extname(filePath).toLowerCase();
  const baseName = path.basename(filePath);
  const stats = await fs.stat(filePath);
  const metadataBase = {
    source_path: filePath,
    file_name: baseName,
    file_ext: ext,
    file_size_bytes: stats.size,
    ingested_at: new Date().toISOString(),
  };

  if (ext === '.pdf') {
    const data = await fs.readFile(filePath);
    const parsed = await pdfParse(data);
    const text = parsed.text || '';
    return { text, metadata: { ...metadataBase, pdf_numpages: parsed.numpages } };
  }

  if (ext === '.docx') {
    const data = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer: data });
    const text = (result.value || '').trim();
    return { text, metadata: metadataBase };
  }

  if (ext === '.html' || ext === '.htm') {
    const html = await fs.readFile(filePath, 'utf8');
    const text = htmlToText(html, {
      wordwrap: false,
      selectors: [
        { selector: 'a', options: { ignoreHref: true } },
        { selector: 'img', format: 'skip' },
        { selector: 'script', format: 'skip' },
        { selector: 'style', format: 'skip' },
      ],
    });
    return { text, metadata: metadataBase };
  }

  if (ext === '.txt' || ext === '.md') {
    const text = await fs.readFile(filePath, 'utf8');
    return { text, metadata: metadataBase };
  }

  throw new Error(`Unsupported file type: ${ext}`);
}
