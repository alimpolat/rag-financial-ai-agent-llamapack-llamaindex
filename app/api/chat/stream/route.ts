import { NextRequest } from "next/server";
import { z } from "zod";
import { rateLimit, ipFromHeaders } from "@/lib/ratelimit";

export const runtime = "nodejs";

const bodySchema = z.object({
  question: z.string().min(3).max(2000),
  topK: z.number().int().min(1).max(50).optional(),
  enableLLMRerank: z.boolean().optional(),
  enableRerank: z.boolean().optional(),
  sentenceWindowSize: z.number().int().min(1).max(10).optional(),
});

export async function POST(req: NextRequest) {
  const ip = ipFromHeaders(req.headers);
  const rl = rateLimit({ key: `chat_stream:${ip}`, limit: 60, windowMs: 60_000 });
  if (!rl.allowed) {
    return new Response("event: error\n" + `data: ${JSON.stringify({ error: "Rate limit exceeded" })}\n\n`, {
      status: 429,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  const pyUrl = process.env.PY_BACKEND_URL || "http://localhost:8000";
  const json = await req.json();
  const { question, topK, enableLLMRerank, enableRerank, sentenceWindowSize } = bodySchema.parse(json);

  const controller = new AbortController();
  req.signal.addEventListener("abort", () => controller.abort());

  const upstream = await fetch(`${pyUrl}/chat_stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      top_k: topK,
      enable_llm_rerank: enableLLMRerank,
      enable_rerank: enableRerank,
      sentence_window_size: sentenceWindowSize,
    }),
    signal: controller.signal,
  });

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text();
    return new Response("event: error\n" + `data: ${JSON.stringify({ error: errText || "Upstream failed" })}\n\n`, {
      status: 500,
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  const headers = new Headers();
  headers.set("Content-Type", "text/event-stream");
  headers.set("Cache-Control", "no-cache");
  headers.set("Connection", "keep-alive");

  return new Response(upstream.body, { headers });
}
