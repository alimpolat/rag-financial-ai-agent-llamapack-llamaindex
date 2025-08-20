import { NextRequest } from "next/server";
import { z } from "zod";
// Now proxy to Python backend for LlamaIndex querying
import { rateLimit, ipFromHeaders } from "@/lib/ratelimit";
import { chatLogger, PerformanceMonitor } from "@/lib/logger";
import { responseCache, generateQueryCacheKey } from "@/lib/cache";
import { handleApiError, RateLimitError, ExternalServiceError } from "@/lib/errorHandler";

export const runtime = "nodejs";

const bodySchema = z.object({
  question: z.string().min(3).max(2000),
  topK: z.number().int().min(1).max(50).optional(),
  enableLLMRerank: z.boolean().optional(),
  enableRerank: z.boolean().optional(),
  sentenceWindowSize: z.number().int().min(1).max(10).optional(),
});

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const ip = ipFromHeaders(req.headers);
  
  try {
    chatLogger.logRequest('POST', '/api/chat', ip, req.headers.get('user-agent') || undefined);
    
    const rl = rateLimit({ key: `chat:${ip}`, limit: 60, windowMs: 60_000 });
    if (!rl.allowed) {
      throw new RateLimitError('Rate limit exceeded', { ip });
    }
    
    const json = await req.json();
    const { question, topK, enableLLMRerank, enableRerank, sentenceWindowSize } = bodySchema.parse(json);
    
    chatLogger.info('Chat request received', { 
      questionLength: question.length, 
      topK, 
      enableLLMRerank, 
      enableRerank, 
      sentenceWindowSize 
    });

    // Check cache first
    const cacheKey = generateQueryCacheKey(question, topK || 5, enableRerank, enableLLMRerank, sentenceWindowSize);
    const cachedResponse = responseCache.get(cacheKey);
    
    if (cachedResponse) {
      chatLogger.info('Serving cached response', { cacheKey });
      const duration = Date.now() - startTime;
      PerformanceMonitor.recordMetric('chat_request_duration_cached', duration);
      chatLogger.logResponse('POST', '/api/chat', 200, duration);
      
      return new Response(JSON.stringify(cachedResponse), { 
        status: 200, 
        headers: { "Content-Type": "application/json" } 
      });
    }

    const pyUrl = process.env.PY_BACKEND_URL || "http://localhost:8000";
    const resp = await fetch(`${pyUrl}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        top_k: topK,
        enable_llm_rerank: enableLLMRerank,
        enable_rerank: enableRerank,
        sentence_window_size: sentenceWindowSize,
      }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      throw new ExternalServiceError('Python chat failed', {
        status: resp.status,
        error: data?.detail || data?.error
      });
    }
    
    const responseData = { answer: data.answer, sources: data.sources || [] };
    
    // Cache successful responses for 5 minutes
    responseCache.set(cacheKey, responseData, 300000);
    
    const duration = Date.now() - startTime;
    PerformanceMonitor.recordMetric('chat_request_duration', duration);
    chatLogger.logResponse('POST', '/api/chat', 200, duration);
    chatLogger.info('Response cached', { cacheKey, duration: `${duration}ms` });
    
    return new Response(JSON.stringify(responseData), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    });
  } catch (error) {
    return handleApiError(error, 'chat');
  }
}
