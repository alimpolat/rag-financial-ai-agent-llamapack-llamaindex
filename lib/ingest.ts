import { extractTextFromFile } from './fileExtractors';
import { buildDocumentsWithMetadata, defaultNodeParser, loadOrCreateIndex } from './llama';

export async function ingestFiles(filePaths: string[]) {
  const nodeParser = defaultNodeParser();
  // Note: Settings.nodeParser is deprecated in newer versions of LlamaIndex

  const allDocs = [] as ReturnType<typeof buildDocumentsWithMetadata> extends (infer U)[] ? U[] : never;

  for (const filePath of filePaths) {
    const { text, metadata } = await extractTextFromFile(filePath);
    const docs = buildDocumentsWithMetadata(text, metadata);
    allDocs.push(...docs);
  }

  const index = await loadOrCreateIndex(allDocs);
  return index;
}

// saveIncomingFile moved to lib/upload.ts to avoid importing llamaindex in upload route
