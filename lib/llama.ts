import {
  storageContextFromDefaults,
  VectorStoreIndex,
  Document,
  ServiceContext,
  Settings,
  type BaseNode,
  MetadataMode,
  SentenceSplitter,
} from 'llamaindex';
import { Ollama } from 'llamaindex';
import path from 'path';
import { INDEX_DIR } from './storage';

// Configure default LLM to Ollama (local LLaMA)
export function configureLLM() {
  const model = process.env.OLLAMA_MODEL || 'llama3';
  // Note: baseUrl is configured via OLLAMA_BASE_URL environment variable
  const llm = new Ollama({ model });
  Settings.llm = llm;
  return llm;
}

export async function loadOrCreateIndex(documents?: Document[]) {
  const storageContext = await storageContextFromDefaults({ persistDir: INDEX_DIR });
  try {
    const index = await VectorStoreIndex.init({ storageContext });
    return index;
  } catch (e) {
    if (!documents || documents.length === 0) {
      throw new Error('No documents provided and no existing index found.');
    }
    const index = await VectorStoreIndex.fromDocuments(documents, { storageContext });
    // Note: persist() is no longer needed in newer versions
    return index;
  }
}

export function defaultNodeParser(): SentenceSplitter {
  // Create a sentence splitter with overlapping chunks to preserve context
  const chunkSize = Number(process.env.CHUNK_SIZE_TOKENS || 512);
  const chunkOverlap = Number(process.env.CHUNK_OVERLAP_TOKENS || 64);
  const parser = new SentenceSplitter({ chunkSize, chunkOverlap });
  return parser;
}

export function buildDocumentsWithMetadata(text: string, metadata: Record<string, any>): Document[] {
  const doc = new Document({ text, metadata });
  return [doc];
}
