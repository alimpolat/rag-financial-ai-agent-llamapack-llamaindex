import { NextRequest } from "next/server";
import { ensureStorage, UPLOAD_DIR } from "@/lib/storage";
import { rateLimit, ipFromHeaders } from "@/lib/ratelimit";
import { saveIncomingFile } from "@/lib/upload";
import { handleApiError, FileUploadError, RateLimitError, ExternalServiceError } from "@/lib/errorHandler";
import { uploadLogger } from "@/lib/logger";

export const runtime = "nodejs";
export const preferredRegion = ["iad1", "sfo1", "fra1"]; // irrelevant locally

const MAX_FILES = 12;
const MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100MB total
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.html', '.htm', '.txt', '.md'];
const SUSPICIOUS_PATTERNS = [
  /\.exe$/i, /\.bat$/i, /\.cmd$/i, /\.scr$/i, /\.vbs$/i, /\.js$/i, /\.jar$/i,
  /<script/i, /javascript:/i, /vbscript:/i, /onload=/i, /onerror=/i
];

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const ip = ipFromHeaders(req.headers);

  try {
    uploadLogger.logRequest('POST', '/api/upload', ip, req.headers.get('user-agent') || undefined);

    const rl = rateLimit({ key: `upload:${ip}`, limit: 20, windowMs: 60_000 });
    if (!rl.allowed) {
      throw new RateLimitError('Too many uploads, slow down.', { ip });
    }
    await ensureStorage();

    const form = await req.formData();
    const files = form.getAll("files");

    if (files.length === 0) {
      throw new FileUploadError('No files provided', { fileCount: 0 });
    }
    if (files.length > MAX_FILES) {
      throw new FileUploadError(`Too many files (max ${MAX_FILES})`, { fileCount: files.length, maxFiles: MAX_FILES });
    }

    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
      "text/html",
      "application/xhtml+xml",
      "text/plain",
      "text/markdown",
      "application/octet-stream", // fallback
    ];

    // Additional security validations
    let totalSize = 0;
    const saved: string[] = [];
    
    for (const f of files) {
      if (!(f instanceof File)) continue;
      
      // Size validations
      if (f.size > 25 * 1024 * 1024) {
        throw new FileUploadError(`${f.name} exceeds 25MB limit`, { fileName: f.name, fileSize: f.size });
      }
      totalSize += f.size;
      if (totalSize > MAX_TOTAL_SIZE) {
        throw new FileUploadError('Total upload size exceeds 100MB limit', { totalSize, maxTotalSize: MAX_TOTAL_SIZE });
      }
      
      // File extension validation
      const fileExt = f.name.toLowerCase().substring(f.name.lastIndexOf('.'));
      if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
        throw new FileUploadError(`Unsupported file extension: ${fileExt}`, { fileName: f.name, extension: fileExt });
      }
      
      // Security pattern validation
      const fileName = f.name.toLowerCase();
      const hasSuspiciousPattern = SUSPICIOUS_PATTERNS.some(pattern => pattern.test(fileName));
      if (hasSuspiciousPattern) {
        throw new FileUploadError(`File name contains suspicious patterns: ${f.name}`, { fileName: f.name });
      }
      
      // MIME type validation (additional check)
      if (
        !allowed.includes(f.type) &&
        !ALLOWED_EXTENSIONS.some(ext => f.name.toLowerCase().endsWith(ext))
      ) {
        throw new FileUploadError(`Unsupported file type for ${f.name}`, { fileName: f.name, mimeType: f.type });
      }
      
      const p = await saveIncomingFile(UPLOAD_DIR, f);
      saved.push(p);
    }

    // Proxy ingestion to Python backend (LlamaIndex)
    const pyUrl = process.env.PY_BACKEND_URL || "http://localhost:8000";
    const resp = await fetch(`${pyUrl}/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_paths: saved }),
    });
    const json = await resp.json();
    if (!resp.ok) {
      throw new ExternalServiceError('Python ingest failed', { 
        status: resp.status, 
        error: json?.detail || json?.error,
        savedFiles: saved.length 
      });
    }

    const duration = Date.now() - startTime;
    uploadLogger.logResponse('POST', '/api/upload', 200, duration, totalSize);
    uploadLogger.info('Upload completed successfully', { 
      fileCount: saved.length, 
      totalSize, 
      ingested: json.ingested 
    });

    return new Response(JSON.stringify({ ingested: json.ingested ?? saved.length }), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    });
  } catch (error) {
    return handleApiError(error, 'upload');
  }
}
