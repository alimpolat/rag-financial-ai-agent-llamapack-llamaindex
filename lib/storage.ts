import { promises as fs } from 'fs';
import path from 'path';

export const STORAGE_ROOT = path.resolve(process.cwd(), 'storage');
export const UPLOAD_DIR = path.join(STORAGE_ROOT, 'uploads');
export const INDEX_DIR = path.join(STORAGE_ROOT, 'index');

export async function ensureStorage() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.mkdir(INDEX_DIR, { recursive: true });
}
