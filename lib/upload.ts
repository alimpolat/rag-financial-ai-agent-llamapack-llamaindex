import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

export async function saveIncomingFile(dir: string, file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const hash = crypto.createHash('sha1').update(buffer).digest('hex');
  const ext = path.extname(file.name).toLowerCase() || '';
  const safeBase = path.basename(file.name, ext).replace(/[^a-zA-Z0-9-_]+/g, '_');
  const fileName = `${safeBase}_${hash.slice(0, 10)}${ext}`;
  const fullPath = path.join(dir, fileName);
  await fs.writeFile(fullPath, buffer);
  return fullPath;
}
