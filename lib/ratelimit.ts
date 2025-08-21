type Bucket = { timestamps: number[]; limit: number; windowMs: number };

const buckets: Map<string, Bucket> = new Map();

function getBucket(key: string, limit: number, windowMs: number): Bucket {
  const existing = buckets.get(key);
  if (existing) {
    existing.limit = limit;
    existing.windowMs = windowMs;
    return existing;
  }
  const bucket: Bucket = { timestamps: [], limit, windowMs };
  buckets.set(key, bucket);
  return bucket;
}

export function rateLimit({ key, limit, windowMs }: { key: string; limit: number; windowMs: number }) {
  const now = Date.now();
  const bucket = getBucket(key, limit, windowMs);
  bucket.timestamps = bucket.timestamps.filter(t => now - t < windowMs);
  if (bucket.timestamps.length >= limit) {
    const resetMs = Math.max(0, windowMs - (now - bucket.timestamps[0]));
    return { allowed: false, remaining: 0, resetMs };
  }
  bucket.timestamps.push(now);
  return { allowed: true, remaining: Math.max(0, limit - bucket.timestamps.length), resetMs: windowMs };
}

export function ipFromHeaders(headers: Headers) {
  const xff = headers.get('x-forwarded-for');
  if (xff) {
    return xff.split(',')[0].trim();
  }
  const xr = headers.get('x-real-ip');
  if (xr) {
    return xr;
  }
  return 'unknown';
}
